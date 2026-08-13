import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { AiLlmGenerateReplyResult, AiLlmPrompt } from './ai-llm.types';
import { AiLlmConfigService } from './ai-llm-config.service';
import { AiLlmReliabilityService } from './ai-llm-reliability.service';
import { AiLlmError } from './ai-llm.errors';
import { resolveOpenAiCapabilities } from './openai-provider-capabilities';
import { AiSafetyService } from '../safety/ai-safety.service';
import { AiLlmObservabilityService } from '../observability/ai-llm-observability.service';

@Injectable()
export class AiLlmService {
  private readonly logger = new Logger(AiLlmService.name);

  constructor(
    private readonly reliabilityService: AiLlmReliabilityService,
    private readonly safetyService: AiSafetyService,
    private readonly observabilityService: AiLlmObservabilityService,
    private readonly config: AiLlmConfigService,
  ) {}

  async generateReply(
    prompt: AiLlmPrompt,
  ): Promise<AiLlmGenerateReplyResult | null> {
    return this.executeReply({
      prompt,
      streaming: false,
    });
  }

  async streamReply(
    prompt: AiLlmPrompt,
    onDelta?: (delta: string) => void,
  ): Promise<AiLlmGenerateReplyResult | null> {
    if (!this.canStream(prompt)) {
      this.logger.log('llm streaming disabled');
      return null;
    }

    return this.executeReply({
      prompt,
      streaming: true,
      onDelta,
    });
  }

  canStream(prompt?: AiLlmPrompt): boolean {
    if (
      !this.config.isStreamingEnabled() ||
      (prompt?.metadata?.provider ?? this.config.getProvider()) !== 'openai'
    ) {
      return false;
    }

    try {
      return resolveOpenAiCapabilities(
        prompt?.metadata?.model ?? this.config.getModel(),
      ).streaming;
    } catch {
      return false;
    }
  }

  private async executeReply(input: {
    prompt: AiLlmPrompt;
    streaming: boolean;
    onDelta?: (delta: string) => void;
  }): Promise<AiLlmGenerateReplyResult | null> {
    const prompt = input.prompt;

    if (!this.config.isEnabled()) {
      this.logger.log('llm disabled');
      return null;
    }

    const providerName = prompt.metadata?.provider ?? this.config.getProvider();
    const modelName = prompt.metadata?.model ?? this.config.getModel();

    this.logger.log(`llm enabled`);
    this.logger.log(`provider used: ${providerName}`);
    this.logger.log(`model used: ${modelName}`);

    if (providerName !== 'openai') {
      this.logger.warn(`provider "${providerName}" is not supported`);
      return null;
    }

    const requestId = randomUUID();
    const trace = {
      ...(prompt.trace ?? {}),
      requestId,
    };
    const preparedPrompt = {
      ...prompt,
      trace,
    };
    const startTime = new Date().toISOString();
    const safety = this.safetyService.preparePrompt(preparedPrompt);

    this.observabilityService.recordRequest({
      requestId,
      conversationId: safety.prompt.trace?.conversationId,
      userIdHash: safety.prompt.trace?.userIdHash,
      provider: safety.metadata.provider,
      model: safety.metadata.model,
      promptVersion: safety.metadata.promptVersion,
      promptId: safety.metadata.promptId,
      promptReleaseDate: safety.metadata.promptReleaseDate,
      promptStatus: safety.metadata.promptStatus,
      promptAuthor: safety.metadata.promptAuthor,
      promptDescription: safety.metadata.promptDescription,
      safetyVersion: safety.metadata.safetyVersion,
      experimentId: safety.metadata.experimentId,
      canaryBucket: safety.metadata.canaryBucket,
      canaryPercentage: safety.metadata.canaryPercentage,
      streamingEnabled: safety.metadata.streamingEnabled,
      structuredOutputsEnabled: safety.metadata.structuredOutputsEnabled,
      toolCallingEnabled: safety.metadata.toolCallingEnabled,
      futureMemoryEnabled: safety.metadata.futureMemoryEnabled,
      currentPromptVersion: safety.metadata.currentPromptVersion,
      previousPromptVersion: safety.metadata.previousPromptVersion,
      currentProvider: safety.metadata.currentProvider,
      previousProvider: safety.metadata.previousProvider,
      currentModel: safety.metadata.currentModel,
      previousModel: safety.metadata.previousModel,
      retryCount: 0,
      fallbackUsed: false,
      startTime,
    });

    if (safety.blocked) {
      this.logger.warn(
        `prompt blocked: ${safety.assessment.riskLevel} ${
          safety.assessment.triggers.join(',') || 'none'
        }`,
      );
      this.observabilityService.recordSafetyBlock({
        requestId,
        conversationId: safety.prompt.trace?.conversationId,
        userIdHash: safety.prompt.trace?.userIdHash,
        provider: safety.metadata.provider,
        model: safety.metadata.model,
        promptVersion: safety.metadata.promptVersion,
        safetyVersion: safety.metadata.safetyVersion,
        classification: safety.metadata.classification,
        reason: `risk:${safety.assessment.riskLevel}`,
      });
      this.observabilityService.recordFallback({
        requestId,
        conversationId: safety.prompt.trace?.conversationId,
        userIdHash: safety.prompt.trace?.userIdHash,
        provider: safety.metadata.provider,
        model: safety.metadata.model,
        promptVersion: safety.metadata.promptVersion,
        safetyVersion: safety.metadata.safetyVersion,
        retryCount: 0,
        fallbackUsed: true,
        startTime,
        durationMs: 0,
        errorCode: 'LLM_GUARDRAIL',
        reason: `risk:${safety.assessment.riskLevel}`,
      });
      return null;
    }

    try {
      const reply = input.streaming
        ? await this.reliabilityService.streamReply(
            {
              ...safety.prompt,
              signal: prompt.signal,
            },
            input.onDelta,
          )
        : await this.reliabilityService.generateReply({
            ...safety.prompt,
            signal: prompt.signal,
          });

      if (!reply) {
        return null;
      }

      const validation = this.safetyService.validateOutput(
        reply.content,
        safety.metadata,
      );

      if (!validation.allowed) {
        this.logger.warn(
          `output rejected: ${validation.classification} ${validation.reason ?? 'unknown'}`,
        );
        this.observabilityService.recordSafetyBlock({
          requestId,
          conversationId: safety.prompt.trace?.conversationId,
          userIdHash: safety.prompt.trace?.userIdHash,
          provider: safety.metadata.provider,
          model: safety.metadata.model,
          promptVersion: safety.metadata.promptVersion,
          promptId: safety.metadata.promptId,
          promptReleaseDate: safety.metadata.promptReleaseDate,
          promptStatus: safety.metadata.promptStatus,
          promptAuthor: safety.metadata.promptAuthor,
          promptDescription: safety.metadata.promptDescription,
          safetyVersion: safety.metadata.safetyVersion,
          experimentId: safety.metadata.experimentId,
          canaryBucket: safety.metadata.canaryBucket,
          canaryPercentage: safety.metadata.canaryPercentage,
          streamingEnabled: safety.metadata.streamingEnabled,
          structuredOutputsEnabled: safety.metadata.structuredOutputsEnabled,
          toolCallingEnabled: safety.metadata.toolCallingEnabled,
          futureMemoryEnabled: safety.metadata.futureMemoryEnabled,
          currentPromptVersion: safety.metadata.currentPromptVersion,
          previousPromptVersion: safety.metadata.previousPromptVersion,
          currentProvider: safety.metadata.currentProvider,
          previousProvider: safety.metadata.previousProvider,
          currentModel: safety.metadata.currentModel,
          previousModel: safety.metadata.previousModel,
          classification: validation.classification,
          reason: validation.reason ?? 'output_rejected',
        });
        this.observabilityService.recordFallback({
          requestId,
          conversationId: safety.prompt.trace?.conversationId,
          userIdHash: safety.prompt.trace?.userIdHash,
          provider: safety.metadata.provider,
          model: safety.metadata.model,
          promptVersion: safety.metadata.promptVersion,
          promptId: safety.metadata.promptId,
          promptReleaseDate: safety.metadata.promptReleaseDate,
          promptStatus: safety.metadata.promptStatus,
          promptAuthor: safety.metadata.promptAuthor,
          promptDescription: safety.metadata.promptDescription,
          safetyVersion: safety.metadata.safetyVersion,
          experimentId: safety.metadata.experimentId,
          canaryBucket: safety.metadata.canaryBucket,
          canaryPercentage: safety.metadata.canaryPercentage,
          streamingEnabled: safety.metadata.streamingEnabled,
          structuredOutputsEnabled: safety.metadata.structuredOutputsEnabled,
          toolCallingEnabled: safety.metadata.toolCallingEnabled,
          futureMemoryEnabled: safety.metadata.futureMemoryEnabled,
          currentPromptVersion: safety.metadata.currentPromptVersion,
          previousPromptVersion: safety.metadata.previousPromptVersion,
          currentProvider: safety.metadata.currentProvider,
          previousProvider: safety.metadata.previousProvider,
          currentModel: safety.metadata.currentModel,
          previousModel: safety.metadata.previousModel,
          retryCount: 0,
          fallbackUsed: true,
          startTime,
          durationMs: 0,
          errorCode: 'LLM_GUARDRAIL',
          reason: validation.reason ?? 'output_rejected',
        });
        return null;
      }

      return reply;
    } catch (error) {
      if (error instanceof AiLlmError) {
        this.logger.warn(`fallback activated: ${error.code} ${error.message}`);

        if (error.code === 'LLM_CANCELLED') {
          throw error;
        }

        return null;
      }

      this.logger.warn(
        `fallback activated: ${error instanceof Error ? error.message : 'Unknown provider failure'}`,
      );
      return null;
    }
  }
}
