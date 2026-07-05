import {
  AiLlmObservabilityCircuitContext,
  AiLlmObservabilityFallbackContext,
  AiLlmObservabilityFailureContext,
  AiLlmObservabilityLatencyContext,
  AiLlmObservabilityRequestContext,
  AiLlmObservabilityStreamContext,
  AiLlmObservabilityStreamInterruptedContext,
  AiLlmObservabilitySafetyContext,
  AiLlmObservabilitySuccessContext,
} from './ai-llm-observability.types';

export interface AiLlmObservabilityMetrics {
  recordRequest(context: AiLlmObservabilityRequestContext): void;
  recordLatency(context: AiLlmObservabilityLatencyContext): void;
  recordTokenUsage(context: AiLlmObservabilitySuccessContext): void;
  recordEstimatedCost(context: AiLlmObservabilitySuccessContext): void;
  recordProviderFailure(context: AiLlmObservabilityFailureContext): void;
  recordFallback(context: AiLlmObservabilityFallbackContext): void;
  recordSafetyBlock(context: AiLlmObservabilitySafetyContext): void;
  recordCircuitOpen(context: AiLlmObservabilityCircuitContext): void;
  recordRetry(context: AiLlmObservabilityRetryContext): void;
  recordSuccess(context: AiLlmObservabilitySuccessContext): void;
  recordStreamOpened(context: AiLlmObservabilityStreamContext): void;
  recordStreamCompleted(context: AiLlmObservabilityStreamContext): void;
  recordStreamInterrupted(
    context: AiLlmObservabilityStreamInterruptedContext,
  ): void;
  recordStreamCancelled(
    context: AiLlmObservabilityStreamInterruptedContext,
  ): void;
}

export type AiLlmObservabilityRetryContext =
  AiLlmObservabilityRequestContext & {
    attempt: number;
    errorCode: string;
  };

export const AI_LLM_OBSERVABILITY_METRICS = Symbol(
  'AI_LLM_OBSERVABILITY_METRICS',
);

export class NoopAiLlmObservabilityMetrics implements AiLlmObservabilityMetrics {
  recordRequest(): void {}

  recordLatency(): void {}

  recordTokenUsage(): void {}

  recordEstimatedCost(): void {}

  recordProviderFailure(): void {}

  recordFallback(): void {}

  recordSafetyBlock(): void {}

  recordCircuitOpen(): void {}

  recordRetry(): void {}

  recordSuccess(): void {}

  recordStreamOpened(): void {}

  recordStreamCompleted(): void {}

  recordStreamInterrupted(): void {}

  recordStreamCancelled(): void {}
}
