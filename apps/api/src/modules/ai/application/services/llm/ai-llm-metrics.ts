export type AiLlmMetricsContext = {
  requestId: string;
  provider: string;
  model: string;
  latencyMs: number;
  retryCount: number;
  timeoutMs: number;
  fallbackUsed: boolean;
};

export type AiLlmRetryMetricsContext = AiLlmMetricsContext & {
  attempt: number;
  errorCode: string;
};

export type AiLlmFailureMetricsContext = AiLlmMetricsContext & {
  errorCode: string;
};

export interface AiLlmMetrics {
  recordLatency(context: AiLlmMetricsContext): void;
  recordRetry(context: AiLlmRetryMetricsContext): void;
  recordFallback(context: AiLlmMetricsContext): void;
  recordFailure(context: AiLlmFailureMetricsContext): void;
  recordCircuitOpen(context: AiLlmMetricsContext): void;
}

export const AI_LLM_METRICS = Symbol('AI_LLM_METRICS');

export class NoopAiLlmMetrics implements AiLlmMetrics {
  recordLatency(): void {}

  recordRetry(): void {}

  recordFallback(): void {}

  recordFailure(): void {}

  recordCircuitOpen(): void {}
}
