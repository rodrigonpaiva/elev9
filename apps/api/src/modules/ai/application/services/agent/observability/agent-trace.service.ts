import { Injectable } from '@nestjs/common';

import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { hashSensitiveIdentifier } from '../../../../../../common/security/redaction';
import type { AgentContextDomain, AgentIntent } from '../agent.types';
import type { AgentExecutionStrategy } from '../planning/agent-planning.types';
import type {
  AgentTrace,
  AgentTraceEvent,
  AgentTraceMetrics,
  AgentTraceStartInput,
} from './agent-trace.types';
import type { AgentTraceExecutionSnapshot } from './agent-trace.types';
import type { AgentTraceMemorySnapshot } from './agent-trace.types';
import type { AgentTracePolicySnapshot } from './agent-trace.types';
import type { AgentTraceSummary } from './agent-trace.types';
import type { AgentTraceToolResultSummary } from './agent-trace.types';
import type { AgentTraceToolSnapshot } from './agent-trace.types';

type StoredTrace = AgentTrace & {
  createdAtMs: number;
  updatedAtMs: number;
};

const DEFAULT_METRICS: AgentTraceMetrics = Object.freeze({
  totalDurationMs: 0,
  planningDurationMs: 0,
  contextOrchestrationDurationMs: 0,
  executionDurationMs: 0,
  toolExecutionDurationMs: 0,
  memoryDurationMs: 0,
  llmDurationMs: 0,
  selectedDomainCount: 0,
  candidateExpertCount: 0,
  selectedExpertCount: 0,
  rejectedExpertCount: 0,
  candidateToolCount: 0,
  selectedToolCount: 0,
  executedToolCount: 0,
  skippedToolCount: 0,
  failedToolCount: 0,
  policyViolationCount: 0,
  fallbackCount: 0,
});

@Injectable()
export class AgentTraceService {
  private readonly traces = new Map<string, StoredTrace>();

  constructor(private readonly config: AgentRuntimeConfigService) {}

  startTrace(input: AgentTraceStartInput): AgentTrace {
    const now = Date.now();
    this.pruneRetentionState(now);

    const requestId = input.request.sessionMetadata.requestId;
    const trace = this.buildTrace({
      traceId: requestId,
      requestId,
      conversationId: hashSensitiveIdentifier(input.request.conversationId),
      userIdHash: input.request.sessionMetadata.userIdHash,
      requestTimestamp: input.requestTimestamp,
      runtimeEnabled: input.runtimeEnabled,
      toolsEnabled: input.toolsEnabled,
      status: 'RUNNING',
      fallbackUsed: false,
      createdAt: input.requestTimestamp,
      updatedAt: input.requestTimestamp,
      summary: {
        traceId: requestId,
        requestId,
        conversationId: hashSensitiveIdentifier(input.request.conversationId),
        userIdHash: input.request.sessionMetadata.userIdHash,
        requestTimestamp: input.requestTimestamp,
        runtimeEnabled: input.runtimeEnabled,
        toolsEnabled: input.toolsEnabled,
        selectedDomains: [],
        candidateExpertIds: [],
        selectedExpertIds: [],
        rejectedExpertIds: [],
        complementaryExpertIds: [],
        orderedExpertIds: [],
        blockedExpertIds: [],
        skippedExpertIds: [],
        candidateToolIds: [],
        selectedToolIds: [],
        fallbackUsed: false,
        status: 'RUNNING',
      },
      metrics: DEFAULT_METRICS,
      events: [
        {
          event: 'AGENT_STARTED',
          timestamp: input.requestTimestamp,
          summary: 'Started agent execution trace.',
          metadata: {
            runtimeEnabled: input.runtimeEnabled,
            toolsEnabled: input.toolsEnabled,
            promptVersion: input.request.promptVersion,
          },
        },
      ],
    });

    this.traces.set(requestId, {
      ...trace,
      createdAtMs: now,
      updatedAtMs: now,
    });

    return this.freezeTrace(trace);
  }

  recordEvent(traceId: string, event: AgentTraceEvent): AgentTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const current = this.traces.get(traceId);

    if (!current) {
      return undefined;
    }

    const eventUpdate = this.applyEventUpdate(current, event);
    const next = this.updateStoredTrace(current, {
      ...eventUpdate,
      events: [...current.events, this.freezeValue(event)],
    });

    this.traces.set(traceId, next);
    return this.freezeTrace(next);
  }

  recordPolicySnapshot(
    traceId: string,
    snapshot: AgentTracePolicySnapshot,
  ): AgentTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const current = this.traces.get(traceId);

    if (!current) {
      return undefined;
    }

    const candidateExpertIds = snapshot.candidateExpertIds ?? [];
    const selectedExpertIds = snapshot.selectedExpertIds ?? [];
    const blockedExpertIds = snapshot.blockedExpertIds ?? [];
    const allowedExpertIds = snapshot.allowedExpertIds ?? [];
    const violations = snapshot.violations ?? [];
    const allowedDomains = snapshot.allowedDomains ?? [];
    const allowedTools = snapshot.allowedTools ?? [];

    const nextMetrics = this.mergeMetrics(current.metrics, {
      policyViolationCount: violations.length,
      candidateExpertCount: candidateExpertIds.length,
      selectedExpertCount: selectedExpertIds.length,
      rejectedExpertCount: blockedExpertIds.length,
    });
    const next = this.updateStoredTrace(current, {
      policySnapshot: this.freezeValue(snapshot),
      metrics: nextMetrics,
      detectedIntent:
        current.detectedIntent ?? this.resolveIntentFromPolicy(snapshot),
      selectedDomains:
        allowedDomains.length > 0 ? allowedDomains : current.selectedDomains,
      expertSelectionReason: snapshot.reason ?? current.expertSelectionReason,
      candidateExpertIds:
        candidateExpertIds.length > 0
          ? candidateExpertIds
          : current.candidateExpertIds,
      selectedExpertIds:
        selectedExpertIds.length > 0
          ? selectedExpertIds
          : current.selectedExpertIds,
      rejectedExpertIds:
        blockedExpertIds.length > 0
          ? blockedExpertIds
          : current.rejectedExpertIds,
      candidateToolIds: current.candidateToolIds,
      selectedToolIds: current.selectedToolIds,
      executionStrategy: current.executionStrategy,
      updatedAt: new Date(now).toISOString(),
      events: [
        ...current.events,
        {
          event: 'POLICY_EVALUATED',
          timestamp: new Date(now).toISOString(),
          summary: `Evaluated policy stage ${snapshot.stage}.`,
          metadata: {
            stage: snapshot.stage,
            approved: snapshot.approved,
            blocked: snapshot.blocked,
            fallbackRequired: snapshot.fallbackRequired,
            allowedDomainCount: allowedDomains.length,
            allowedToolCount: allowedTools.length,
            allowedExpertCount: allowedExpertIds.length,
            violationCount: violations.length,
          },
        },
      ],
    });

    this.traces.set(traceId, next);
    return this.freezeTrace(next);
  }

  recordToolSnapshot(
    traceId: string,
    snapshot: AgentTraceToolSnapshot,
  ): AgentTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const current = this.traces.get(traceId);

    if (!current) {
      return undefined;
    }

    const nextMetrics = this.mergeMetrics(current.metrics, {
      candidateToolCount: snapshot.candidateToolIds.length,
      selectedToolCount: snapshot.selectedToolIds.length,
      executedToolCount: snapshot.executedToolIds.length,
      skippedToolCount: snapshot.skippedToolIds.length,
      failedToolCount: snapshot.failedToolIds.length,
      toolExecutionDurationMs: snapshot.metrics.totalDurationMs,
    });
    const next = this.updateStoredTrace(current, {
      toolSnapshot: this.freezeValue(snapshot),
      candidateToolIds: snapshot.candidateToolIds,
      selectedToolIds: snapshot.selectedToolIds,
      metrics: nextMetrics,
      updatedAt: new Date(now).toISOString(),
    });

    this.traces.set(traceId, next);
    return this.freezeTrace(next);
  }

  recordMemorySnapshot(
    traceId: string,
    snapshot: AgentTraceMemorySnapshot,
  ): AgentTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const current = this.traces.get(traceId);

    if (!current) {
      return undefined;
    }

    const next = this.updateStoredTrace(current, {
      memorySnapshot: this.freezeValue(snapshot),
      metrics: this.mergeMetrics(current.metrics, {
        memoryDurationMs: current.metrics.memoryDurationMs,
      }),
      updatedAt: new Date(now).toISOString(),
      events: [
        ...current.events,
        {
          event: 'MEMORY_SNAPSHOT_CREATED',
          timestamp: new Date(now).toISOString(),
          summary: 'Captured an internal memory snapshot.',
          metadata: {
            workingMemorySize: snapshot.metadata.workingMemorySize,
            sessionMemorySize: snapshot.metadata.sessionMemorySize,
            conversationMemorySize: snapshot.metadata.conversationMemorySize,
            snapshotCreated: snapshot.metadata.snapshotCreated,
            expired: snapshot.metadata.expired,
          },
        },
      ],
    });

    this.traces.set(traceId, next);
    return this.freezeTrace(next);
  }

  recordExecutionSnapshot(
    traceId: string,
    snapshot: AgentTraceExecutionSnapshot,
  ): AgentTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const current = this.traces.get(traceId);

    if (!current) {
      return undefined;
    }

    const nextMetrics = this.mergeMetrics(current.metrics, {
      executionDurationMs: snapshot.executionDurationMs,
      selectedToolCount:
        snapshot.toolExecutionMetrics?.selectedToolCount ??
        current.metrics.selectedToolCount,
      executedToolCount:
        snapshot.toolExecutionMetrics?.executedToolCount ??
        current.metrics.executedToolCount,
      skippedToolCount:
        snapshot.toolExecutionMetrics?.skippedToolCount ??
        current.metrics.skippedToolCount,
      failedToolCount:
        snapshot.toolExecutionMetrics?.failedToolCount ??
        current.metrics.failedToolCount,
      totalDurationMs: snapshot.executionDurationMs,
      fallbackCount:
        current.fallbackUsed || snapshot.fallbackUsed
          ? current.metrics.fallbackCount
          : snapshot.fallbackUsed
            ? current.metrics.fallbackCount + 1
            : current.metrics.fallbackCount,
    });
    const next = this.updateStoredTrace(current, {
      executionSnapshot: this.freezeValue(snapshot),
      executionStrategy: snapshot.strategy,
      fallbackUsed: current.fallbackUsed || snapshot.fallbackUsed,
      metrics: nextMetrics,
      durationMs: snapshot.executionDurationMs,
      updatedAt: new Date(now).toISOString(),
    });

    this.traces.set(traceId, next);
    return this.freezeTrace(next);
  }

  completeTrace(
    traceId: string,
    input?: {
      durationMs?: number;
      status?: AgentTrace['status'];
      fallbackUsed?: boolean;
      summary?: Partial<AgentTraceSummary>;
    },
  ): AgentTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const current = this.traces.get(traceId);

    if (!current) {
      return undefined;
    }

    const durationMs =
      input?.durationMs ?? current.durationMs ?? now - current.createdAtMs;
    const status = input?.status ?? 'COMPLETED';
    const fallbackUsed = input?.fallbackUsed ?? current.fallbackUsed;
    const next = this.updateStoredTrace(current, {
      durationMs,
      fallbackUsed,
      status,
      completedAt: new Date(now).toISOString(),
      summary: {
        ...current.summary,
        ...(input?.summary ?? {}),
        durationMs,
        fallbackUsed,
        status,
      },
      metrics: this.mergeMetrics(current.metrics, {
        totalDurationMs: durationMs,
      }),
      updatedAt: new Date(now).toISOString(),
      events: [
        ...current.events,
        {
          event:
            status === 'ABORTED' || status === 'FAILED'
              ? 'AGENT_ABORTED'
              : 'AGENT_COMPLETED',
          timestamp: new Date(now).toISOString(),
          summary:
            status === 'ABORTED' || status === 'FAILED'
              ? 'Agent execution aborted.'
              : 'Agent execution completed.',
          metadata: {
            durationMs,
            fallbackUsed,
          },
        },
      ],
    });

    this.traces.set(traceId, next);
    return this.freezeTrace(next);
  }

  abortTrace(
    traceId: string,
    input?: { reason?: string; durationMs?: number },
  ): AgentTrace | undefined {
    const current = this.traces.get(traceId);

    if (!current) {
      return undefined;
    }

    const now = Date.now();
    const durationMs =
      input?.durationMs ?? current.durationMs ?? now - current.createdAtMs;
    const next = this.updateStoredTrace(current, {
      durationMs,
      status: 'ABORTED',
      summary: {
        ...current.summary,
        durationMs,
        status: 'ABORTED',
      },
      metrics: this.mergeMetrics(current.metrics, {
        totalDurationMs: durationMs,
      }),
      updatedAt: new Date(now).toISOString(),
      events: [
        ...current.events,
        {
          event: 'AGENT_ABORTED',
          timestamp: new Date(now).toISOString(),
          summary: input?.reason ?? 'Agent execution aborted.',
          metadata: {
            durationMs,
            reason: input?.reason,
          },
        },
      ],
    });

    this.traces.set(traceId, next);
    return this.freezeTrace(next);
  }

  getTrace(traceId: string): AgentTrace | undefined {
    const now = Date.now();
    this.pruneRetentionState(now);
    const trace = this.traces.get(traceId);

    return trace ? this.freezeTrace(trace) : undefined;
  }

  listTraces(): readonly AgentTrace[] {
    const now = Date.now();
    this.pruneRetentionState(now);

    return Object.freeze(
      [...this.traces.values()]
        .sort((left, right) => left.createdAtMs - right.createdAtMs)
        .map((trace) => this.freezeTrace(trace)),
    );
  }

  getSummaries(): readonly AgentTraceSummary[] {
    return this.listTraces().map((trace) => trace.summary);
  }

  private pruneRetentionState(now = Date.now()): void {
    const retentionMs = this.config.getTraceRetentionMs();
    const maxItems = this.config.getTraceMaxItems();

    for (const [traceId, trace] of this.traces.entries()) {
      const ageMs = now - trace.createdAtMs;

      if (ageMs > retentionMs) {
        this.traces.delete(traceId);
      }
    }

    if (this.traces.size <= maxItems) {
      return;
    }

    const overflow = this.traces.size - maxItems;
    const sorted = [...this.traces.entries()].sort(
      (left, right) => left[1].createdAtMs - right[1].createdAtMs,
    );

    for (const [traceId] of sorted.slice(0, overflow)) {
      this.traces.delete(traceId);
    }
  }

  private buildTrace(input: {
    traceId: string;
    requestId: string;
    conversationId: string;
    userIdHash: string;
    requestTimestamp: string;
    runtimeEnabled: boolean;
    toolsEnabled: boolean;
    status: AgentTrace['status'];
    fallbackUsed: boolean;
    createdAt: string;
    updatedAt: string;
    summary: AgentTraceSummary;
    metrics: AgentTraceMetrics;
    events: readonly AgentTraceEvent[];
  }): AgentTrace {
    return {
      traceId: input.traceId,
      requestId: input.requestId,
      conversationId: hashSensitiveIdentifier(input.conversationId),
      userIdHash: input.userIdHash,
      requestTimestamp: input.requestTimestamp,
      runtimeEnabled: input.runtimeEnabled,
      toolsEnabled: input.toolsEnabled,
      detectedIntent: undefined,
      selectedDomains: [],
      candidateExpertIds: [],
      selectedExpertIds: [],
      rejectedExpertIds: [],
      complementaryExpertIds: [],
      orderedExpertIds: [],
      blockedExpertIds: [],
      skippedExpertIds: [],
      candidateToolIds: [],
      selectedToolIds: [],
      executionStrategy: undefined,
      fallbackUsed: input.fallbackUsed,
      durationMs: undefined,
      status: input.status,
      summary: this.freezeValue(input.summary),
      metrics: this.freezeValue(input.metrics),
      events: this.freezeValue(input.events),
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
  }

  private updateStoredTrace(
    current: StoredTrace,
    partial: Partial<AgentTrace> & {
      summary?: Partial<AgentTraceSummary>;
      metrics?: AgentTraceMetrics;
      events?: readonly AgentTraceEvent[];
    },
  ): StoredTrace {
    const updatedAt = partial.updatedAt ?? new Date().toISOString();
    const next: StoredTrace = {
      ...current,
      ...partial,
      summary: this.freezeValue({
        ...current.summary,
        ...(partial.summary ?? {}),
      }),
      metrics: this.freezeValue(partial.metrics ?? current.metrics),
      events: this.freezeValue(partial.events ?? current.events),
      createdAt: current.createdAt,
      updatedAt,
      createdAtMs: current.createdAtMs,
      updatedAtMs: Date.parse(updatedAt),
    };

    return next;
  }

  private applyEventUpdate(
    current: StoredTrace,
    event: AgentTraceEvent,
  ): Partial<AgentTrace> {
    const baseUpdate: Partial<AgentTrace> = {};

    if (event.event === 'INTENT_CLASSIFIED') {
      const detectedIntent = this.readStringEnum<AgentIntent>(
        event.metadata?.intent,
      );

      if (detectedIntent) {
        baseUpdate.detectedIntent = detectedIntent;
      }
    }

    if (event.event === 'CONTEXT_SELECTED') {
      const selectedDomains = this.readStringArray<AgentContextDomain>(
        event.metadata?.selectedDomains,
      );
      const orchestrationDurationMs = this.readNumber(
        event.metadata?.orchestrationDurationMs,
      );

      if (selectedDomains.length > 0) {
        baseUpdate.selectedDomains = selectedDomains;
      }

      if (typeof orchestrationDurationMs === 'number') {
        baseUpdate.metrics = this.mergeMetrics(current.metrics, {
          contextOrchestrationDurationMs: orchestrationDurationMs,
          selectedDomainCount: selectedDomains.length,
        });
      }
    }

    if (event.event === 'PLAN_CREATED' || event.event === 'PLAN_VALIDATED') {
      const selectedDomains = this.readStringArray<AgentContextDomain>(
        event.metadata?.selectedDomains,
      );
      const candidateExpertIds = this.readStringArray(
        event.metadata?.candidateExpertIds,
      );
      const selectedExpertIds = this.readStringArray(
        event.metadata?.selectedExpertIds,
      );
      const rejectedExpertIds = this.readStringArray(
        event.metadata?.rejectedExpertIds,
      );
      const candidateToolIds = this.readStringArray(
        event.metadata?.candidateToolIds,
      );
      const selectedToolIds = this.readStringArray(
        event.metadata?.selectedToolIds,
      );
      const executionStrategy = this.readStringEnum<AgentExecutionStrategy>(
        event.metadata?.executionStrategy,
      );
      const expertSelectionReason = this.readString(
        event.metadata?.expertSelectionReason,
      );

      if (candidateExpertIds.length > 0) {
        baseUpdate.candidateExpertIds = candidateExpertIds;
      }

      if (selectedExpertIds.length > 0) {
        baseUpdate.selectedExpertIds = selectedExpertIds;
      }

      if (rejectedExpertIds.length > 0) {
        baseUpdate.rejectedExpertIds = rejectedExpertIds;
      }

      if (candidateToolIds.length > 0) {
        baseUpdate.candidateToolIds = candidateToolIds;
      }

      if (selectedDomains.length > 0) {
        baseUpdate.selectedDomains = selectedDomains;
      }

      if (selectedToolIds.length > 0) {
        baseUpdate.selectedToolIds = selectedToolIds;
      }

      if (executionStrategy) {
        baseUpdate.executionStrategy = executionStrategy;
      }

      if (expertSelectionReason) {
        baseUpdate.summary = {
          ...current.summary,
          expertSelectionReason,
        };
      }

      const planningDurationMs = this.readNumber(
        event.metadata?.planningDurationMs,
      );

      if (typeof planningDurationMs === 'number') {
        baseUpdate.metrics = this.mergeMetrics(
          baseUpdate.metrics ?? current.metrics,
          {
            planningDurationMs,
            selectedDomainCount:
              selectedDomains.length > 0
                ? selectedDomains.length
                : current.metrics.selectedDomainCount,
            candidateToolCount:
              candidateToolIds.length > 0
                ? candidateToolIds.length
                : current.metrics.candidateToolCount,
            selectedToolCount:
              selectedToolIds.length > 0
                ? selectedToolIds.length
                : current.metrics.selectedToolCount,
            candidateExpertCount:
              candidateExpertIds.length > 0
                ? candidateExpertIds.length
                : current.metrics.candidateExpertCount,
            selectedExpertCount:
              selectedExpertIds.length > 0
                ? selectedExpertIds.length
                : current.metrics.selectedExpertCount,
            rejectedExpertCount:
              rejectedExpertIds.length > 0
                ? rejectedExpertIds.length
                : current.metrics.rejectedExpertCount,
          },
        );
      }
    }

    if (event.event === 'FALLBACK_USED') {
      baseUpdate.fallbackUsed = true;
      baseUpdate.metrics = this.mergeMetrics(current.metrics, {
        fallbackCount: current.metrics.fallbackCount + 1,
      });
    }

    if (event.event === 'TOOL_SELECTED') {
      const candidateToolIds = this.readStringArray(
        event.metadata?.candidateToolIds,
      );
      const selectedToolIds = this.readStringArray(
        event.metadata?.selectedToolIds,
      );

      if (candidateToolIds.length > 0 || selectedToolIds.length > 0) {
        baseUpdate.metrics = this.mergeMetrics(
          baseUpdate.metrics ?? current.metrics,
          {
            candidateToolCount:
              candidateToolIds.length > 0
                ? candidateToolIds.length
                : current.metrics.candidateToolCount,
            selectedToolCount:
              selectedToolIds.length > 0
                ? selectedToolIds.length
                : current.metrics.selectedToolCount,
          },
        );
      }
    }

    if (event.event === 'TOOL_EXECUTED') {
      const durationMs = this.readNumber(event.metadata?.durationMs);
      const status = this.readStringEnum<AgentTraceToolResultSummary['status']>(
        event.metadata?.status,
      );

      baseUpdate.metrics = this.mergeMetrics(
        baseUpdate.metrics ?? current.metrics,
        {
          executedToolCount: current.metrics.executedToolCount + 1,
          toolExecutionDurationMs:
            typeof durationMs === 'number'
              ? current.metrics.toolExecutionDurationMs + durationMs
              : current.metrics.toolExecutionDurationMs,
          failedToolCount:
            status && status !== 'SUCCESS'
              ? current.metrics.failedToolCount + 1
              : current.metrics.failedToolCount,
        },
      );
    }

    if (event.event === 'TOOL_SKIPPED') {
      baseUpdate.metrics = this.mergeMetrics(
        baseUpdate.metrics ?? current.metrics,
        {
          skippedToolCount: current.metrics.skippedToolCount + 1,
        },
      );
    }

    if (event.event === 'MEMORY_SNAPSHOT_CREATED') {
      const memoryDurationMs = this.readNumber(event.metadata?.durationMs);

      if (typeof memoryDurationMs === 'number') {
        baseUpdate.metrics = this.mergeMetrics(
          baseUpdate.metrics ?? current.metrics,
          {
            memoryDurationMs,
          },
        );
      }
    }

    if (event.event === 'LLM_CALLED') {
      const llmDurationMs = this.readNumber(event.metadata?.durationMs);

      if (typeof llmDurationMs === 'number') {
        baseUpdate.metrics = this.mergeMetrics(current.metrics, {
          llmDurationMs,
        });
      }
    }

    if (event.event === 'AGENT_COMPLETED') {
      const durationMs = this.readNumber(event.metadata?.durationMs);

      if (typeof durationMs === 'number') {
        baseUpdate.durationMs = durationMs;
        baseUpdate.metrics = this.mergeMetrics(current.metrics, {
          totalDurationMs: durationMs,
        });
      }
      baseUpdate.status = 'COMPLETED';
    }

    if (event.event === 'AGENT_ABORTED') {
      const durationMs = this.readNumber(event.metadata?.durationMs);

      if (typeof durationMs === 'number') {
        baseUpdate.durationMs = durationMs;
        baseUpdate.metrics = this.mergeMetrics(current.metrics, {
          totalDurationMs: durationMs,
        });
      }
      baseUpdate.status = 'ABORTED';
    }

    return baseUpdate;
  }

  private mergeMetrics(
    current: AgentTraceMetrics,
    partial: Partial<AgentTraceMetrics>,
  ): AgentTraceMetrics {
    return this.freezeValue({
      ...current,
      ...partial,
    });
  }

  private readStringArray<T extends string>(value: unknown): T[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((entry): entry is T => typeof entry === 'string');
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private readStringEnum<T extends string>(value: unknown): T | undefined {
    return typeof value === 'string' ? (value as T) : undefined;
  }

  private readNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private resolveIntentFromPolicy(
    snapshot: AgentTracePolicySnapshot,
  ): AgentIntent | undefined {
    if (snapshot.allowedDomains.includes('training')) {
      return 'TRAINING';
    }

    if (snapshot.allowedDomains.includes('nutrition')) {
      return 'NUTRITION';
    }

    if (snapshot.allowedDomains.includes('recovery')) {
      return 'RECOVERY';
    }

    return undefined;
  }

  private freezeTrace(trace: AgentTrace): AgentTrace {
    return this.freezeValue({
      ...trace,
      selectedDomains: [...trace.selectedDomains],
      candidateToolIds: [...trace.candidateToolIds],
      selectedToolIds: [...trace.selectedToolIds],
      summary: this.freezeValue({
        ...trace.summary,
        selectedDomains: [...trace.summary.selectedDomains],
        candidateToolIds: [...trace.summary.candidateToolIds],
        selectedToolIds: [...trace.summary.selectedToolIds],
      }),
      metrics: this.freezeValue({ ...trace.metrics }),
      events: trace.events.map((event) => this.freezeValue({ ...event })),
      policySnapshot: trace.policySnapshot
        ? this.freezeValue({
            ...trace.policySnapshot,
            allowedDomains: [...trace.policySnapshot.allowedDomains],
            blockedDomains: [...trace.policySnapshot.blockedDomains],
            allowedTools: [...trace.policySnapshot.allowedTools],
            blockedTools: [...trace.policySnapshot.blockedTools],
            violations: trace.policySnapshot.violations.map((violation) =>
              this.freezeValue({ ...violation }),
            ),
            actions: [...trace.policySnapshot.actions],
            policyEvaluation: this.freezeValue({
              ...trace.policySnapshot.policyEvaluation,
              decision: this.freezeValue({
                ...trace.policySnapshot.policyEvaluation.decision,
                allowedTools:
                  trace.policySnapshot.policyEvaluation.decision.allowedTools.map(
                    (tool) =>
                      this.freezeValue({
                        ...tool,
                        supportedIntents: [...tool.supportedIntents],
                        supportedContextDomains: [
                          ...tool.supportedContextDomains,
                        ],
                        metadata: this.freezeValue({
                          ...tool.metadata,
                          capabilities: [...tool.metadata.capabilities],
                        }),
                      }),
                  ),
                allowedDomains: [
                  ...trace.policySnapshot.policyEvaluation.decision
                    .allowedDomains,
                ],
                metadata: this.freezeValue({
                  ...trace.policySnapshot.policyEvaluation.decision.metadata,
                  evaluatedPolicyIds: [
                    ...trace.policySnapshot.policyEvaluation.decision.metadata
                      .evaluatedPolicyIds,
                  ],
                  rejectedPolicyIds: [
                    ...trace.policySnapshot.policyEvaluation.decision.metadata
                      .rejectedPolicyIds,
                  ],
                  blockedDomainIds: [
                    ...trace.policySnapshot.policyEvaluation.decision.metadata
                      .blockedDomainIds,
                  ],
                  blockedToolIds: [
                    ...trace.policySnapshot.policyEvaluation.decision.metadata
                      .blockedToolIds,
                  ],
                }),
              }),
              violations: trace.policySnapshot.policyEvaluation.violations.map(
                (violation) => this.freezeValue({ ...violation }),
              ),
              actions: [...trace.policySnapshot.policyEvaluation.actions],
            }),
          })
        : undefined,
      toolSnapshot: trace.toolSnapshot
        ? this.freezeValue({
            ...trace.toolSnapshot,
            candidateToolIds: [...trace.toolSnapshot.candidateToolIds],
            selectedToolIds: [...trace.toolSnapshot.selectedToolIds],
            executedToolIds: [...trace.toolSnapshot.executedToolIds],
            skippedToolIds: [...trace.toolSnapshot.skippedToolIds],
            failedToolIds: [...trace.toolSnapshot.failedToolIds],
            timeoutToolIds: [...trace.toolSnapshot.timeoutToolIds],
            results: trace.toolSnapshot.results.map((result) =>
              this.freezeValue({ ...result }),
            ),
            metrics: this.freezeValue({
              ...trace.toolSnapshot.metrics,
              selectedToolIds: [...trace.toolSnapshot.metrics.selectedToolIds],
              executedToolIds: [...trace.toolSnapshot.metrics.executedToolIds],
              skippedToolIds: [...trace.toolSnapshot.metrics.skippedToolIds],
              failedToolIds: [...trace.toolSnapshot.metrics.failedToolIds],
              timeoutToolIds: [...trace.toolSnapshot.metrics.timeoutToolIds],
              perToolDurationMs:
                trace.toolSnapshot.metrics.perToolDurationMs.map((entry) =>
                  this.freezeValue({ ...entry }),
                ),
            }),
          })
        : undefined,
      memorySnapshot: trace.memorySnapshot
        ? this.freezeValue({
            metadata: this.freezeValue({
              ...trace.memorySnapshot.metadata,
              lifecycleEvents:
                trace.memorySnapshot.metadata.lifecycleEvents.map((event) =>
                  this.freezeValue({ ...event }),
                ),
            }),
          })
        : undefined,
      executionSnapshot: trace.executionSnapshot
        ? this.freezeValue({
            ...trace.executionSnapshot,
            steps: trace.executionSnapshot.steps.map((step) =>
              this.freezeValue({
                ...step,
                metadata: step.metadata
                  ? this.freezeValue({ ...step.metadata })
                  : undefined,
              }),
            ),
            lifecycleEvents: trace.executionSnapshot.lifecycleEvents.map(
              (event) =>
                this.freezeValue({
                  ...event,
                  metadata: event.metadata
                    ? this.freezeValue({ ...event.metadata })
                    : undefined,
                }),
            ),
            toolExecutionMetrics: trace.executionSnapshot.toolExecutionMetrics
              ? this.freezeValue({
                  ...trace.executionSnapshot.toolExecutionMetrics,
                  selectedToolIds: [
                    ...trace.executionSnapshot.toolExecutionMetrics
                      .selectedToolIds,
                  ],
                  executedToolIds: [
                    ...trace.executionSnapshot.toolExecutionMetrics
                      .executedToolIds,
                  ],
                  skippedToolIds: [
                    ...trace.executionSnapshot.toolExecutionMetrics
                      .skippedToolIds,
                  ],
                  failedToolIds: [
                    ...trace.executionSnapshot.toolExecutionMetrics
                      .failedToolIds,
                  ],
                  timeoutToolIds: [
                    ...trace.executionSnapshot.toolExecutionMetrics
                      .timeoutToolIds,
                  ],
                  perToolDurationMs:
                    trace.executionSnapshot.toolExecutionMetrics.perToolDurationMs.map(
                      (entry) => this.freezeValue({ ...entry }),
                    ),
                })
              : undefined,
          })
        : undefined,
    });
  }

  private freezeValue<T>(value: T): Readonly<T> {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      const frozen = value.map((item) => this.freezeValue(item));

      return Object.freeze(frozen) as unknown as Readonly<T>;
    }

    const frozenObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      frozenObject[key] = this.freezeValue(nestedValue);
    }

    return Object.freeze(frozenObject) as Readonly<T>;
  }
}
