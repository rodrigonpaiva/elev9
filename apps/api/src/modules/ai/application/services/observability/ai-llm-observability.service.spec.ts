import { Logger } from '@nestjs/common';

import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { LLMCostGuardrailError } from '../llm/ai-llm.errors';
import { AiLlmObservabilityMetrics } from './ai-llm-observability-metrics';
import { AiLlmObservabilityService } from './ai-llm-observability.service';

describe('AiLlmObservabilityService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-30T10:00:00.000Z'));
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('records request lifecycle data, latency, token usage and estimated cost', async () => {
    const metrics = mockMetrics();
    const service = createService(metrics);
    const baseContext = baseRequestContext();

    service.recordRequest(baseContext);

    const replyPromise = service.observeAttempt(
      {
        ...baseContext,
        attempt: 1,
      },
      async () => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 250);
        });

        return {
          content: 'Keep the session lighter today.',
          usage: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        };
      },
    );

    await jest.advanceTimersByTimeAsync(250);
    const reply = await replyPromise;

    expect(reply.content).toBe('Keep the session lighter today.');
    expect(metrics.recordRequest).toHaveBeenCalledTimes(1);
    expect(metrics.recordLatency).toHaveBeenCalledTimes(1);
    expect(metrics.recordTokenUsage).toHaveBeenCalledTimes(1);
    expect(metrics.recordEstimatedCost).toHaveBeenCalledTimes(1);
    expect(metrics.recordSuccess).toHaveBeenCalledTimes(1);
    expect(Logger.prototype.log).toHaveBeenCalled();

    const report = service.snapshotUsageReport();

    expect(report).toMatchObject({
      day: '2026-04-30',
      requests: 1,
      failures: 0,
      safetyBlocks: 0,
      fallbacks: 0,
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCost: 0.02,
      providerUsage: {
        openai: 1,
      },
      modelUsage: {
        'gpt-4.1-mini': 1,
      },
    });
    expect(report.totalLatencyMs).toBe(250);
    expect(report.averageLatencyMs).toBe(250);
    expect(report.p95LatencyMs).toBe(250);
  });

  it('does not retain raw prompt or message payloads in lifecycle state', () => {
    const metrics = mockMetrics();
    const service = createService(metrics);
    const baseContext = baseRequestContext();

    service.recordRequest(baseContext);

    const lifecycle = service.snapshotLifecycle(baseContext.requestId);

    expect(lifecycle).toMatchObject({
      requestId: baseContext.requestId,
      conversationId: baseContext.conversationId,
      userIdHash: baseContext.userIdHash,
    });
    expect(lifecycle).not.toHaveProperty('prompt');
    expect(lifecycle).not.toHaveProperty('messages');
    expect(lifecycle).not.toHaveProperty('rawPrompt');
  });

  it('emits stable error categories without sensitive identity fields', async () => {
    const metrics = mockMetrics();
    const service = createService(metrics);
    const context = baseRequestContext();
    service.recordRequest(context);

    await expect(
      service.observeAttempt({ ...context, attempt: 1 }, async () => {
        throw Object.assign(new Error('provider details must not be logged'), {
          status: 401,
        });
      }),
    ).rejects.toBeDefined();

    service.recordFallback({
      ...context,
      durationMs: 20,
      errorCode: 'LLM_RATE_LIMIT',
      reason: 'quota',
    });

    const report = service.snapshotUsageReport();
    expect(report.errorsByCategory).toMatchObject({
      authentication: 1,
      fallback: 1,
    });
    expect(report.failures).toBe(1);
    expect(report.quotaExceeded).toBe(1);

    const serializedLogs = (Logger.prototype.log as jest.Mock).mock.calls
      .flat()
      .filter((value): value is string => typeof value === 'string')
      .join('\n');
    expect(serializedLogs).toContain('request-1');
    expect(serializedLogs).toContain('"operation":"llm"');
    expect(serializedLogs).not.toContain('conversation-1');
    expect(serializedLogs).not.toContain('user-hash-1');
    expect(serializedLogs).not.toContain('provider details must not be logged');
  });

  it('prunes traces beyond the configured limit while preserving report aggregation', () => {
    const metrics = mockMetrics();
    const service = createService(metrics, {
      maxTraces: 2,
      maxReports: 8,
      retentionMs: 86400000,
    });

    service.recordRequest({
      ...baseRequestContext(),
      requestId: 'request-1',
      startTime: '2026-04-30T10:00:00.000Z',
    });
    service.recordRequest({
      ...baseRequestContext(),
      requestId: 'request-2',
      startTime: '2026-04-30T10:00:01.000Z',
    });
    service.recordRequest({
      ...baseRequestContext(),
      requestId: 'request-3',
      startTime: '2026-04-30T10:00:02.000Z',
    });

    expect(service.snapshotLifecycle('request-1')).toBeUndefined();
    expect(service.snapshotLifecycle('request-2')).toBeDefined();
    expect(service.snapshotLifecycle('request-3')).toBeDefined();

    const report = service.snapshotUsageReport(
      new Date('2026-04-30T10:00:02.000Z'),
    );

    expect(report.requests).toBe(3);
    expect(report.providerUsage).toEqual({
      openai: 3,
    });
    expect(report.modelUsage).toEqual({
      'gpt-4.1-mini': 3,
    });
  });

  it('cleans up retained traces and reports after the retention window expires', () => {
    const metrics = mockMetrics();
    const service = createService(metrics, {
      maxTraces: 10,
      maxReports: 10,
      retentionMs: 1_000,
    });

    service.recordRequest(baseRequestContext());

    jest.setSystemTime(new Date('2026-04-30T10:00:02.000Z'));
    service.pruneRetentionState();

    expect(service.snapshotLifecycle('request-1')).toBeUndefined();

    const report = service.snapshotUsageReport(
      new Date('2026-04-30T10:00:02.000Z'),
    );

    expect(report.requests).toBe(0);
    expect(report.failures).toBe(0);
    expect(report.safetyBlocks).toBe(0);
    expect(report.fallbacks).toBe(0);
  });

  it('records retry, fallback, safety and circuit metrics', () => {
    const metrics = mockMetrics();
    const service = createService(metrics);
    const baseContext = baseRequestContext();

    service.recordRetry({
      ...baseContext,
      attempt: 1,
      errorCode: 'LLM_RATE_LIMIT',
    });
    service.recordFallback({
      ...baseContext,
      durationMs: 120,
      errorCode: 'LLM_UNAVAILABLE',
      reason: 'provider down',
    });
    service.recordSafetyBlock({
      requestId: baseContext.requestId,
      conversationId: baseContext.conversationId,
      userIdHash: baseContext.userIdHash,
      provider: baseContext.provider,
      model: baseContext.model,
      promptVersion: baseContext.promptVersion,
      safetyVersion: baseContext.safetyVersion,
      classification: 'BLOCKED',
      reason: 'risk:HIGH',
    });
    service.recordCircuitOpen({
      ...baseContext,
      reason: 'circuit_open',
    });

    expect(metrics.recordRetry).toHaveBeenCalledTimes(1);
    expect(metrics.recordFallback).toHaveBeenCalledTimes(1);
    expect(metrics.recordSafetyBlock).toHaveBeenCalledTimes(1);
    expect(metrics.recordCircuitOpen).toHaveBeenCalledTimes(1);
  });

  it('rejects requests that exceed configured token guardrails', async () => {
    const metrics = mockMetrics();
    const service = createService(metrics, {
      maxPromptTokens: 50,
      maxCompletionTokens: 100,
      maxRequestCost: 1,
    });
    const baseContext = baseRequestContext();

    service.recordRequest(baseContext);

    await expect(
      service.observeAttempt(
        {
          ...baseContext,
          attempt: 1,
        },
        async () => ({
          content: 'Too large.',
          usage: {
            promptTokens: 100,
            completionTokens: 10,
            totalTokens: 110,
          },
        }),
      ),
    ).rejects.toBeInstanceOf(LLMCostGuardrailError);
  });
});

function createService(
  metrics: jest.Mocked<AiLlmObservabilityMetrics>,
  overrides: Partial<{
    inputCostPer1k: number;
    outputCostPer1k: number;
    maxPromptTokens: number;
    maxCompletionTokens: number;
    maxRequestCost: number;
    maxTraces: number;
    maxReports: number;
    retentionMs: number;
  }> = {},
): AiLlmObservabilityService {
  return new AiLlmObservabilityService(mockConfig(overrides), metrics);
}

function mockMetrics(): jest.Mocked<AiLlmObservabilityMetrics> {
  return {
    recordRequest: jest.fn(),
    recordLatency: jest.fn(),
    recordTokenUsage: jest.fn(),
    recordEstimatedCost: jest.fn(),
    recordProviderFailure: jest.fn(),
    recordFallback: jest.fn(),
    recordSafetyBlock: jest.fn(),
    recordCircuitOpen: jest.fn(),
    recordRetry: jest.fn(),
    recordSuccess: jest.fn(),
    recordStreamOpened: jest.fn(),
    recordStreamCompleted: jest.fn(),
    recordStreamInterrupted: jest.fn(),
    recordStreamCancelled: jest.fn(),
  };
}

function mockConfig(
  overrides: Partial<{
    inputCostPer1k: number;
    outputCostPer1k: number;
    maxPromptTokens: number;
    maxCompletionTokens: number;
    maxRequestCost: number;
    maxTraces: number;
    maxReports: number;
    retentionMs: number;
  }> = {},
): AiLlmConfigService {
  return {
    getInputCostPer1k: jest
      .fn()
      .mockReturnValue(overrides.inputCostPer1k ?? 0.1),
    getOutputCostPer1k: jest
      .fn()
      .mockReturnValue(overrides.outputCostPer1k ?? 0.2),
    getMaxPromptTokens: jest.fn().mockReturnValue(overrides.maxPromptTokens),
    getMaxCompletionTokens: jest
      .fn()
      .mockReturnValue(overrides.maxCompletionTokens),
    getMaxRequestCost: jest.fn().mockReturnValue(overrides.maxRequestCost),
    getObservabilityMaxTraces: jest
      .fn()
      .mockReturnValue(overrides.maxTraces ?? 1000),
    getObservabilityMaxReports: jest
      .fn()
      .mockReturnValue(overrides.maxReports ?? 32),
    getObservabilityRetentionMs: jest
      .fn()
      .mockReturnValue(overrides.retentionMs ?? 86400000),
    getProvider: jest.fn().mockReturnValue('openai'),
    getModel: jest.fn().mockReturnValue('gpt-4.1-mini'),
  } as unknown as AiLlmConfigService;
}

function baseRequestContext() {
  return {
    requestId: 'request-1',
    conversationId: 'conversation-1',
    userIdHash: 'user-hash-1',
    provider: 'openai',
    model: 'gpt-4.1-mini',
    promptVersion: 'coach-chat-prompt-v1',
    safetyVersion: 'ai-safety-v1',
    retryCount: 0,
    fallbackUsed: false,
    startTime: '2026-04-30T10:00:00.000Z',
  };
}
