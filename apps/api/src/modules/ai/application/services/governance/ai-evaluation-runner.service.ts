import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { CoachChatReplyGenerator } from '../chat/coach-chat-reply-generator.service';
import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';
import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { AiLlmReliabilityService } from '../llm/ai-llm-reliability.service';
import { AiLlmProviderReply } from '../llm/ai-llm.types';
import { AiPromptBuilder } from '../llm/ai-prompt-builder.service';
import { AiSafetyService } from '../safety/ai-safety.service';
import {
  AI_COACH_CHAT_PROMPT_ID,
  AiEvaluationGoldenPrompt,
  AiEvaluationObservation,
  AiEvaluationReport,
} from './ai-governance.types';
import { AiEvaluationDatasetService } from './ai-evaluation-dataset.service';
import { AiRolloutService } from './ai-rollout.service';

type EvaluationHealthContext = Awaited<
  ReturnType<BuildUserHealthContextService['build']>
>;

@Injectable()
export class AiEvaluationRunnerService {
  constructor(
    private readonly config: AiLlmConfigService = new AiLlmConfigService(),
    private readonly promptBuilder: AiPromptBuilder = new AiPromptBuilder(),
    private readonly safetyService: AiSafetyService,
    private readonly reliabilityService: AiLlmReliabilityService,
    private readonly coachChatReplyGenerator: CoachChatReplyGenerator,
    private readonly rolloutService: AiRolloutService = new AiRolloutService(),
    private readonly datasetService: AiEvaluationDatasetService = new AiEvaluationDatasetService(),
  ) {}

  async runCoachChatEvaluation(input?: {
    userIdHash?: string;
    authUserId?: string;
    healthContext?: EvaluationHealthContext;
    conversationHistory?: Array<{
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }>;
    prompts?: AiEvaluationGoldenPrompt[];
  }): Promise<AiEvaluationReport> {
    const prompts =
      input?.prompts ?? this.datasetService.listCoachChatGoldenPrompts();
    const healthContext =
      input?.healthContext ?? this.buildDefaultHealthContext(input?.authUserId);
    const userIdHash =
      input?.userIdHash ??
      this.hashValue(input?.authUserId ?? 'evaluation-user');
    const runId = randomUUID();
    const observations: AiEvaluationObservation[] = [];

    for (const goldenPrompt of prompts) {
      const experiment = this.rolloutService.resolveCoachChatAssignment({
        userIdHash,
        promptId: goldenPrompt.promptId,
      });

      const prompt = this.promptBuilder.build({
        message: goldenPrompt.message,
        healthContext,
        conversationHistory: input?.conversationHistory ?? [],
        trace: {
          requestId: randomUUID(),
          conversationId: `evaluation-${goldenPrompt.id}`,
          userIdHash,
          experimentId: experiment.experimentId,
          canaryBucket: experiment.canaryBucket,
          rolloutVariant: experiment.rolloutVariant,
        },
        experiment,
      });

      const prepared = this.safetyService.preparePrompt(prompt);
      const startedAt = Date.now();
      let reply: AiLlmProviderReply | null = null;
      let fallbackUsed = false;
      let outputValid = true;

      if (!prepared.blocked) {
        try {
          reply = await this.reliabilityService.generateReply(prepared.prompt);
        } catch {
          reply = null;
        }
      }

      const latencyMs = Date.now() - startedAt;
      const safetyBlocked = prepared.blocked;
      const fallbackReply = this.coachChatReplyGenerator.generate({
        message: goldenPrompt.message,
        healthContext,
      });

      if (!reply) {
        fallbackUsed = true;
        reply = {
          content: fallbackReply,
        };
      }

      const validation = this.safetyService.validateOutput(
        reply.content,
        prepared.metadata,
      );

      if (!validation.allowed) {
        outputValid = false;
        fallbackUsed = true;
        reply = {
          content: fallbackReply,
        };
      }

      observations.push({
        id: goldenPrompt.id,
        promptId: goldenPrompt.promptId,
        promptVersion: prepared.prompt.promptVersion,
        provider: prepared.metadata.provider,
        model: prepared.metadata.model,
        expectedClassification: goldenPrompt.expectedClassification,
        expectedFallback: goldenPrompt.expectedFallback,
        safetyBlocked,
        fallbackUsed,
        outputValid,
        matchesExpectation:
          (safetyBlocked ? 'BLOCKED' : validation.classification) ===
            goldenPrompt.expectedClassification &&
          fallbackUsed === goldenPrompt.expectedFallback,
        latencyMs,
        tokenUsage: reply?.usage,
        estimatedCost: this.estimateCost(reply?.usage),
      });
    }

    const requests = observations.length;
    const failures = observations.filter(
      (observation) => !observation.outputValid,
    ).length;
    const fallbacks = observations.filter(
      (observation) => observation.fallbackUsed,
    ).length;
    const safetyBlocks = observations.filter(
      (observation) => observation.safetyBlocked,
    ).length;
    const totalLatency = observations.reduce(
      (sum, observation) => sum + observation.latencyMs,
      0,
    );
    const tokenUsage = observations.reduce(
      (accumulator, observation) =>
        this.accumulateTokenUsage(accumulator, observation.tokenUsage),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, unknown: false },
    );
    const costAccumulator = observations.reduce(
      (sum, observation) => {
        if (typeof observation.estimatedCost !== 'number') {
          sum.unknown = true;
          return sum;
        }

        sum.value += observation.estimatedCost;
        return sum;
      },
      { value: 0, unknown: false },
    );

    return {
      runId,
      evaluatedAt: new Date().toISOString(),
      experimentId: this.config.getExperimentId(),
      promptId: AI_COACH_CHAT_PROMPT_ID,
      promptVersion: this.config.getPromptVersion(),
      provider: this.config.getProvider(),
      model: this.config.getModel(),
      requests,
      failures,
      fallbacks,
      safetyBlocks,
      averageLatencyMs: requests ? Math.round(totalLatency / requests) : 0,
      averageTokens: tokenUsage.unknown
        ? 'unknown'
        : requests
          ? Math.round(tokenUsage.totalTokens / requests)
          : 0,
      averageCost: costAccumulator.unknown
        ? 'unknown'
        : Number((costAccumulator.value / Math.max(requests, 1)).toFixed(4)),
      successRate: requests
        ? Number((((requests - failures) / requests) * 100).toFixed(2))
        : 0,
      observations,
    };
  }

  private buildDefaultHealthContext(
    authUserId?: string,
  ): EvaluationHealthContext {
    const now = new Date();

    return {
      authUserId: authUserId ?? 'evaluation-user',
      userProfileId: 'evaluation-profile',
      goal: 'gain_muscle',
      activityLevel: 'medium',
      weeklyFrequency: 4,
      adherenceScore: 72,
      currentStreak: 5,
      averageWorkoutDuration: 45,
      fatigueLevel: 'LOW',
      availableEquipment: ['dumbbells'],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: now,
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 2,
        motivationLevel: 4,
        createdAt: now,
      },
      nutritionProfile: {
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: ['protein'],
      },
    };
  }

  private estimateCost(
    usage?: AiLlmProviderReply['usage'],
  ): number | 'unknown' {
    if (
      !usage ||
      typeof usage.promptTokens !== 'number' ||
      typeof usage.completionTokens !== 'number'
    ) {
      return 'unknown';
    }

    const inputCostPer1k = this.config.getInputCostPer1k();
    const outputCostPer1k = this.config.getOutputCostPer1k();

    if (inputCostPer1k === undefined || outputCostPer1k === undefined) {
      return 'unknown';
    }

    return Number(
      (
        (usage.promptTokens / 1000) * inputCostPer1k +
        (usage.completionTokens / 1000) * outputCostPer1k
      ).toFixed(4),
    );
  }

  private accumulateTokenUsage(
    accumulator: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      unknown: boolean;
    },
    tokenUsage?: AiLlmProviderReply['usage'],
  ): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    unknown: boolean;
  } {
    if (!tokenUsage) {
      return accumulator;
    }

    if (
      typeof tokenUsage.promptTokens !== 'number' ||
      typeof tokenUsage.completionTokens !== 'number' ||
      typeof tokenUsage.totalTokens !== 'number'
    ) {
      accumulator.unknown = true;
      return accumulator;
    }

    accumulator.promptTokens += tokenUsage.promptTokens;
    accumulator.completionTokens += tokenUsage.completionTokens;
    accumulator.totalTokens += tokenUsage.totalTokens;

    return accumulator;
  }

  private hashValue(value: string): string {
    return value.trim().toLowerCase();
  }
}
