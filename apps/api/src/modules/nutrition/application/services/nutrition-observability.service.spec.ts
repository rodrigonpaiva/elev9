import {
  buildNutritionTelemetryEvent,
  NutritionObservabilityService,
  toNutritionDurationBucket,
} from './nutrition-observability.service';

describe('Nutrition observability boundary', () => {
  it('builds an allowlisted event without nutrition payloads', () => {
    const event = buildNutritionTelemetryEvent({
      event: 'nutrition_today_load_success',
      operation: 'get_today_nutrition',
      outcome: 'success',
      availability: 'available',
      freshness: 'current',
      durationMs: 120,
    });

    expect(event).toEqual({
      event: 'nutrition_today_load_success',
      domain: 'nutrition',
      operation: 'get_today_nutrition',
      outcome: 'success',
      availability: 'available',
      freshness: 'current',
      contractVersion: 'nutrition-read-model-v1',
      durationBucket: '100_250_ms',
    });
    expect(event).not.toHaveProperty('calories');
    expect(event).not.toHaveProperty('macros');
    expect(event).not.toHaveProperty('userId');
  });

  it('uses bounded duration buckets', () => {
    expect(toNutritionDurationBucket(0)).toBe('under_50_ms');
    expect(toNutritionDurationBucket(75)).toBe('50_100_ms');
    expect(toNutritionDurationBucket(250)).toBe('250_500_ms');
    expect(toNutritionDurationBucket(1_500)).toBe('over_1000_ms');
  });

  it('records low-cardinality counters and is fail-open', () => {
    const service = new NutritionObservabilityService();

    service.recordTodayRead({
      outcome: 'failure',
      safeErrorCode: 'NUTRITION_PROCESSING_FAILED',
    });
    service.recordCoachContext({
      outcome: 'success',
      availability: 'available',
      freshness: 'current',
    });

    expect(Object.keys(service.getMetricSnapshot())).toEqual([
      'nutrition.get_today_nutrition.failure.unknown.unknown.NUTRITION_PROCESSING_FAILED',
      'nutrition.project_coach_nutrition_context.success.available.current.none',
    ]);
  });
});
