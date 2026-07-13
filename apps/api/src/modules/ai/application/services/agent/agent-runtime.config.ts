import { Injectable } from '@nestjs/common';

import { LLMConfigurationError } from '../llm/ai-llm.errors';

@Injectable()
export class AgentRuntimeConfigService {
  private readonly enabled = this.readBoolean(
    'AI_AGENT_RUNTIME_ENABLED',
    false,
  );
  private readonly maxSteps = this.readInteger('AI_AGENT_MAX_STEPS', 6);
  private readonly toolsEnabled = this.readBoolean(
    'AI_AGENT_TOOLS_ENABLED',
    false,
  );
  private readonly maxToolCalls = this.readInteger(
    'AI_AGENT_MAX_TOOL_CALLS',
    4,
  );
  private readonly maxExperts = this.readInteger('AI_COACH_MAX_EXPERTS', 4);
  private readonly toolTimeoutMs = this.readInteger(
    'AI_AGENT_TOOL_TIMEOUT_MS',
    3000,
  );
  private readonly sessionMemoryMaxItems = this.readInteger(
    'AI_AGENT_SESSION_MEMORY_MAX_ITEMS',
    20,
  );
  private readonly sessionMemoryTtlMs = this.readInteger(
    'AI_AGENT_SESSION_MEMORY_TTL_MS',
    1800000,
  );
  private readonly traceMaxItems = this.readInteger(
    'AI_AGENT_TRACE_MAX_ITEMS',
    1000,
  );
  private readonly traceRetentionMs = this.readInteger(
    'AI_AGENT_TRACE_RETENTION_MS',
    86400000,
  );

  constructor() {
    this.validateConfiguration();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getMaxSteps(): number {
    return this.maxSteps;
  }

  isToolsEnabled(): boolean {
    return this.toolsEnabled;
  }

  getMaxToolCalls(): number {
    return this.maxToolCalls;
  }

  getMaxExperts(): number {
    return this.maxExperts;
  }

  getToolTimeoutMs(): number {
    return this.toolTimeoutMs;
  }

  getSessionMemoryMaxItems(): number {
    return this.sessionMemoryMaxItems;
  }

  getSessionMemoryTtlMs(): number {
    return this.sessionMemoryTtlMs;
  }

  getTraceMaxItems(): number {
    return this.traceMaxItems;
  }

  getTraceRetentionMs(): number {
    return this.traceRetentionMs;
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

    throw new LLMConfigurationError(`Invalid value for ${key}.`);
  }

  private readInteger(key: string, fallback: number): number {
    const raw = process.env[key];

    if (typeof raw !== 'string' || raw.trim() === '') {
      return fallback;
    }

    if (!/^[-]?\d+$/.test(raw.trim())) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    const value = Number.parseInt(raw.trim(), 10);

    if (!Number.isFinite(value) || value < 1) {
      throw new LLMConfigurationError(`Invalid value for ${key}.`);
    }

    return value;
  }

  private validateConfiguration(): void {
    if (this.maxSteps < 1) {
      throw new LLMConfigurationError(
        'AI_AGENT_MAX_STEPS must be greater than 0.',
      );
    }

    if (this.maxToolCalls < 1) {
      throw new LLMConfigurationError(
        'AI_AGENT_MAX_TOOL_CALLS must be greater than 0.',
      );
    }

    if (this.maxExperts < 1) {
      throw new LLMConfigurationError(
        'AI_COACH_MAX_EXPERTS must be greater than 0.',
      );
    }

    if (this.toolTimeoutMs < 1) {
      throw new LLMConfigurationError(
        'AI_AGENT_TOOL_TIMEOUT_MS must be greater than 0.',
      );
    }

    if (this.sessionMemoryMaxItems < 1) {
      throw new LLMConfigurationError(
        'AI_AGENT_SESSION_MEMORY_MAX_ITEMS must be greater than 0.',
      );
    }

    if (this.sessionMemoryTtlMs < 1) {
      throw new LLMConfigurationError(
        'AI_AGENT_SESSION_MEMORY_TTL_MS must be greater than 0.',
      );
    }

    if (this.traceMaxItems < 1) {
      throw new LLMConfigurationError(
        'AI_AGENT_TRACE_MAX_ITEMS must be greater than 0.',
      );
    }

    if (this.traceRetentionMs < 1) {
      throw new LLMConfigurationError(
        'AI_AGENT_TRACE_RETENTION_MS must be greater than 0.',
      );
    }
  }
}
