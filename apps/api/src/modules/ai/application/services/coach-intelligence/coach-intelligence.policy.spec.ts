import { CoachIntelligenceFreshnessPolicy } from './coach-intelligence.policy';
import type { CoachIntelligenceSectionState } from './coach-intelligence.types';

describe('CoachIntelligenceFreshnessPolicy', () => {
  const policy = new CoachIntelligenceFreshnessPolicy();

  it('marks the aggregate as disabled when the feature flag is disabled', () => {
    const availability = policy.resolveAggregateAvailability({
      sections: buildSections(),
      featureEnabled: false,
      fallbackUsed: false,
    });

    expect(availability.status).toBe('disabled');
    expect(availability.sections.training.status).toBe('available');
    expect(availability.reasonCode).toBe('FEATURE_DISABLED');
  });

  it('marks stale sections and emits deterministic warnings', () => {
    const section = policy.resolveSectionState({
      sectionName: 'training',
      data: { trainingPlan: null, adaptiveTrainingRecommendation: null },
      generatedAt: '2026-07-13T00:00:00.000Z',
      sourceTimestamp: '2026-07-11T00:00:00.000Z',
      fallbackUsed: true,
      retryable: true,
    });

    expect(section.freshness.status).toBe('stale');
    expect(section.availability.status).toBe('stale');
    expect(section.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(['STALE_CONTEXT', 'FALLBACK_USED']),
    );
  });

  it('resolves aggregate freshness from section timestamps deterministically', () => {
    const freshness = policy.resolveAggregateFreshness({
      generatedAt: '2026-07-13T00:00:00.000Z',
      sections: buildSections(),
    });

    expect(freshness.status).toBe('fresh');
    expect(freshness.generatedAt).toBe('2026-07-13T00:00:00.000Z');
  });
});

function buildSections(): ReturnType<
  CoachIntelligenceFreshnessPolicy['resolveAggregateAvailability']
>['sections'] {
  const state = {
    availability: {
      status: 'available',
      fallbackUsed: false,
      retryable: false,
      reasonCode: 'READY',
    },
    freshness: {
      status: 'fresh',
      generatedAt: '2026-07-13T00:00:00.000Z',
      sourceTimestamp: '2026-07-13T00:00:00.000Z',
      ageMs: 0,
    },
    data: {
      trainingPlan: null,
      adaptiveTrainingRecommendation: null,
    },
    warnings: [],
  } as CoachIntelligenceSectionState<{
    trainingPlan: null;
    adaptiveTrainingRecommendation: null;
  }>;

  return {
    training: state,
    nutrition: state,
    recovery: state,
    goals: state,
    habits: state,
    progress: state,
    personalization: state,
    notifications: state,
    insight: state,
    evidence: state,
    explainability: state,
  } as never;
}
