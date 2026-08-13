export type AiSafetySizeMetricsContext = {
  promptVersion: string;
  safetyVersion: string;
  contextVersion: string;
  provider: string;
  model: string;
  promptSizeChars: number;
  contextSizeChars: number;
  redactionCount: number;
  removedMessageCount: number;
};

export type AiSafetyAttemptMetricsContext = AiSafetySizeMetricsContext & {
  riskLevel: string;
  classification: string;
};

export type AiSafetyBlockedMetricsContext = AiSafetyAttemptMetricsContext & {
  reason: string;
};

export type AiSafetyOutputMetricsContext = AiSafetySizeMetricsContext & {
  reason: string;
  outputSizeChars: number;
};

export interface AiSafetyMetrics {
  recordInjectionAttempt(context: AiSafetyAttemptMetricsContext): void;
  recordBlockedPrompt(context: AiSafetyBlockedMetricsContext): void;
  recordOutputRejected(context: AiSafetyOutputMetricsContext): void;
  recordPromptSize(context: AiSafetySizeMetricsContext): void;
  recordContextSize(context: AiSafetySizeMetricsContext): void;
  recordPIIRedaction(context: AiSafetySizeMetricsContext): void;
}

export const AI_SAFETY_METRICS = Symbol('AI_SAFETY_METRICS');

export class NoopAiSafetyMetrics implements AiSafetyMetrics {
  recordInjectionAttempt(): void {}

  recordBlockedPrompt(): void {}

  recordOutputRejected(): void {}

  recordPromptSize(): void {}

  recordContextSize(): void {}

  recordPIIRedaction(): void {}
}
