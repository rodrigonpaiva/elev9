import { Inject, Injectable, Logger } from '@nestjs/common';

import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { AiLlmProviderReply, AiLlmTokenUsage } from '../llm/ai-llm.types';
import { LLMCostGuardrailError, LLMUnknownError } from '../llm/ai-llm.errors';
import {
  AI_LLM_OBSERVABILITY_METRICS,
  AiLlmObservabilityMetrics,
} from './ai-llm-observability-metrics';
import {
  AiLlmObservabilityAttemptContext,
  AiLlmObservabilityCircuitContext,
  AiLlmObservabilityFallbackContext,
  AiLlmObservabilityFailureContext,
  AiLlmObservabilityLatencyContext,
  AiLlmObservabilityRequestContext,
  AiLlmObservabilityStreamContext,
  AiLlmObservabilityStreamInterruptedContext,
  AiLlmObservabilitySafetyContext,
  AiLlmObservabilityRetryContext,
  AiLlmObservabilitySuccessContext,
  AiLlmRequestLifecycle,
  AiLlmUsageReport,
} from './ai-llm-observability.types';

const UNKNOWN = 'unknown';

type UsageReportAccumulator = {
  requests: number;
  failures: number;
  safetyBlocks: number;
  fallbacks: number;
  totalLatencyMs: number;
  latencies: number[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  providerUsage: Record<string, number>;
  modelUsage: Record<string, number>;
  updatedAtMs: number;
};

type StoredRequestLifecycle = AiLlmRequestLifecycle & {
  createdAtMs: number;
  updatedAtMs: number;
};

type StoredUsageReportAccumulator = UsageReportAccumulator;

@Injectable()
export class AiLlmObservabilityService {
  private readonly logger = new Logger(AiLlmObservabilityService.name);
  private readonly lifecycles = new Map<string, StoredRequestLifecycle>();
  private readonly reports = new Map<string, StoredUsageReportAccumulator>();

  constructor(
    private readonly config: AiLlmConfigService,
    @Inject(AI_LLM_OBSERVABILITY_METRICS)
    private readonly metrics: AiLlmObservabilityMetrics,
  ) {}

  recordRequest(context: AiLlmObservabilityRequestContext): void {
    const now = Date.now();

    this.pruneRetentionState(now);

    this.lifecycles.set(context.requestId, {
      requestId: context.requestId,
      conversationId: context.conversationId,
      userIdHash: context.userIdHash,
      provider: context.provider,
      model: context.model,
      promptVersion: context.promptVersion,
      safetyVersion: context.safetyVersion,
      promptId: context.promptId,
      promptReleaseDate: context.promptReleaseDate,
      promptStatus: context.promptStatus,
      promptAuthor: context.promptAuthor,
      promptDescription: context.promptDescription,
      experimentId: context.experimentId,
      canaryBucket: context.canaryBucket,
      canaryPercentage: context.canaryPercentage,
      streamingEnabled: context.streamingEnabled,
      structuredOutputsEnabled: context.structuredOutputsEnabled,
      toolCallingEnabled: context.toolCallingEnabled,
      futureMemoryEnabled: context.futureMemoryEnabled,
      currentPromptVersion: context.currentPromptVersion,
      previousPromptVersion: context.previousPromptVersion,
      currentProvider: context.currentProvider,
      previousProvider: context.previousProvider,
      currentModel: context.currentModel,
      previousModel: context.previousModel,
      createdAt: context.startTime,
      updatedAt: context.startTime,
      startTime: context.startTime,
      retryCount: context.retryCount,
      success: false,
      fallbackUsed: context.fallbackUsed,
      createdAtMs: now,
      updatedAtMs: now,
    });

    this.incrementReport({
      requestId: context.requestId,
      provider: context.provider,
      model: context.model,
      latencyMs: 0,
      timestampMs: now,
      countRequest: true,
      countFailure: false,
      countSafetyBlock: false,
      countFallback: false,
      countSuccess: false,
      tokens: undefined,
      estimatedCost: 'unknown',
    });

    this.metrics.recordRequest(context);
    this.logStructured('llm_request', {
      timestamp: context.startTime,
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      promptVersion: context.promptVersion,
      safetyVersion: context.safetyVersion,
      experimentId: context.experimentId ?? UNKNOWN,
      canaryBucket:
        typeof context.canaryBucket === 'number'
          ? context.canaryBucket
          : UNKNOWN,
      canaryPercentage:
        typeof context.canaryPercentage === 'number'
          ? context.canaryPercentage
          : UNKNOWN,
      retryCount: context.retryCount,
      fallbackUsed: context.fallbackUsed,
    });
  }

  async observeAttempt(
    context: AiLlmObservabilityAttemptContext,
    executor: () => Promise<AiLlmProviderReply>,
  ): Promise<AiLlmProviderReply> {
    const startedAt = Date.now();

    try {
      const reply = await executor();
      const durationMs = Date.now() - startedAt;
      const usage = this.normalizeUsage(reply.usage);
      const estimatedCost = this.calculateEstimatedCost(usage);

      this.recordLatency({
        requestId: context.requestId,
        provider: context.provider,
        model: context.model,
        promptVersion: context.promptVersion,
        safetyVersion: context.safetyVersion,
        startTime: context.startTime,
        durationMs,
        retryCount: context.retryCount,
        fallbackUsed: context.fallbackUsed,
      });
      this.recordTokenUsage({
        ...context,
        durationMs,
        tokenUsage: usage,
        estimatedCost,
      });
      this.recordEstimatedCost({
        ...context,
        durationMs,
        tokenUsage: usage,
        estimatedCost,
      });
      this.enforceGuardrails(context, usage, estimatedCost);
      this.recordSuccess({
        ...context,
        durationMs,
        tokenUsage: usage,
        estimatedCost,
      });

      return {
        content: reply.content,
        usage,
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const failureReason =
        error instanceof Error ? error.name : 'UnknownFailure';

      this.recordLatency({
        requestId: context.requestId,
        provider: context.provider,
        model: context.model,
        promptVersion: context.promptVersion,
        safetyVersion: context.safetyVersion,
        startTime: context.startTime,
        durationMs,
        retryCount: context.retryCount,
        fallbackUsed: context.fallbackUsed,
      });
      this.recordProviderFailure({
        ...context,
        durationMs,
        errorCode: failureReason,
      });
      this.logStructured('llm_failure', {
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        conversationId: context.conversationId ?? UNKNOWN,
        userIdHash: context.userIdHash ?? UNKNOWN,
        provider: context.provider,
        model: context.model,
        durationMs,
        retryCount: context.retryCount,
        fallbackUsed: context.fallbackUsed,
        errorCode: failureReason,
      });

      throw error instanceof Error
        ? error
        : new LLMUnknownError(undefined, error);
    }
  }

  recordRetry(context: AiLlmObservabilityRetryContext): void {
    this.pruneRetentionState();
    this.metrics.recordRetry(context);
    this.updateLifecycle(context.requestId, (current) => ({
      ...current,
      retryCount: context.attempt,
    }));
    this.logStructured('llm_retry', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      retryCount: context.attempt,
      errorCode: context.errorCode,
      fallbackUsed: context.fallbackUsed,
    });
  }

  recordFallback(context: AiLlmObservabilityFallbackContext): void {
    this.pruneRetentionState();
    this.metrics.recordFallback(context);
    const durationMs = this.resolveLifecycleDuration(
      context.requestId,
      context.durationMs,
    );
    this.updateLifecycle(
      context.requestId,
      (current) => ({
        ...current,
        endTime: new Date().toISOString(),
        durationMs,
        success: false,
        fallbackUsed: true,
        failureReason: context.errorCode,
      }),
      Date.now(),
    );
    this.incrementReport({
      requestId: context.requestId,
      provider: context.provider,
      model: context.model,
      latencyMs: durationMs,
      timestampMs: Date.now(),
      countRequest: false,
      countFailure: false,
      countSafetyBlock: false,
      countFallback: true,
      countSuccess: false,
      tokens: undefined,
      estimatedCost: 'unknown',
    });
    this.logStructured('llm_fallback', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      durationMs,
      retryCount: context.retryCount,
      fallbackUsed: true,
      errorCode: context.errorCode,
      reason: context.reason,
    });
  }

  recordSafetyBlock(context: AiLlmObservabilitySafetyContext): void {
    this.pruneRetentionState();
    this.metrics.recordSafetyBlock(context);
    this.incrementReport({
      requestId: context.requestId,
      provider: context.provider,
      model: context.model,
      latencyMs: 0,
      timestampMs: Date.now(),
      countRequest: false,
      countFailure: false,
      countSafetyBlock: true,
      countFallback: false,
      countSuccess: false,
      tokens: undefined,
      estimatedCost: 'unknown',
    });
    this.logStructured('llm_safety_block', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      promptVersion: context.promptVersion,
      safetyVersion: context.safetyVersion,
      classification: context.classification,
      reason: context.reason,
    });
  }

  recordCircuitOpen(context: AiLlmObservabilityCircuitContext): void {
    this.pruneRetentionState();
    this.metrics.recordCircuitOpen(context);
    this.logStructured('llm_circuit_open', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      promptVersion: context.promptVersion,
      safetyVersion: context.safetyVersion,
      retryCount: context.retryCount,
      fallbackUsed: context.fallbackUsed,
      reason: context.reason,
    });
  }

  recordStreamOpened(context: AiLlmObservabilityStreamContext): void {
    this.pruneRetentionState();
    this.metrics.recordStreamOpened(context);
    this.logStructured('llm_stream_opened', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      promptVersion: context.promptVersion,
      safetyVersion: context.safetyVersion,
      retryCount: context.retryCount,
      fallbackUsed: context.fallbackUsed,
    });
  }

  recordStreamCompleted(context: AiLlmObservabilityStreamContext): void {
    this.pruneRetentionState();
    this.metrics.recordStreamCompleted(context);
    this.logStructured('llm_stream_completed', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      durationMs: context.durationMs ?? 0,
      retryCount: context.retryCount,
      fallbackUsed: context.fallbackUsed,
      tokenUsage: context.tokenUsage ?? {
        promptTokens: UNKNOWN,
        completionTokens: UNKNOWN,
        totalTokens: UNKNOWN,
      },
    });
  }

  recordStreamInterrupted(
    context: AiLlmObservabilityStreamInterruptedContext,
  ): void {
    this.pruneRetentionState();
    this.metrics.recordStreamInterrupted(context);
    this.logStructured('llm_stream_interrupted', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      durationMs: context.durationMs,
      retryCount: context.retryCount,
      fallbackUsed: context.fallbackUsed,
      reason: context.reason,
    });
  }

  recordStreamCancelled(
    context: AiLlmObservabilityStreamInterruptedContext,
  ): void {
    this.pruneRetentionState();
    this.metrics.recordStreamCancelled(context);
    this.logStructured('llm_stream_cancelled', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      durationMs: context.durationMs,
      retryCount: context.retryCount,
      fallbackUsed: context.fallbackUsed,
      reason: context.reason,
    });
  }

  snapshotUsageReport(date = new Date()): AiLlmUsageReport {
    this.pruneRetentionState(date.getTime());
    const day = date.toISOString().slice(0, 10);
    const report = this.reports.get(day) ?? this.emptyAccumulator();

    return {
      day,
      requests: report.requests,
      failures: report.failures,
      safetyBlocks: report.safetyBlocks,
      fallbacks: report.fallbacks,
      totalLatencyMs: report.totalLatencyMs,
      averageLatencyMs: report.requests
        ? Math.round(report.totalLatencyMs / report.requests)
        : 0,
      p95LatencyMs: this.resolvePercentile(report.latencies, 95),
      promptTokens: report.promptTokens,
      completionTokens: report.completionTokens,
      totalTokens: report.totalTokens,
      estimatedCost: Number(report.estimatedCost.toFixed(4)),
      providerUsage: { ...report.providerUsage },
      modelUsage: { ...report.modelUsage },
    };
  }

  snapshotLifecycle(requestId: string): AiLlmRequestLifecycle | undefined {
    const lifecycle = this.lifecycles.get(requestId);

    if (!lifecycle) {
      return undefined;
    }

    const { createdAtMs, updatedAtMs, ...snapshot } = lifecycle;

    return { ...snapshot };
  }

  pruneRetentionState(now = Date.now()): void {
    this.pruneLifecycleRetention(now);
    this.pruneReportRetention(now);
  }

  private recordLatency(context: AiLlmObservabilityLatencyContext): void {
    this.metrics.recordLatency({
      ...context,
    });
    this.updateLifecycle(
      context.requestId,
      (current) => ({
        ...current,
        durationMs: context.durationMs,
      }),
      Date.now(),
    );
  }

  private recordTokenUsage(context: AiLlmObservabilitySuccessContext): void {
    this.metrics.recordTokenUsage(context);
  }

  private recordEstimatedCost(context: AiLlmObservabilitySuccessContext): void {
    this.metrics.recordEstimatedCost(context);
  }

  private recordProviderFailure(
    context: AiLlmObservabilityFailureContext,
  ): void {
    this.pruneRetentionState();
    this.updateLifecycle(
      context.requestId,
      (current) => ({
        ...current,
        durationMs: context.durationMs,
        success: false,
        failureReason: context.errorCode,
      }),
      Date.now(),
    );
    this.incrementReport({
      requestId: context.requestId,
      provider: context.provider,
      model: context.model,
      latencyMs: 0,
      timestampMs: Date.now(),
      countRequest: false,
      countFailure: false,
      countSafetyBlock: false,
      countFallback: false,
      countSuccess: false,
      tokens: undefined,
      estimatedCost: 'unknown',
    });
    this.metrics.recordProviderFailure(context);
  }

  private recordSuccess(context: AiLlmObservabilitySuccessContext): void {
    this.pruneRetentionState();
    const durationMs = this.resolveLifecycleDuration(
      context.requestId,
      context.durationMs,
    );
    this.updateLifecycle(
      context.requestId,
      (current) => ({
        ...current,
        endTime: new Date().toISOString(),
        durationMs,
        success: true,
        fallbackUsed: context.fallbackUsed,
        tokenUsage: context.tokenUsage,
        estimatedCost: context.estimatedCost,
      }),
      Date.now(),
    );
    this.incrementReport({
      requestId: context.requestId,
      provider: context.provider,
      model: context.model,
      latencyMs: durationMs,
      timestampMs: Date.now(),
      countRequest: false,
      countFailure: false,
      countSafetyBlock: false,
      countFallback: context.fallbackUsed,
      countSuccess: true,
      tokens: context.tokenUsage,
      estimatedCost: context.estimatedCost,
    });
    this.metrics.recordSuccess(context);
    this.logStructured('llm_success', {
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      conversationId: context.conversationId ?? UNKNOWN,
      userIdHash: context.userIdHash ?? UNKNOWN,
      provider: context.provider,
      model: context.model,
      durationMs,
      retryCount: context.retryCount,
      fallbackUsed: context.fallbackUsed,
      tokenUsage: context.tokenUsage ?? {
        promptTokens: UNKNOWN,
        completionTokens: UNKNOWN,
        totalTokens: UNKNOWN,
      },
      estimatedCost: context.estimatedCost,
    });
  }

  private incrementReport(input: {
    requestId: string;
    provider: string;
    model: string;
    latencyMs: number;
    timestampMs: number;
    countRequest: boolean;
    countFailure: boolean;
    countSafetyBlock: boolean;
    countFallback: boolean;
    countSuccess: boolean;
    tokens?: AiLlmTokenUsage;
    estimatedCost: number | 'unknown';
  }): void {
    void input.requestId;
    const day = new Date(input.timestampMs).toISOString().slice(0, 10);
    const report = this.reports.get(day) ?? this.emptyAccumulator();

    if (input.countRequest) {
      report.requests += 1;
      report.providerUsage[input.provider] =
        (report.providerUsage[input.provider] ?? 0) + 1;
      report.modelUsage[input.model] =
        (report.modelUsage[input.model] ?? 0) + 1;
    }

    if (input.countFailure) {
      report.failures += 1;
    }

    if (input.countSafetyBlock) {
      report.safetyBlocks += 1;
    }

    if (input.countFallback) {
      report.fallbacks += 1;
    }

    if (input.countSuccess || input.countFallback) {
      report.totalLatencyMs += input.latencyMs;
      report.latencies.push(input.latencyMs);
    }

    if (input.tokens) {
      report.promptTokens += this.normalizeNumericToken(
        input.tokens.promptTokens,
      );
      report.completionTokens += this.normalizeNumericToken(
        input.tokens.completionTokens,
      );
      report.totalTokens += this.normalizeNumericToken(
        input.tokens.totalTokens,
      );
    }

    if (typeof input.estimatedCost === 'number') {
      report.estimatedCost += input.estimatedCost;
    }

    report.updatedAtMs = input.timestampMs;
    this.reports.set(day, report);
    this.pruneRetentionState(input.timestampMs);
  }

  private emptyAccumulator(): UsageReportAccumulator {
    return {
      requests: 0,
      failures: 0,
      safetyBlocks: 0,
      fallbacks: 0,
      totalLatencyMs: 0,
      latencies: [],
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      providerUsage: {},
      modelUsage: {},
      updatedAtMs: Date.now(),
    };
  }

  private resolvePercentile(
    latencies: number[],
    percentile: number,
  ): number | 'unknown' {
    if (!latencies.length) {
      return 'unknown';
    }

    const sorted = [...latencies].sort((left, right) => left - right);
    const index = Math.min(
      sorted.length - 1,
      Math.ceil((percentile / 100) * sorted.length) - 1,
    );

    return sorted[index] ?? 'unknown';
  }

  private calculateEstimatedCost(usage: AiLlmTokenUsage): number | 'unknown' {
    const inputCostPer1k = this.config.getInputCostPer1k();
    const outputCostPer1k = this.config.getOutputCostPer1k();

    if (
      typeof inputCostPer1k !== 'number' ||
      typeof outputCostPer1k !== 'number' ||
      typeof usage.promptTokens !== 'number' ||
      typeof usage.completionTokens !== 'number'
    ) {
      return 'unknown';
    }

    const estimatedCost =
      (usage.promptTokens / 1000) * inputCostPer1k +
      (usage.completionTokens / 1000) * outputCostPer1k;

    return Number(estimatedCost.toFixed(6));
  }

  private enforceGuardrails(
    context: AiLlmObservabilityAttemptContext,
    usage: AiLlmTokenUsage,
    estimatedCost: number | 'unknown',
  ): void {
    const maxPromptTokens = this.config.getMaxPromptTokens();
    const maxCompletionTokens = this.config.getMaxCompletionTokens();
    const maxRequestCost = this.config.getMaxRequestCost();

    if (
      typeof maxPromptTokens === 'number' &&
      typeof usage.promptTokens === 'number' &&
      usage.promptTokens > maxPromptTokens
    ) {
      throw new LLMCostGuardrailError(
        'OpenAI prompt token usage exceeded configured limits.',
      );
    }

    if (
      typeof maxCompletionTokens === 'number' &&
      typeof usage.completionTokens === 'number' &&
      usage.completionTokens > maxCompletionTokens
    ) {
      throw new LLMCostGuardrailError(
        'OpenAI completion token usage exceeded configured limits.',
      );
    }

    if (
      typeof maxRequestCost === 'number' &&
      typeof estimatedCost === 'number' &&
      estimatedCost > maxRequestCost
    ) {
      throw new LLMCostGuardrailError(
        'OpenAI request cost exceeded configured limits.',
      );
    }
  }

  private normalizeUsage(usage?: AiLlmTokenUsage): AiLlmTokenUsage {
    return {
      promptTokens: this.normalizeTokenCount(usage?.promptTokens),
      completionTokens: this.normalizeTokenCount(usage?.completionTokens),
      totalTokens: this.normalizeTokenCount(usage?.totalTokens),
    };
  }

  private normalizeTokenCount(value: unknown): number | 'unknown' {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : 'unknown';
  }

  private normalizeNumericToken(value: number | 'unknown'): number {
    return typeof value === 'number' ? value : 0;
  }

  private updateLifecycle(
    requestId: string,
    updater: (current: StoredRequestLifecycle) => StoredRequestLifecycle,
    updatedAtMs = Date.now(),
  ): void {
    const current = this.lifecycles.get(requestId);

    if (!current) {
      return;
    }

    this.lifecycles.set(requestId, {
      ...updater(current),
      updatedAtMs,
      updatedAt: new Date(updatedAtMs).toISOString(),
    });
  }

  private resolveLifecycleDuration(
    requestId: string,
    fallbackDurationMs: number,
  ): number {
    const lifecycle = this.lifecycles.get(requestId);

    if (!lifecycle) {
      return fallbackDurationMs;
    }

    const startedAt = new Date(lifecycle.startTime).getTime();
    const durationMs = Date.now() - startedAt;

    return Number.isFinite(durationMs) && durationMs >= 0
      ? durationMs
      : fallbackDurationMs;
  }

  private pruneLifecycleRetention(now: number): void {
    const retentionMs = this.config.getObservabilityRetentionMs();
    const maxTraces = this.config.getObservabilityMaxTraces();

    for (const [requestId, lifecycle] of this.lifecycles.entries()) {
      if (now - lifecycle.updatedAtMs > retentionMs) {
        this.lifecycles.delete(requestId);
      }
    }

    if (this.lifecycles.size <= maxTraces) {
      return;
    }

    const overflow = this.lifecycles.size - maxTraces;
    const oldest = [...this.lifecycles.entries()]
      .sort((left, right) => left[1].updatedAtMs - right[1].updatedAtMs)
      .slice(0, overflow);

    for (const [requestId] of oldest) {
      this.lifecycles.delete(requestId);
    }
  }

  private pruneReportRetention(now: number): void {
    const retentionMs = this.config.getObservabilityRetentionMs();
    const maxReports = this.config.getObservabilityMaxReports();

    for (const [day, report] of this.reports.entries()) {
      if (now - report.updatedAtMs > retentionMs) {
        this.reports.delete(day);
      }
    }

    if (this.reports.size <= maxReports) {
      return;
    }

    const overflow = this.reports.size - maxReports;
    const oldest = [...this.reports.entries()]
      .sort((left, right) => left[1].updatedAtMs - right[1].updatedAtMs)
      .slice(0, overflow);

    for (const [day] of oldest) {
      this.reports.delete(day);
    }
  }

  private logStructured(event: string, payload: Record<string, unknown>): void {
    this.logger.log(
      JSON.stringify({
        event,
        ...payload,
      }),
    );
  }
}
