import { Injectable, Logger } from '@nestjs/common';

import type {
  NutritionAvailability,
  NutritionFreshness,
} from '@elev9/types';

export type NutritionTelemetryOutcome =
  | 'success'
  | 'partial_success'
  | 'failure'
  | 'cancelled'
  | 'unauthorized'
  | 'forbidden'
  | 'invalid_contract';

export type NutritionTelemetryEvent = Readonly<{
  event: string;
  domain: 'nutrition';
  operation: string;
  outcome: NutritionTelemetryOutcome;
  availability?: NutritionAvailability;
  freshness?: NutritionFreshness;
  contractVersion: 'nutrition-read-model-v1';
  durationBucket?: NutritionDurationBucket;
  safeErrorCode?: NutritionSafeErrorCode;
  partialResult?: boolean;
  legacyMappingUsed?: boolean;
}>;

export type NutritionDurationBucket =
  | 'under_50_ms'
  | '50_100_ms'
  | '100_250_ms'
  | '250_500_ms'
  | '500_1000_ms'
  | 'over_1000_ms';

export type NutritionSafeErrorCode =
  | 'NUTRITION_PROFILE_NOT_CONFIGURED'
  | 'NUTRITION_PLAN_NOT_AVAILABLE'
  | 'NUTRITION_DATA_INSUFFICIENT'
  | 'NUTRITION_PROCESSING_FAILED'
  | 'NUTRITION_CONTRACT_INVALID'
  | 'NUTRITION_CONTEXT_UNAVAILABLE'
  | 'NUTRITION_TIMEOUT'
  | 'NUTRITION_UNAUTHORIZED'
  | 'NUTRITION_FORBIDDEN'
  | 'NUTRITION_UNKNOWN_ERROR';

export type NutritionMetricSnapshot = Readonly<Record<string, number>>;

const SAFE_EVENT_KEYS = new Set([
  'event',
  'domain',
  'operation',
  'outcome',
  'availability',
  'freshness',
  'contractVersion',
  'durationBucket',
  'safeErrorCode',
  'partialResult',
  'legacyMappingUsed',
]);

export function toNutritionDurationBucket(
  durationMs: number,
): NutritionDurationBucket {
  if (!Number.isFinite(durationMs) || durationMs < 50) return 'under_50_ms';
  if (durationMs < 100) return '50_100_ms';
  if (durationMs < 250) return '100_250_ms';
  if (durationMs < 500) return '250_500_ms';
  if (durationMs < 1000) return '500_1000_ms';
  return 'over_1000_ms';
}

export function buildNutritionTelemetryEvent(input: {
  event: string;
  operation: string;
  outcome: NutritionTelemetryOutcome;
  availability?: NutritionAvailability;
  freshness?: NutritionFreshness;
  durationMs?: number;
  safeErrorCode?: NutritionSafeErrorCode;
  partialResult?: boolean;
  legacyMappingUsed?: boolean;
}): NutritionTelemetryEvent {
  const event: NutritionTelemetryEvent = {
    event: input.event,
    domain: 'nutrition',
    operation: input.operation,
    outcome: input.outcome,
    contractVersion: 'nutrition-read-model-v1',
    ...(input.availability ? { availability: input.availability } : {}),
    ...(input.freshness ? { freshness: input.freshness } : {}),
    ...(input.durationMs !== undefined
      ? { durationBucket: toNutritionDurationBucket(input.durationMs) }
      : {}),
    ...(input.safeErrorCode ? { safeErrorCode: input.safeErrorCode } : {}),
    ...(input.partialResult !== undefined
      ? { partialResult: input.partialResult }
      : {}),
    ...(input.legacyMappingUsed !== undefined
      ? { legacyMappingUsed: input.legacyMappingUsed }
      : {}),
  };

  if (!Object.keys(event).every((key) => SAFE_EVENT_KEYS.has(key))) {
    throw new Error('Invalid Nutrition telemetry event.');
  }

  return Object.freeze(event);
}

@Injectable()
export class NutritionObservabilityService {
  private readonly logger = new Logger(NutritionObservabilityService.name);
  private readonly counters = new Map<string, number>();

  recordTodayRead(input: {
    outcome: NutritionTelemetryOutcome;
    availability?: NutritionAvailability;
    freshness?: NutritionFreshness;
    durationMs?: number;
    safeErrorCode?: NutritionSafeErrorCode;
    partialResult?: boolean;
    legacyMappingUsed?: boolean;
  }): void {
    this.record(
      buildNutritionTelemetryEvent({
        ...input,
        event: `nutrition_today_load_${input.outcome}`,
        operation: 'get_today_nutrition',
      }),
    );
  }

  recordCoachContext(input: {
    outcome: NutritionTelemetryOutcome;
    availability?: NutritionAvailability;
    freshness?: NutritionFreshness;
    safeErrorCode?: NutritionSafeErrorCode;
  }): void {
    this.record(
      buildNutritionTelemetryEvent({
        ...input,
        event: `nutrition_coach_context_${input.outcome}`,
        operation: 'project_coach_nutrition_context',
      }),
    );
  }

  getMetricSnapshot(): NutritionMetricSnapshot {
    return Object.freeze(Object.fromEntries(this.counters.entries()));
  }

  private record(event: NutritionTelemetryEvent): void {
    const metricKey = [
      'nutrition',
      event.operation,
      event.outcome,
      event.availability ?? 'unknown',
      event.freshness ?? 'unknown',
      event.safeErrorCode ?? 'none',
    ].join('.');
    this.counters.set(metricKey, (this.counters.get(metricKey) ?? 0) + 1);

    try {
      this.logger.log(event);
    } catch {
      // Telemetry is fail-open and cannot affect Nutrition behavior.
    }
  }
}
