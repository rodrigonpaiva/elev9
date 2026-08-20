export type AiLlmErrorCode =
  | 'LLM_TIMEOUT'
  | 'LLM_CANCELLED'
  | 'LLM_RATE_LIMIT'
  | 'LLM_UNAVAILABLE'
  | 'LLM_AUTHENTICATION'
  | 'LLM_CONFIGURATION'
  | 'LLM_GUARDRAIL'
  | 'LLM_UNKNOWN';

export abstract class AiLlmError extends Error {
  constructor(
    public readonly code: AiLlmErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class LLMTimeoutError extends AiLlmError {
  constructor(message = 'OpenAI request timed out.', cause?: unknown) {
    super('LLM_TIMEOUT', message, true, cause);
  }
}

export class LLMCancelledError extends AiLlmError {
  constructor(message = 'OpenAI request was cancelled.', cause?: unknown) {
    super('LLM_CANCELLED', message, false, cause);
  }
}

export class LLMRateLimitError extends AiLlmError {
  constructor(message = 'OpenAI rate limit reached.', cause?: unknown) {
    super('LLM_RATE_LIMIT', message, false, cause);
  }
}

export class LLMUnavailableError extends AiLlmError {
  constructor(message = 'OpenAI is unavailable.', cause?: unknown) {
    super('LLM_UNAVAILABLE', message, true, cause);
  }
}

export class LLMAuthenticationError extends AiLlmError {
  constructor(message = 'OpenAI authentication failed.', cause?: unknown) {
    super('LLM_AUTHENTICATION', message, false, cause);
  }
}

export class LLMConfigurationError extends AiLlmError {
  constructor(message = 'Invalid LLM configuration.', cause?: unknown) {
    super('LLM_CONFIGURATION', message, false, cause);
  }
}

export class LLMUnknownError extends AiLlmError {
  constructor(message = 'Unknown LLM failure.', cause?: unknown) {
    super('LLM_UNKNOWN', message, false, cause);
  }
}

export class LLMCostGuardrailError extends AiLlmError {
  constructor(
    message = 'LLM request exceeded configured guardrails.',
    cause?: unknown,
  ) {
    super('LLM_GUARDRAIL', message, false, cause);
  }
}
