import { Injectable } from '@nestjs/common';

import { LLMConfigurationError } from './ai-llm.errors';
import {
  isSupportedOpenAiModel,
  normalizeOpenAiModelName,
} from './openai-provider-capabilities';

@Injectable()
export class AiLlmConfigService {
  private readonly enabled = this.readBoolean('AI_LLM_ENABLED', false);
  private readonly provider = this.readString('AI_LLM_PROVIDER', 'openai');
  private readonly model = this.readModel('OPENAI_MODEL', 'gpt-4.1-mini');
  private readonly previousProvider = this.readOptionalString(
    'AI_LLM_PREVIOUS_PROVIDER',
  );
  private readonly previousModel = this.readOptionalString(
    'AI_LLM_PREVIOUS_MODEL',
  );
  private readonly promptVersion = this.readString(
    'AI_PROMPT_COACH_CHAT_VERSION',
    'coach-chat-prompt-v1',
  );
  private readonly previousPromptVersion = this.readString(
    'AI_PROMPT_COACH_CHAT_PREVIOUS_VERSION',
    'coach-chat-prompt-v0',
  );
  private readonly experimentId = this.readString(
    'AI_LLM_EXPERIMENT_ID',
    'coach-chat-evaluation-rollout',
  );
  private readonly canaryPercentage = this.readInteger(
    'AI_LLM_CANARY_PERCENTAGE',
    100,
    {
      min: 0,
      allowZero: true,
    },
  );
  private readonly apiKey = this.readString('OPENAI_API_KEY', '');
  private readonly timeoutMs = this.readInteger('AI_LLM_TIMEOUT_MS', 15000, {
    min: 1,
    allowZero: false,
  });
  private readonly maxRetries = this.readInteger('AI_LLM_MAX_RETRIES', 2, {
    min: 0,
    allowZero: true,
  });
  private readonly circuitThreshold = this.readInteger(
    'AI_LLM_CIRCUIT_THRESHOLD',
    5,
    {
      min: 1,
      allowZero: false,
    },
  );
  private readonly circuitResetMs = this.readInteger(
    'AI_LLM_CIRCUIT_RESET_MS',
    60000,
    {
      min: 1,
      allowZero: false,
    },
  );
  private readonly maxResponseChars = this.readInteger(
    'AI_LLM_MAX_RESPONSE_CHARS',
    4000,
    {
      min: 1,
      allowZero: false,
    },
  );
  private readonly observabilityMaxTraces = this.readInteger(
    'AI_LLM_OBSERVABILITY_MAX_TRACES',
    1000,
    {
      min: 1,
      allowZero: false,
    },
  );
  private readonly observabilityMaxReports = this.readInteger(
    'AI_LLM_OBSERVABILITY_MAX_REPORTS',
    32,
    {
      min: 1,
      allowZero: false,
    },
  );
  private readonly observabilityRetentionMs = this.readInteger(
    'AI_LLM_OBSERVABILITY_RETENTION_MS',
    86400000,
    {
      min: 1,
      allowZero: false,
    },
  );
  private readonly inputCostPer1k = this.readOptionalDecimal(
    'AI_LLM_INPUT_COST_PER_1K',
  );
  private readonly outputCostPer1k = this.readOptionalDecimal(
    'AI_LLM_OUTPUT_COST_PER_1K',
  );
  private readonly streamingEnabled = this.readBoolean(
    'AI_LLM_STREAMING_ENABLED',
    false,
  );
  private readonly structuredOutputsEnabled = this.readBoolean(
    'AI_LLM_STRUCTURED_OUTPUTS_ENABLED',
    true,
  );
  private readonly toolCallingEnabled = this.readBoolean(
    'AI_LLM_TOOL_CALLING_ENABLED',
    false,
  );
  private readonly futureMemoryEnabled = this.readBoolean(
    'AI_LLM_MEMORY_ENABLED',
    false,
  );
  private readonly maxPromptTokens = this.readOptionalInteger(
    'AI_LLM_MAX_PROMPT_TOKENS',
  );
  private readonly maxCompletionTokens = this.readOptionalInteger(
    'AI_LLM_MAX_COMPLETION_TOKENS',
  );
  private readonly maxRequestCost = this.readOptionalDecimal(
    'AI_LLM_MAX_REQUEST_COST',
  );

  constructor() {
    this.validateConfiguration();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getProvider(): string {
    return this.provider.toLowerCase();
  }

  getModel(): string {
    return this.model;
  }

  getPreviousProvider(): string | undefined {
    return this.previousProvider;
  }

  getPreviousModel(): string | undefined {
    return this.previousModel;
  }

  getPromptVersion(): string {
    return this.promptVersion;
  }

  getPreviousPromptVersion(): string {
    return this.previousPromptVersion;
  }

  getExperimentId(): string {
    return this.experimentId;
  }

  getCanaryPercentage(): number {
    return this.canaryPercentage;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  getTimeoutMs(): number {
    return this.timeoutMs;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }

  getCircuitThreshold(): number {
    return this.circuitThreshold;
  }

  getCircuitResetMs(): number {
    return this.circuitResetMs;
  }

  getMaxResponseChars(): number {
    return this.maxResponseChars;
  }

  getObservabilityMaxTraces(): number {
    return this.observabilityMaxTraces;
  }

  getObservabilityMaxReports(): number {
    return this.observabilityMaxReports;
  }

  getObservabilityRetentionMs(): number {
    return this.observabilityRetentionMs;
  }

  getInputCostPer1k(): number | undefined {
    return this.inputCostPer1k;
  }

  getOutputCostPer1k(): number | undefined {
    return this.outputCostPer1k;
  }

  isStreamingEnabled(): boolean {
    return this.streamingEnabled;
  }

  isStructuredOutputsEnabled(): boolean {
    return this.structuredOutputsEnabled;
  }

  isToolCallingEnabled(): boolean {
    return this.toolCallingEnabled;
  }

  isFutureMemoryEnabled(): boolean {
    return this.futureMemoryEnabled;
  }

  getMaxPromptTokens(): number | undefined {
    return this.maxPromptTokens;
  }

  getMaxCompletionTokens(): number | undefined {
    return this.maxCompletionTokens;
  }

  getMaxRequestCost(): number | undefined {
    return this.maxRequestCost;
  }

  private readBoolean(key: string, fallback: boolean): boolean {
    const value = process.env[key];

    if (typeof value !== 'string') {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();

    if (normalized === '') {
      return fallback;
    }

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    return fallback;
  }

  private readString(key: string, fallback: string): string {
    const value = process.env[key];

    if (typeof value !== 'string') {
      return fallback;
    }

    return value.trim() || fallback;
  }

  private readOptionalString(key: string): string | undefined {
    const value = process.env[key];

    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.trim();

    return normalized ? normalized : undefined;
  }

  private readModel(key: string, fallback: string): string {
    const value = this.readString(key, fallback);

    return normalizeOpenAiModelName(value);
  }

  private validateConfiguration(): void {
    if (this.provider !== 'openai') {
      return;
    }

    if (this.isEnabled() && !this.apiKey) {
      throw new LLMConfigurationError(
        'OPENAI_API_KEY is required when AI_LLM_ENABLED=true.',
      );
    }

    if (!isSupportedOpenAiModel(this.model)) {
      throw new LLMConfigurationError(
        `Unsupported OPENAI_MODEL value: ${this.model}.`,
      );
    }

    if (this.canaryPercentage < 0 || this.canaryPercentage > 100) {
      throw new LLMConfigurationError(
        'AI_LLM_CANARY_PERCENTAGE must be between 0 and 100.',
      );
    }
  }

  private readInteger(
    key: string,
    fallback: number,
    options: { min: number; allowZero: boolean },
  ): number {
    const raw = this.readString(key, String(fallback));

    if (!/^[-]?\d+$/.test(raw)) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    const value = Number.parseInt(raw, 10);

    if (!Number.isFinite(value)) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    if ((!options.allowZero && value === 0) || value < options.min) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    return value;
  }

  private readOptionalInteger(key: string): number | undefined {
    const raw = process.env[key];

    if (typeof raw !== 'string' || raw.trim() === '') {
      return undefined;
    }

    if (!/^[-]?\d+$/.test(raw.trim())) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    const value = Number.parseInt(raw.trim(), 10);

    if (!Number.isFinite(value) || value < 0) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    return value;
  }

  private readOptionalDecimal(key: string): number | undefined {
    const raw = process.env[key];

    if (typeof raw !== 'string' || raw.trim() === '') {
      return undefined;
    }

    if (!/^[-]?\d+(\.\d+)?$/.test(raw.trim())) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    const value = Number.parseFloat(raw.trim());

    if (!Number.isFinite(value) || value < 0) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    return value;
  }
}
