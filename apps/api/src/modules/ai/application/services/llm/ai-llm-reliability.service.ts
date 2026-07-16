import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import {
  AI_LLM_PROVIDER,
  AiLlmGenerateReplyResult,
  AiLlmProvider,
  AiLlmPrompt,
} from './ai-llm.types';
import { AiLlmConfigService } from './ai-llm-config.service';
import {
  AiLlmError,
  LLMCancelledError,
  LLMAuthenticationError,
  LLMConfigurationError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMUnavailableError,
  LLMUnknownError,
} from './ai-llm.errors';
import { AiLlmObservabilityService } from '../observability/ai-llm-observability.service';

type CircuitState = {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  openedAt?: number;
  probeInFlight: boolean;
};

@Injectable()
export class AiLlmReliabilityService {
  private circuitState: CircuitState = {
    status: 'closed',
    failureCount: 0,
    probeInFlight: false,
  };

  constructor(
    @Inject(AI_LLM_PROVIDER)
    private readonly provider: AiLlmProvider,
    private readonly config: AiLlmConfigService,
    private readonly observability: AiLlmObservabilityService,
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
    return this.executeReply({
      prompt,
      streaming: true,
      onDelta,
    });
  }

  private async executeReply(input: {
    prompt: AiLlmPrompt;
    streaming: boolean;
    onDelta?: (delta: string) => void;
  }): Promise<AiLlmGenerateReplyResult | null> {
    const prompt = input.prompt;
    const requestId = prompt.trace?.requestId ?? randomUUID();
    const provider = prompt.metadata?.provider ?? this.config.getProvider();
    const model = prompt.metadata?.model ?? this.config.getModel();
    const timeoutMs = this.config.getTimeoutMs();
    const maxRetries = this.config.getMaxRetries();
    const now = Date.now();

    if (!this.isProviderReady(now)) {
      this.observability.recordCircuitOpen({
        requestId,
        conversationId: prompt.trace?.conversationId,
        userIdHash: prompt.trace?.userIdHash,
        provider,
        model,
        promptVersion: prompt.promptVersion,
        startTime: new Date().toISOString(),
        promptId: prompt.metadata?.promptId,
        promptReleaseDate: prompt.metadata?.promptReleaseDate,
        promptStatus: prompt.metadata?.promptStatus,
        promptAuthor: prompt.metadata?.promptAuthor,
        promptDescription: prompt.metadata?.promptDescription,
        safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
        experimentId: prompt.metadata?.experimentId,
        canaryBucket: prompt.metadata?.canaryBucket,
        canaryPercentage: prompt.metadata?.canaryPercentage,
        streamingEnabled: prompt.metadata?.streamingEnabled,
        structuredOutputsEnabled: prompt.metadata?.structuredOutputsEnabled,
        toolCallingEnabled: prompt.metadata?.toolCallingEnabled,
        futureMemoryEnabled: prompt.metadata?.futureMemoryEnabled,
        currentPromptVersion: prompt.metadata?.currentPromptVersion,
        previousPromptVersion: prompt.metadata?.previousPromptVersion,
        currentProvider: prompt.metadata?.currentProvider,
        previousProvider: prompt.metadata?.previousProvider,
        currentModel: prompt.metadata?.currentModel,
        previousModel: prompt.metadata?.previousModel,
        retryCount: 0,
        fallbackUsed: true,
        reason: 'circuit_open',
      });
      this.observability.recordFallback({
        requestId,
        conversationId: prompt.trace?.conversationId,
        userIdHash: prompt.trace?.userIdHash,
        provider,
        model,
        promptVersion: prompt.promptVersion,
        safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
        retryCount: 0,
        fallbackUsed: true,
        startTime: new Date().toISOString(),
        durationMs: 0,
        errorCode: 'LLM_CIRCUIT_OPEN',
        reason: 'circuit_open',
      });

      return null;
    }

    if (input.streaming) {
      this.observability.recordStreamOpened({
        requestId,
        conversationId: prompt.trace?.conversationId,
        userIdHash: prompt.trace?.userIdHash,
        provider,
        model,
        promptVersion: prompt.promptVersion,
        safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
        retryCount: 0,
        fallbackUsed: false,
        startTime: new Date().toISOString(),
      });
    }

    let attempt = 0;

    while (attempt <= maxRetries) {
      const attemptStartedAt = Date.now();
      const attemptController = this.createAttemptController(
        timeoutMs,
        prompt.signal,
      );
      const emittedDelta = { value: false };

      try {
        const reply = await this.observability.observeAttempt(
          {
            requestId,
            conversationId: prompt.trace?.conversationId,
            userIdHash: prompt.trace?.userIdHash,
            provider,
            model,
            promptVersion: prompt.promptVersion,
            promptId: prompt.metadata?.promptId,
            promptReleaseDate: prompt.metadata?.promptReleaseDate,
            promptStatus: prompt.metadata?.promptStatus,
            promptAuthor: prompt.metadata?.promptAuthor,
            promptDescription: prompt.metadata?.promptDescription,
            safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
            experimentId: prompt.metadata?.experimentId,
            canaryBucket: prompt.metadata?.canaryBucket,
            canaryPercentage: prompt.metadata?.canaryPercentage,
            streamingEnabled: prompt.metadata?.streamingEnabled,
            structuredOutputsEnabled: prompt.metadata?.structuredOutputsEnabled,
            toolCallingEnabled: prompt.metadata?.toolCallingEnabled,
            futureMemoryEnabled: prompt.metadata?.futureMemoryEnabled,
            currentPromptVersion: prompt.metadata?.currentPromptVersion,
            previousPromptVersion: prompt.metadata?.previousPromptVersion,
            currentProvider: prompt.metadata?.currentProvider,
            previousProvider: prompt.metadata?.previousProvider,
            currentModel: prompt.metadata?.currentModel,
            previousModel: prompt.metadata?.previousModel,
            retryCount: attempt,
            fallbackUsed: false,
            startTime: new Date().toISOString(),
            attempt: attempt + 1,
          },
          () =>
            input.streaming
              ? this.provider.streamReply({
                  messages: prompt.messages,
                  model,
                  signal: attemptController.controller.signal,
                  onDelta: (delta) => {
                    if (delta) {
                      emittedDelta.value = true;
                      input.onDelta?.(delta);
                    }
                  },
                })
              : this.provider.generateReply({
                  messages: prompt.messages,
                  model,
                  signal: attemptController.controller.signal,
                }),
        );

        attemptController.cleanup();
        this.onSuccess();

        if (input.streaming) {
          this.observability.recordStreamCompleted({
            requestId,
            conversationId: prompt.trace?.conversationId,
            userIdHash: prompt.trace?.userIdHash,
            provider,
            model,
            promptVersion: prompt.promptVersion,
            promptId: prompt.metadata?.promptId,
            promptReleaseDate: prompt.metadata?.promptReleaseDate,
            promptStatus: prompt.metadata?.promptStatus,
            promptAuthor: prompt.metadata?.promptAuthor,
            promptDescription: prompt.metadata?.promptDescription,
            safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
            experimentId: prompt.metadata?.experimentId,
            canaryBucket: prompt.metadata?.canaryBucket,
            canaryPercentage: prompt.metadata?.canaryPercentage,
            streamingEnabled: prompt.metadata?.streamingEnabled,
            structuredOutputsEnabled: prompt.metadata?.structuredOutputsEnabled,
            toolCallingEnabled: prompt.metadata?.toolCallingEnabled,
            futureMemoryEnabled: prompt.metadata?.futureMemoryEnabled,
            currentPromptVersion: prompt.metadata?.currentPromptVersion,
            previousPromptVersion: prompt.metadata?.previousPromptVersion,
            currentProvider: prompt.metadata?.currentProvider,
            previousProvider: prompt.metadata?.previousProvider,
            currentModel: prompt.metadata?.currentModel,
            previousModel: prompt.metadata?.previousModel,
            retryCount: attempt,
            fallbackUsed: false,
            startTime: new Date().toISOString(),
            durationMs: Date.now() - attemptStartedAt,
            tokenUsage: reply.usage,
            estimatedCost: 'unknown',
          });
        }

        return {
          content: reply.content,
          provider,
          model,
          promptVersion: prompt.promptVersion,
          usage: reply.usage,
        };
      } catch (error) {
        attemptController.cleanup();

        const normalized = this.normalizeError(error, attemptController);

        this.onFailure();

        if (normalized.code === 'LLM_CANCELLED') {
          if (input.streaming) {
            this.observability.recordStreamCancelled({
              requestId,
              conversationId: prompt.trace?.conversationId,
              userIdHash: prompt.trace?.userIdHash,
              provider,
              model,
              promptVersion: prompt.promptVersion,
              safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
              retryCount: attempt,
              fallbackUsed: false,
              startTime: new Date().toISOString(),
              durationMs: Date.now() - attemptStartedAt,
              reason: normalized.message,
            });
          }

          throw normalized;
        }

        if (
          normalized.retryable &&
          attempt < maxRetries &&
          !emittedDelta.value
        ) {
          this.observability.recordRetry({
            requestId,
            conversationId: prompt.trace?.conversationId,
            userIdHash: prompt.trace?.userIdHash,
            provider,
            model,
            promptVersion: prompt.promptVersion,
            safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
            retryCount: attempt + 1,
            fallbackUsed: false,
            startTime: new Date().toISOString(),
            attempt: attempt + 1,
            errorCode: normalized.code,
          });
          await this.sleep(this.backoffMs(attempt));
          attempt += 1;
          continue;
        }

        if (input.streaming) {
          this.observability.recordStreamInterrupted({
            requestId,
            conversationId: prompt.trace?.conversationId,
            userIdHash: prompt.trace?.userIdHash,
            provider,
            model,
            promptVersion: prompt.promptVersion,
            promptId: prompt.metadata?.promptId,
            promptReleaseDate: prompt.metadata?.promptReleaseDate,
            promptStatus: prompt.metadata?.promptStatus,
            promptAuthor: prompt.metadata?.promptAuthor,
            promptDescription: prompt.metadata?.promptDescription,
            safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
            experimentId: prompt.metadata?.experimentId,
            canaryBucket: prompt.metadata?.canaryBucket,
            canaryPercentage: prompt.metadata?.canaryPercentage,
            streamingEnabled: prompt.metadata?.streamingEnabled,
            structuredOutputsEnabled: prompt.metadata?.structuredOutputsEnabled,
            toolCallingEnabled: prompt.metadata?.toolCallingEnabled,
            futureMemoryEnabled: prompt.metadata?.futureMemoryEnabled,
            currentPromptVersion: prompt.metadata?.currentPromptVersion,
            previousPromptVersion: prompt.metadata?.previousPromptVersion,
            currentProvider: prompt.metadata?.currentProvider,
            previousProvider: prompt.metadata?.previousProvider,
            currentModel: prompt.metadata?.currentModel,
            previousModel: prompt.metadata?.previousModel,
            retryCount: attempt,
            fallbackUsed: false,
            startTime: new Date().toISOString(),
            durationMs: Date.now() - attemptStartedAt,
            reason: normalized.message,
          });
        }

        this.observability.recordFallback({
          requestId,
          conversationId: prompt.trace?.conversationId,
          userIdHash: prompt.trace?.userIdHash,
          provider,
          model,
          promptVersion: prompt.promptVersion,
          promptId: prompt.metadata?.promptId,
          promptReleaseDate: prompt.metadata?.promptReleaseDate,
          promptStatus: prompt.metadata?.promptStatus,
          promptAuthor: prompt.metadata?.promptAuthor,
          promptDescription: prompt.metadata?.promptDescription,
          safetyVersion: prompt.metadata?.safetyVersion ?? 'unknown',
          experimentId: prompt.metadata?.experimentId,
          canaryBucket: prompt.metadata?.canaryBucket,
          canaryPercentage: prompt.metadata?.canaryPercentage,
          streamingEnabled: prompt.metadata?.streamingEnabled,
          structuredOutputsEnabled: prompt.metadata?.structuredOutputsEnabled,
          toolCallingEnabled: prompt.metadata?.toolCallingEnabled,
          futureMemoryEnabled: prompt.metadata?.futureMemoryEnabled,
          currentPromptVersion: prompt.metadata?.currentPromptVersion,
          previousPromptVersion: prompt.metadata?.previousPromptVersion,
          currentProvider: prompt.metadata?.currentProvider,
          previousProvider: prompt.metadata?.previousProvider,
          currentModel: prompt.metadata?.currentModel,
          previousModel: prompt.metadata?.previousModel,
          retryCount: attempt,
          fallbackUsed: true,
          startTime: new Date().toISOString(),
          durationMs: Date.now() - attemptStartedAt,
          errorCode: normalized.code,
          reason: normalized.message,
        });

        throw normalized;
      }
    }

    return null;
  }

  private createAttemptController(
    timeoutMs: number,
    externalSignal?: AbortSignal,
  ): {
    controller: AbortController;
    timeoutTriggered: boolean;
    clientAborted: boolean;
    cleanup: () => void;
  } {
    const controller = new AbortController();
    const state = {
      timeoutTriggered: false,
      clientAborted: false,
    };

    const timeoutHandle = setTimeout(() => {
      state.timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);

    const onExternalAbort = () => {
      state.clientAborted = true;
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        state.clientAborted = true;
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, {
          once: true,
        });
      }
    }

    return {
      controller,
      get timeoutTriggered() {
        return state.timeoutTriggered;
      },
      get clientAborted() {
        return state.clientAborted;
      },
      cleanup: () => {
        clearTimeout(timeoutHandle);
        externalSignal?.removeEventListener('abort', onExternalAbort);
      },
    };
  }

  private isProviderReady(now: number): boolean {
    const threshold = this.config.getCircuitThreshold();
    const resetMs = this.config.getCircuitResetMs();

    if (this.circuitState.status === 'open') {
      const openedAt = this.circuitState.openedAt ?? now;

      if (now - openedAt >= resetMs) {
        this.circuitState = {
          status: 'half-open',
          failureCount: 0,
          openedAt,
          probeInFlight: false,
        };
      } else {
        return false;
      }
    }

    if (this.circuitState.status === 'half-open') {
      if (this.circuitState.probeInFlight) {
        return false;
      }

      this.circuitState = {
        ...this.circuitState,
        probeInFlight: true,
      };
      return true;
    }

    return threshold > 0;
  }

  private onSuccess(): void {
    this.circuitState = {
      status: 'closed',
      failureCount: 0,
      probeInFlight: false,
    };
  }

  private onFailure(): void {
    const threshold = this.config.getCircuitThreshold();
    const failureCount = this.circuitState.failureCount + 1;

    if (this.circuitState.status === 'half-open' || failureCount >= threshold) {
      this.circuitState = {
        status: 'open',
        failureCount: 0,
        openedAt: Date.now(),
        probeInFlight: false,
      };
      return;
    }

    this.circuitState = {
      ...this.circuitState,
      failureCount,
      probeInFlight: false,
    };
  }

  private normalizeError(
    error: unknown,
    attemptController: {
      timeoutTriggered: boolean;
      clientAborted: boolean;
      controller: AbortController;
    },
  ): AiLlmError {
    if (error instanceof AiLlmError) {
      return error;
    }

    if (attemptController.clientAborted) {
      return new LLMCancelledError(undefined, error);
    }

    if (
      attemptController.timeoutTriggered ||
      attemptController.controller.signal.aborted
    ) {
      return new LLMTimeoutError(undefined, error);
    }

    const status = this.readStatus(error);
    const name = this.readName(error);
    const code = this.readCode(error);

    if (
      status === 429 ||
      name === 'RateLimitError' ||
      code === 'rate_limit_exceeded'
    ) {
      return new LLMRateLimitError(undefined, error);
    }

    if (
      status === 401 ||
      status === 403 ||
      name === 'AuthenticationError' ||
      name === 'PermissionDeniedError'
    ) {
      return new LLMAuthenticationError(undefined, error);
    }

    if (
      status === 400 ||
      status === 404 ||
      status === 422 ||
      name === 'BadRequestError' ||
      name === 'UnprocessableEntityError' ||
      code === 'content_filter'
    ) {
      return new LLMConfigurationError('OpenAI rejected the request.', error);
    }

    if (typeof status === 'number' && status >= 500) {
      return new LLMUnavailableError(undefined, error);
    }

    if (
      name === 'APIConnectionError' ||
      name === 'APIConnectionTimeoutError' ||
      name === 'FetchError' ||
      this.isNetworkLikeError(error)
    ) {
      return new LLMUnavailableError(undefined, error);
    }

    if (name === 'LLMConfigurationError') {
      return new LLMConfigurationError(undefined, error);
    }

    return new LLMUnknownError(undefined, error);
  }

  private readStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const status = (error as { status?: unknown }).status;

    return typeof status === 'number' ? status : undefined;
  }

  private readName(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const name = (error as { name?: unknown }).name;

    return typeof name === 'string' ? name : undefined;
  }

  private readCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const code = (error as { code?: unknown }).code;

    return typeof code === 'string' ? code : undefined;
  }

  private isNetworkLikeError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = this.readCode(error);

    return (
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'ECONNREFUSED'
    );
  }

  private backoffMs(attempt: number): number {
    const baseMs = 250;
    const jitterMs = 100;
    const multiplier = 2 ** attempt;

    return baseMs * multiplier + Math.floor(Math.random() * jitterMs);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
