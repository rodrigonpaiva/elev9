import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

import type { CoachExpertName } from '@elev9/types';
import { AI_COACH_CHAT_PROMPT_ID } from '../governance/ai-governance.types';
import { AiRolloutService } from '../governance/ai-rollout.service';
import { CoachExpertRegistry } from '../experts/coach-expert.registry';
import { CoachExpertRouterService } from '../experts/coach-expert-router';
import { CoachExpertCompositionService } from '../experts/composition/coach-expert-composition';
import { CoachExpertObservabilityService } from '../experts/observability/coach-expert-observability';
import { CoachExplainabilityService } from '../explainability/coach-explainability';
import { CoachPersonaEngineService } from '../persona/coach-persona-engine';
import { CoachIntelligenceConfigService } from './coach-intelligence.config';
import { CoachIntelligenceContextAssemblerService } from './coach-intelligence.context-assembler.service';
import { CoachIntelligenceObservabilityService } from './coach-intelligence.observability.service';
import type {
  CoachIntelligenceBuildInput,
  CoachIntelligenceBuildResult,
  CoachIntelligencePipelineResult,
  CoachIntelligencePipelineSelection,
  CoachIntelligenceSourceContext,
  CoachIntelligenceSourceLoadResult,
} from './coach-intelligence.types';
import { CoachIntelligenceMapperService } from './coach-intelligence.mapper.service';
import type {
  AgentContextDomain,
  AgentIntent,
  AgentPlan,
  AgentSafetyMetadata,
} from '../agent/agent.types';
import type { UserHealthContext } from '../context-builder/build-user-health-context.service';
import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertMetadata,
  CoachExpertRequest,
  CoachExpertResult,
} from '../experts/coach-expert.types';
import type {
  CoachExpertRoutingDecision,
} from '../experts/router/coach-expert-router.types';
import type { AgentPolicyEvaluation } from '../agent/policies/agent-policy.types';
import type { PersonalizationPromptPayload } from '../../../../../shared/mappers';
import { PersonalizationReadModelMapper } from '../../../../../shared/mappers';
import { GetCoachIntelligenceError, COACH_INTELLIGENCE_ERROR_CODES } from './coach-intelligence.errors';

const COACH_INTELLIGENCE_SOURCE_VERSION = '1.0.0';
const EXPERT_NAME_BY_ID: Readonly<Record<string, CoachExpertName>> = Object.freeze({
  WorkoutExpert: 'Workout',
  NutritionExpert: 'Nutrition',
  RecoveryExpert: 'Recovery',
  GoalExpert: 'Goal',
  HabitExpert: 'Habit',
  ProgressExpert: 'Progress',
  MotivationExpert: 'Motivation',
});
const PUBLIC_EXPERT_NAMES = new Set<CoachExpertName>([
  'Workout',
  'Nutrition',
  'Recovery',
  'Goal',
  'Habit',
  'Progress',
  'Motivation',
]);

@Injectable()
export class CoachIntelligenceAggregationService {
  constructor(
    private readonly configService: CoachIntelligenceConfigService,
    private readonly contextAssemblerService: CoachIntelligenceContextAssemblerService,
    private readonly coachExpertRegistry: CoachExpertRegistry,
    private readonly coachExpertRouterService: CoachExpertRouterService,
    private readonly coachExpertCompositionService: CoachExpertCompositionService,
    private readonly coachPersonaEngineService: CoachPersonaEngineService,
    private readonly coachExplainabilityService: CoachExplainabilityService,
    private readonly coachIntelligenceMapperService: CoachIntelligenceMapperService,
    private readonly coachIntelligenceObservabilityService: CoachIntelligenceObservabilityService,
    private readonly coachExpertObservabilityService: CoachExpertObservabilityService,
    private readonly aiRolloutService: AiRolloutService,
  ) {}

  async build(input: CoachIntelligenceBuildInput): Promise<CoachIntelligenceBuildResult> {
    if (!this.configService.isEnabled()) {
      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.FEATURE_DISABLED,
        'Coach intelligence aggregate is disabled.',
      );
    }

    const requestId = this.normalizeRequestId(input.requestId);
    const assemblyStartedAt = Date.now();
    const resolvedUserProfile = await this.contextAssemblerService.resolveUserProfile({
      authUserId: input.authUserId,
      ...(input.userProfileId ? { userProfileId: input.userProfileId } : {}),
    });

    const aggregateTrace = this.coachIntelligenceObservabilityService.startTrace({
      requestId,
      authUserId: input.authUserId,
      userProfileId: resolvedUserProfile.id,
      metadata: Object.freeze({
        featureEnabled: true,
        requestId,
      }),
    });

    let sourceContext: CoachIntelligenceSourceContext | undefined;
    let aggregate: ReturnType<CoachIntelligenceMapperService['map']> | undefined;

    try {
      const assembledContext = await this.contextAssemblerService.assemble({
        authUserId: input.authUserId,
        requestId,
        conversationId: input.conversationId,
        userProfileId: resolvedUserProfile.id,
        userProfile: resolvedUserProfile,
      });
      sourceContext = assembledContext.source;

      const intent = this.resolveIntent({
        source: sourceContext,
      });
      const selectedDomains = Object.freeze([
        ...assembledContext.selectedDomains,
      ]) as readonly AgentContextDomain[];
      const candidateExperts = this.resolveCandidateExperts({
        intent,
        selectedDomains,
      });
      const policyEvaluation = this.buildPolicyEvaluation({
        intent,
        selectedDomains,
        candidateExperts,
      });
      const routingStart = Date.now();
      const routingDecision = this.coachExpertRouterService.route({
        requestId,
        intent,
        selectedDomains,
        candidateExperts,
        policyEvaluation,
        maxExperts: Math.max(candidateExperts.length, 1),
      });
      const routingDurationMs = Date.now() - routingStart;
      const expertRequest = this.buildExpertRequest({
        authUserId: input.authUserId,
        requestId,
        conversationId: input.conversationId ?? requestId,
        userProfileId: resolvedUserProfile.id,
        intent,
        selectedDomains,
        candidateExperts,
        selectedExperts: routingDecision.orderedExperts,
      });
      const expertContext = this.buildExpertContext({
        source: sourceContext,
        request: expertRequest,
        policyEvaluation,
        routingDecision,
      });
      const expertStart = Date.now();

      this.coachExpertObservabilityService.startTrace({
        requestId,
        conversationId: input.conversationId,
        intent,
        selectedDomains,
        candidateExperts,
        routingDecision,
        policyEvaluation,
        runtimeMetadata: Object.freeze({
          routingDurationMs,
          planningDurationMs: 0,
          orchestrationDurationMs: assembledContext.source.loadDurationMs,
          executionDurationMs: 0,
          compositionDurationMs: 0,
          personaDurationMs: 0,
          explainabilityDurationMs: 0,
          promptAssemblyDurationMs: 0,
          totalDurationMs: 0,
        }),
      });

      const expertExecution = await this.executeExperts({
        request: expertRequest,
        context: expertContext,
        routingDecision,
      });
      const expertExecutionDurationMs = Date.now() - expertStart;
      const compositionStart = Date.now();
      const composition = this.coachExpertCompositionService.compose({
        requestId,
        intent,
        selectedDomains,
        routingDecision,
        policyEvaluation,
        expertResults: expertExecution.results,
        expertContributions: expertExecution.contributions,
        runtimeMetadata: {
          plan: {} as AgentPlan,
          selectedDomains,
          expertResults: expertExecution.results,
          expertContributions: expertExecution.contributions,
          expertExecutionDurationMs,
        },
        executionMetadata: {
          planningDurationMs: 0,
          orchestrationDurationMs: assembledContext.source.loadDurationMs,
          expertExecutionDurationMs,
          executionDurationMs: Date.now() - assemblyStartedAt,
        },
      });
      const compositionDurationMs = Date.now() - compositionStart;
      const personaStart = Date.now();
      const personalization = this.buildPersonalizationPayload(sourceContext);
      const personaGuidance = this.coachPersonaEngineService.build({
        requestId,
        intent,
        selectedDomains,
        unifiedCoachIntelligence: composition,
        routingDecision,
        runtimeMetadata: {
          planningDurationMs: 0,
          orchestrationDurationMs: assembledContext.source.loadDurationMs,
          expertExecutionDurationMs,
          executionDurationMs:
            Date.now() - assemblyStartedAt + compositionDurationMs,
          stepCount: routingDecision.orderedExperts.length,
          responseMode: 'standard',
        },
        healthContext: sourceContext.healthContext,
        userProfile: {
          userProfileId: resolvedUserProfile.id,
          ...(resolvedUserProfile.name ? { userName: resolvedUserProfile.name } : {}),
        },
        fitnessProfile: {
          goal: sourceContext.healthContext.goal,
          activityLevel: sourceContext.healthContext.activityLevel,
          weeklyFrequency: sourceContext.healthContext.weeklyFrequency,
          adherenceScore: sourceContext.healthContext.adherenceScore,
          currentStreak: sourceContext.healthContext.currentStreak,
          fatigueLevel: sourceContext.healthContext.fatigueLevel,
          limitations: sourceContext.healthContext.limitations,
        },
        ...(personalization ? { personalization } : {}),
        safetyDecisions: {
          policyEvaluation,
          safetyMetadata: this.buildSafetyMetadata(),
        },
      });
      const personaDurationMs = Date.now() - personaStart;
      const explainabilityStart = Date.now();
      const explanation = this.coachExplainabilityService.build({
        requestId,
        intent,
        selectedDomains,
        unifiedCoachIntelligence: composition,
        coachPersonaGuidance: personaGuidance,
        routingDecision,
        runtimeMetadata: {
          planningDurationMs: 0,
          orchestrationDurationMs: assembledContext.source.loadDurationMs,
          expertExecutionDurationMs,
          executionDurationMs:
            Date.now() - assemblyStartedAt + compositionDurationMs + personaDurationMs,
          stepCount: routingDecision.orderedExperts.length,
          responseMode: 'standard',
        },
        healthContext: sourceContext.healthContext,
        ...(personalization ? { personalization } : {}),
        safetyDecisions: {
          policyEvaluation,
          safetyMetadata: this.buildSafetyMetadata(),
        },
      });
      const explainabilityDurationMs = Date.now() - explainabilityStart;
      const pipelineResult = this.buildPipelineResult({
        requestId,
        intent,
        selectedDomains,
        routingDecision,
        policyEvaluation,
        composition,
        personaGuidance,
        explanation,
        expertResults: expertExecution.results,
        expertContributions: expertExecution.contributions,
        executionDurationMs: Date.now() - assemblyStartedAt,
        compositionDurationMs,
        personaDurationMs,
        explainabilityDurationMs,
        expertExecutionDurationMs,
        routingDurationMs,
      });

      const mappingInput = {
        source: assembledContext.source,
        pipeline: pipelineResult,
        aggregateId: requestId,
        requestId,
        sourceVersion: COACH_INTELLIGENCE_SOURCE_VERSION,
        rolloutState: 'aggregate',
      } as unknown as CoachIntelligenceBuildResult & {
        aggregateId: string;
        requestId: string;
        sourceVersion?: string;
        rolloutState?: 'aggregate';
      };

      aggregate = this.coachIntelligenceMapperService.map(mappingInput);

      const finalBuildResult: CoachIntelligenceBuildResult = Object.freeze({
        aggregate,
        source: assembledContext.source,
        pipeline: pipelineResult,
        header: aggregate.header,
        ownership: aggregate.ownership,
        insight: aggregate.insight,
        warnings: aggregate.warnings,
        availability: aggregate.availability,
        freshness: aggregate.freshness,
        metadata: aggregate.metadata,
      });

      this.coachExpertObservabilityService.completeTrace({
        requestId,
        expertResults: expertExecution.results.map((result) => ({
          expertId: result.expertId,
          summary: result.summary,
          contributions: result.contributions.map((contribution) => ({
            expertId: contribution.expertId,
            type: contribution.type,
            summary: contribution.summary,
            metadata: contribution.metadata,
          })),
          metadata: result.metadata,
        })),
        expertContributions: expertExecution.contributions.map((contribution) => ({
          expertId: contribution.expertId,
          type: contribution.type,
          summary: contribution.summary,
          metadata: contribution.metadata,
        })),
        composition,
        personaGuidance,
        explanation,
        runtimeMetadata: {
          routingDurationMs,
          executionDurationMs: expertExecutionDurationMs,
          compositionDurationMs,
          personaDurationMs,
          explainabilityDurationMs,
          promptAssemblyDurationMs: 0,
          totalDurationMs: Date.now() - assemblyStartedAt,
        },
      });

      this.coachIntelligenceObservabilityService.completeTrace({
        requestId,
        trace: aggregateTrace,
        availability: aggregate.availability,
        freshness: aggregate.freshness,
        warnings: aggregate.warnings,
        participatingExperts: aggregate.ownership.participatingExperts,
        sections: this.buildTraceSectionSnapshot(aggregate),
        metadata: {
          aggregateId: aggregate.header.aggregateId,
          sourceVersion: aggregate.header.sourceVersion,
          rolloutState: aggregate.header.rolloutState,
          partialResult: aggregate.metadata.partialResult,
        },
      });

      return finalBuildResult;
    } catch (error) {
      this.coachIntelligenceObservabilityService.failTrace({
        requestId,
        trace: aggregateTrace,
        errorCode:
          error instanceof GetCoachIntelligenceError
            ? error.code
            : COACH_INTELLIGENCE_ERROR_CODES.INTERNAL_ERROR,
        errorMessage:
          error instanceof Error ? error.message : 'An unexpected error occurred.',
      });

      if (error instanceof GetCoachIntelligenceError) {
        throw error;
      }

      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private async executeExperts(input: {
    request: CoachExpertRequest;
    context: CoachExpertContext;
    routingDecision: CoachExpertRoutingDecision;
  }): Promise<{
    results: CoachExpertResult[];
    contributions: CoachExpertContribution[];
  }> {
    const results: CoachExpertResult[] = [];
    const contributions: CoachExpertContribution[] = [];
    let currentContext = input.context;

    for (const selection of input.routingDecision.orderedExperts) {
      const expert = this.coachExpertRegistry.getExpert(selection.id);

      if (!expert) {
        continue;
      }

      try {
        const loadedContext = expert.loadContext(input.request, currentContext);
        const result = expert.analyze(input.request, loadedContext);
        const expertContributions = expert.contribute(
          input.request,
          loadedContext,
          result,
        );

        currentContext = loadedContext;
        results.push(result);
        contributions.push(...expertContributions);
      } catch (error) {
        results.push({
          expertId: expert.metadata.id,
          summary: `${expert.metadata.displayName} analysis unavailable.`,
          contributions: [],
          metadata: Object.freeze({
            expertId: expert.metadata.id,
            runtimeMode: 'analysis-error-fallback',
            errorMessage: error instanceof Error ? error.message : String(error),
          }),
        });
      }
    }

    return {
      results,
      contributions,
    };
  }

  private buildPipelineResult(input: {
    requestId: string;
    intent: AgentIntent;
    selectedDomains: readonly AgentContextDomain[];
    routingDecision: CoachExpertRoutingDecision;
    policyEvaluation: AgentPolicyEvaluation;
    composition: ReturnType<CoachExpertCompositionService['compose']>;
    personaGuidance: ReturnType<CoachPersonaEngineService['build']>;
    explanation: ReturnType<CoachExplainabilityService['build']>;
    expertResults: readonly CoachExpertResult[];
    expertContributions: readonly CoachExpertContribution[];
    executionDurationMs: number;
    compositionDurationMs: number;
    personaDurationMs: number;
    explainabilityDurationMs: number;
    expertExecutionDurationMs: number;
    routingDurationMs: number;
  }): CoachIntelligencePipelineResult {
    const selection: CoachIntelligencePipelineSelection = {
      intent: input.intent,
      primaryExpert: input.routingDecision.primaryExpert
        ? this.mapExpertIdToName(input.routingDecision.primaryExpert.id)
        : undefined,
      candidateExperts: this.resolveCandidateExperts({
        intent: input.intent,
        selectedDomains: input.selectedDomains,
      }).map((expert) => this.mapExpertIdToName(expert.id) ?? 'Progress'),
      participatingExperts: input.routingDecision.orderedExperts
        .map((expert) => this.mapExpertIdToName(expert.id))
        .filter((value): value is CoachExpertName => Boolean(value)),
    };

    return Object.freeze({
      selection,
      routingDecision: Object.freeze({
        primaryExpert: input.routingDecision.primaryExpert
          ? this.mapExpertIdToName(input.routingDecision.primaryExpert.id)
          : undefined,
        participatingExperts: Object.freeze(
          input.routingDecision.orderedExperts
            .map((expert) => this.mapExpertIdToName(expert.id))
            .filter((value): value is CoachExpertName => Boolean(value)),
        ),
        routeValid: Boolean(input.routingDecision.metadata.routeValid),
        confidence: input.routingDecision.confidence,
      }),
      policyEvaluation: input.policyEvaluation,
      composition: input.composition,
      personaGuidance: input.personaGuidance,
      explanation: input.explanation,
      expertResults: Object.freeze([...input.expertResults]),
      expertContributions: Object.freeze([...input.expertContributions]),
      executionDurationMs: input.executionDurationMs,
      compositionDurationMs: input.compositionDurationMs,
      personaDurationMs: input.personaDurationMs,
      explainabilityDurationMs: input.explainabilityDurationMs,
    });
  }

  private buildPolicyEvaluation(input: {
    intent: AgentIntent;
    selectedDomains: readonly AgentContextDomain[];
    candidateExperts: readonly CoachExpertMetadata[];
  }): AgentPolicyEvaluation {
    const blockedExpertIds = input.candidateExperts
      .filter((expert) => !expert.enabled)
      .map((expert) => expert.id);
    const allowedExperts = input.candidateExperts.filter((expert) => expert.enabled);

    return Object.freeze({
      decision: Object.freeze({
        approved: true,
        blocked: false,
        fallbackRequired: false,
        allowedTools: Object.freeze([]),
        allowedExperts: Object.freeze([...allowedExperts]),
        allowedDomains: Object.freeze([...input.selectedDomains]),
        allowedLLM: false,
        metadata: Object.freeze({
          stage: 'CONTEXT',
          evaluatedPolicyIds: Object.freeze([]),
          rejectedPolicyIds: Object.freeze([]),
          violationCount: 0,
          fallbackDecisionCount: 0,
          blockedDomainIds: Object.freeze([]),
          blockedToolIds: Object.freeze([]),
          blockedExpertIds: Object.freeze(blockedExpertIds),
          blockedLlmUsage: false,
          allowedDomainCount: input.selectedDomains.length,
          allowedToolCount: 0,
          allowedExpertCount: allowedExperts.length,
          candidateExpertCount: input.candidateExperts.length,
          selectedExpertCount: allowedExperts.length,
          estimatedCost: 0,
          estimatedLatencyMs: 0,
          maximumExecutionDepth: 0,
          maxSteps: 0,
          maxToolCalls: 0,
          evaluationDurationMs: 0,
        }),
      }),
      violations: Object.freeze([]),
      reason: 'coach intelligence aggregate policy approval',
      actions: Object.freeze([]),
    });
  }

  private buildExpertRequest(input: {
    authUserId: string;
    requestId: string;
    conversationId: string;
    userProfileId: string;
    intent: AgentIntent;
    selectedDomains: readonly AgentContextDomain[];
    candidateExperts: readonly CoachExpertMetadata[];
    selectedExperts: readonly CoachExpertMetadata[];
  }): CoachExpertRequest {
    const rollout = this.aiRolloutService.resolveCoachChatAssignment({
      authUserId: input.authUserId,
      userIdHash: this.hashValue(input.userProfileId),
      promptId: AI_COACH_CHAT_PROMPT_ID,
    });

    return {
      userId: input.authUserId,
      conversationId: input.conversationId,
      userMessage: 'coach intelligence aggregate',
      intent: input.intent,
      selectedDomains: Object.freeze([...input.selectedDomains]),
      candidateExperts: Object.freeze([...input.candidateExperts]),
      selectedExperts: Object.freeze([...input.selectedExperts]),
      sessionMetadata: {
        requestId: input.requestId,
        authUserId: input.authUserId,
        userProfileId: input.userProfileId,
        conversationId: input.conversationId,
        userIdHash: this.hashValue(input.userProfileId),
      },
      promptVersion: COACH_INTELLIGENCE_SOURCE_VERSION,
      streamingPreference: false,
      experimentMetadata: rollout,
    };
  }

  private buildExpertContext(input: {
    source: CoachIntelligenceSourceContext;
    request: CoachExpertRequest;
    policyEvaluation: AgentPolicyEvaluation;
    routingDecision: CoachExpertRoutingDecision;
  }): CoachExpertContext {
    return Object.freeze({
      ...input.source.expertContext,
      request: input.request,
      policyEvaluation: input.policyEvaluation,
      selectionReason: this.buildSelectionReason(input.routingDecision),
      runtimeMetadata: Object.freeze({
        requestId: input.request.sessionMetadata.requestId,
        generatedAt: input.source.generatedAt,
        selectedDomains: input.source.selectedDomains,
        sourceLoadDurationMs: input.source.source.loadDurationMs,
      }),
    });
  }

  private buildSelectionReason(routingDecision: CoachExpertRoutingDecision): string {
    const selected = routingDecision.orderedExperts.map((expert) => expert.id);
    const primary = routingDecision.primaryExpert?.id ?? 'none';

    return `primary=${primary}; selected=${selected.join(',') || 'none'}`;
  }

  private buildPersonalizationPayload(
    source: CoachIntelligenceSourceContext,
  ): PersonalizationPromptPayload | undefined {
    return PersonalizationReadModelMapper.toPromptPayload({
      snapshot: source.sections.personalization.data?.personalizationSnapshot ?? undefined,
      profile: source.sections.personalization.data?.userBehaviorProfile ?? undefined,
      patterns: source.sections.personalization.data?.behavioralPatterns ?? undefined,
    });
  }

  private buildSafetyMetadata(): AgentSafetyMetadata {
    return {
      deterministicFirst: true,
      toolCallingEnabled: false,
      fallbackAllowed: true,
      promptVersion: COACH_INTELLIGENCE_SOURCE_VERSION,
    };
  }

  private resolveIntent(input: {
    source: CoachIntelligenceSourceContext;
  }): AgentIntent {
    const coachDecision = input.source.coachDecision?.priority;

    switch (coachDecision) {
      case 'recovery':
        return 'RECOVERY';
      case 'nutrition':
        return 'NUTRITION';
      case 'training':
        return 'TRAINING';
      case 'consistency':
        return 'HABITS';
      case 'motivation':
        return 'MOTIVATION';
      default:
        return this.resolveFallbackIntent(input.source.healthContext);
    }
  }

  private resolveFallbackIntent(healthContext: UserHealthContext): AgentIntent {
    if (
      healthContext.recoverySnapshot &&
      (healthContext.recoverySnapshot.readinessScore < 40 ||
        healthContext.recoverySnapshot.fatigueScore > 75)
    ) {
      return 'RECOVERY';
    }

    if (healthContext.nutritionProfile) {
      return 'NUTRITION';
    }

    if (healthContext.todayWorkout) {
      return 'TRAINING';
    }

    if (healthContext.currentStreak > 0) {
      return 'HABITS';
    }

    if (healthContext.goal) {
      return 'GOALS';
    }

    return 'PROGRESS';
  }

  private resolveCandidateExperts(input: {
    intent: AgentIntent;
    selectedDomains: readonly AgentContextDomain[];
  }): readonly CoachExpertMetadata[] {
    const byId = new Map<string, CoachExpertMetadata>();

    for (const expert of this.coachExpertRegistry.getExpertsForIntent(input.intent)) {
      byId.set(expert.metadata.id, expert.metadata);
    }

    for (const expert of this.coachExpertRegistry.getExpertsForDomains(input.selectedDomains)) {
      if (!byId.has(expert.metadata.id)) {
        byId.set(expert.metadata.id, expert.metadata);
      }
    }

    if (byId.size === 0) {
      for (const expert of this.coachExpertRegistry.getEnabledExperts()) {
        byId.set(expert.metadata.id, expert.metadata);
      }
    }

    return Object.freeze(
      [...byId.values()].sort((left, right) => {
        if (left.priority !== right.priority) {
          return right.priority - left.priority;
        }

        return left.id.localeCompare(right.id);
      }),
    );
  }

  private buildTraceSectionSnapshot(
    aggregate: ReturnType<CoachIntelligenceMapperService['map']>,
  ): Record<string, { status: string; fallbackUsed: boolean }> {
    return Object.fromEntries(
      Object.entries(aggregate.availability.sections).map(([section, state]) => [
        section,
        {
          status: state.status,
          fallbackUsed: state.fallbackUsed,
        },
      ]),
    );
  }

  private normalizeRequestId(requestId?: string): string {
    const normalized = requestId?.trim();

    return normalized && normalized.length > 0 ? normalized : randomUUID();
  }

  private mapExpertIdToName(
    expertId?: string | null,
  ): CoachExpertName | undefined {
    if (!expertId) {
      return undefined;
    }

    if (PUBLIC_EXPERT_NAMES.has(expertId as CoachExpertName)) {
      return expertId as CoachExpertName;
    }

    return EXPERT_NAME_BY_ID[expertId];
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
