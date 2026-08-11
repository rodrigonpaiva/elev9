import { Injectable } from '@nestjs/common';

import type {
  CoachIntelligenceAvailability,
  CoachIntelligenceFreshness,
  CoachIntelligenceSectionName,
  CoachIntelligenceWarning,
} from '@elev9/types';

export type CoachIntelligenceTraceStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export type CoachIntelligenceTrace = Readonly<{
  requestId?: string;
  authUserId: string;
  userProfileId: string;
  status: CoachIntelligenceTraceStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  partialResult: boolean;
  fallbackUsed: boolean;
  participatingExperts: readonly string[];
  unavailableSections: readonly CoachIntelligenceSectionName[];
  degradedSections: readonly CoachIntelligenceSectionName[];
  staleSections: readonly CoachIntelligenceSectionName[];
  warningCount: number;
  availability?: CoachIntelligenceAvailability;
  freshness?: CoachIntelligenceFreshness;
  warnings: readonly CoachIntelligenceWarning[];
  metadata: Readonly<Record<string, unknown>>;
}>;

type StoredCoachIntelligenceTrace = CoachIntelligenceTrace & {
  startedAtMs: number;
  completedAtMs?: number;
};

@Injectable()
export class CoachIntelligenceObservabilityService {
  private readonly traces = new Map<string, StoredCoachIntelligenceTrace>();
  private readonly maxItems = 1000;
  private readonly retentionMs = 24 * 60 * 60 * 1000;

  startTrace(input: {
    requestId?: string;
    authUserId: string;
    userProfileId: string;
    metadata?: Readonly<Record<string, unknown>>;
  }): CoachIntelligenceTrace {
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    const trace = this.freezeTrace({
      requestId: input.requestId,
      authUserId: input.authUserId,
      userProfileId: input.userProfileId,
      status: 'RUNNING',
      startedAt,
      partialResult: false,
      fallbackUsed: false,
      participatingExperts: [],
      unavailableSections: [],
      degradedSections: [],
      staleSections: [],
      warningCount: 0,
      warnings: [],
      metadata: Object.freeze({
        ...(input.metadata ?? {}),
        startedAt,
      }),
      startedAtMs,
    });

    if (input.requestId) {
      this.traces.set(input.requestId, {
        ...trace,
        startedAtMs,
      });
      this.prune();
    }

    return trace;
  }

  completeTrace(input: {
    requestId?: string;
    trace: CoachIntelligenceTrace;
    availability: CoachIntelligenceAvailability;
    freshness: CoachIntelligenceFreshness;
    warnings: readonly CoachIntelligenceWarning[];
    participatingExperts: readonly string[];
    sections: Record<
      CoachIntelligenceSectionName,
      { status: string; fallbackUsed: boolean }
    >;
    metadata?: Readonly<Record<string, unknown>>;
  }): CoachIntelligenceTrace {
    const completedAt = new Date().toISOString();
    const stored = input.requestId
      ? this.traces.get(input.requestId)
      : undefined;
    const startedAtMs =
      stored?.startedAtMs ?? Date.parse(input.trace.startedAt);
    const completedAtMs = Date.now();
    const availabilitySections = Object.entries(input.availability.sections);
    const unavailableSections = availabilitySections
      .filter(([, availability]) => availability.status === 'unavailable')
      .map(([section]) => section as CoachIntelligenceSectionName);
    const degradedSections = availabilitySections
      .filter(([, availability]) => availability.status === 'degraded')
      .map(([section]) => section as CoachIntelligenceSectionName);
    const staleSections = availabilitySections
      .filter(([, availability]) => availability.status === 'stale')
      .map(([section]) => section as CoachIntelligenceSectionName);
    const trace = this.freezeTrace({
      ...input.trace,
      status: 'COMPLETED',
      completedAt,
      durationMs:
        Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs)
          ? Math.max(0, completedAtMs - startedAtMs)
          : undefined,
      partialResult:
        input.trace.partialResult ||
        input.availability.status !== 'available' ||
        input.warnings.length > 0,
      fallbackUsed: input.trace.fallbackUsed || input.availability.fallbackUsed,
      participatingExperts: Object.freeze([...input.participatingExperts]),
      unavailableSections: Object.freeze(unavailableSections),
      degradedSections: Object.freeze(degradedSections),
      staleSections: Object.freeze(staleSections),
      warningCount: input.warnings.length,
      availability: input.availability,
      freshness: input.freshness,
      warnings: Object.freeze([...input.warnings]),
      metadata: Object.freeze({
        ...input.trace.metadata,
        ...(input.metadata ?? {}),
        completedAt,
      }),
    });

    if (input.requestId) {
      this.traces.set(input.requestId, {
        ...trace,
        startedAtMs,
        completedAtMs,
      });
      this.prune();
    }

    return trace;
  }

  failTrace(input: {
    requestId?: string;
    trace: CoachIntelligenceTrace;
    errorCode: string;
    errorMessage: string;
    metadata?: Readonly<Record<string, unknown>>;
  }): CoachIntelligenceTrace {
    const completedAt = new Date().toISOString();
    const startedAtMs = Date.parse(input.trace.startedAt);
    const completedAtMs = Date.now();
    const trace = this.freezeTrace({
      ...input.trace,
      status: 'FAILED',
      completedAt,
      durationMs:
        Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs)
          ? Math.max(0, completedAtMs - startedAtMs)
          : undefined,
      metadata: Object.freeze({
        ...input.trace.metadata,
        ...(input.metadata ?? {}),
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
        failedAt: completedAt,
      }),
    });

    if (input.requestId) {
      this.traces.set(input.requestId, {
        ...trace,
        startedAtMs,
        completedAtMs,
      });
      this.prune();
    }

    return trace;
  }

  getTrace(requestId: string): CoachIntelligenceTrace | undefined {
    const trace = this.traces.get(requestId);

    return trace ? this.freezeTrace(trace) : undefined;
  }

  listTraces(): readonly CoachIntelligenceTrace[] {
    return Object.freeze(
      [...this.traces.values()]
        .sort((left, right) => right.startedAtMs - left.startedAtMs)
        .map((trace) => this.freezeTrace(trace)),
    );
  }

  private prune(): void {
    const now = Date.now();

    for (const [requestId, trace] of this.traces.entries()) {
      if (now - trace.startedAtMs > this.retentionMs) {
        this.traces.delete(requestId);
      }
    }

    if (this.traces.size <= this.maxItems) {
      return;
    }

    const ordered = [...this.traces.entries()].sort(
      (left, right) => left[1].startedAtMs - right[1].startedAtMs,
    );

    for (const [requestId] of ordered.slice(
      0,
      this.traces.size - this.maxItems,
    )) {
      this.traces.delete(requestId);
    }
  }

  private freezeTrace(
    trace: CoachIntelligenceTrace & Partial<StoredCoachIntelligenceTrace>,
  ): CoachIntelligenceTrace {
    return Object.freeze({
      requestId: trace.requestId,
      authUserId: trace.authUserId,
      userProfileId: trace.userProfileId,
      status: trace.status,
      startedAt: trace.startedAt,
      ...(trace.completedAt ? { completedAt: trace.completedAt } : {}),
      ...(trace.durationMs !== undefined
        ? { durationMs: trace.durationMs }
        : {}),
      partialResult: trace.partialResult,
      fallbackUsed: trace.fallbackUsed,
      participatingExperts: Object.freeze([...trace.participatingExperts]),
      unavailableSections: Object.freeze([...trace.unavailableSections]),
      degradedSections: Object.freeze([...trace.degradedSections]),
      staleSections: Object.freeze([...trace.staleSections]),
      warningCount: trace.warningCount,
      ...(trace.availability ? { availability: trace.availability } : {}),
      ...(trace.freshness ? { freshness: trace.freshness } : {}),
      warnings: Object.freeze([...trace.warnings]),
      metadata: Object.freeze({ ...trace.metadata }),
    });
  }
}
