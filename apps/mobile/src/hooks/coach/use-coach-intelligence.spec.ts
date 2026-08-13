import { ApiClientError } from '@elev9/api-client';
import type { CoachIntelligenceAggregate } from '@elev9/types';

import {
  isCoachIntelligenceAggregate,
  mapAggregateExplainability,
  mapCoachIntelligenceAggregateToLegacyIntelligence,
  shouldFallbackToLegacyCoachIntelligence,
} from './coach-intelligence-helpers';

describe('useCoachIntelligence helpers', () => {
  const aggregate = buildAggregateFixture();

  it('classifies transport and rollout failures as fallback eligible', () => {
    expect(
      shouldFallbackToLegacyCoachIntelligence(
        new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'Offline',
          status: 0,
        }),
      ),
    ).toBe(true);

    expect(
      shouldFallbackToLegacyCoachIntelligence(
        new ApiClientError({
          code: 'COACH_INTELLIGENCE_FEATURE_DISABLED',
          message: 'Disabled',
          status: 503,
        }),
      ),
    ).toBe(true);

    expect(
      shouldFallbackToLegacyCoachIntelligence(
        new ApiClientError({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
          status: 401,
        }),
      ),
    ).toBe(false);

    expect(
      shouldFallbackToLegacyCoachIntelligence(
        new ApiClientError({
          code: 'USER_PROFILE_NOT_FOUND',
          message: 'Missing',
          status: 404,
        }),
      ),
    ).toBe(false);
  });

  it('validates the canonical aggregate envelope', () => {
    expect(isCoachIntelligenceAggregate(aggregate)).toBe(true);
    expect(isCoachIntelligenceAggregate({ ...aggregate, header: null })).toBe(
      false,
    );
  });

  it('maps the canonical aggregate into the legacy intelligence shape', () => {
    const legacy = mapCoachIntelligenceAggregateToLegacyIntelligence(aggregate);

    expect(legacy.primaryExpert).toBe('Workout');
    expect(legacy.summary).toBe('Keep the session controlled.');
    expect(legacy.currentFocus).toBe('WORKOUT');
    expect(legacy.currentRisk).toBeNull();
    expect(legacy.topRecommendation?.title).toBe('Start workout');
    expect(legacy.supportingEvidenceSummary).toBe('Evidence summary.');
  });

  it('keeps the shared explainability summary intact', () => {
    expect(mapAggregateExplainability(aggregate).summary).toBe(
      'Evidence summary.',
    );
  });
});

function buildAggregateFixture(): CoachIntelligenceAggregate {
  const now = '2026-07-05T08:00:00.000Z';

  return {
    header: {
      aggregateId: 'aggregate-1',
      requestId: 'request-1',
      generatedAt: now,
      sourceVersion: '1.0.0',
      rolloutState: 'aggregate',
    },
    ownership: {
      primaryExpert: 'Workout',
      participatingExperts: ['Workout', 'Recovery'],
      supportingExperts: ['Recovery'],
    },
    insight: {
      summary: 'Keep the session controlled.',
      dailyPriority: 'PRIMARY',
      currentFocus: 'WORKOUT',
      currentRisk: null,
      topRecommendation: {
        code: 'recommendation-1',
        title: 'Start workout',
        detail: 'Begin the planned session.',
        expert: 'Workout',
        priority: 'PRIMARY',
        supportingEvidenceIds: [],
        metadata: {},
      },
      keyFindings: [],
      recommendations: [
        {
          code: 'recommendation-1',
          title: 'Start workout',
          detail: 'Begin the planned session.',
          expert: 'Workout',
          priority: 'PRIMARY',
          supportingEvidenceIds: [],
          metadata: {},
        },
      ],
      risks: [],
      confidence: {
        level: 'HIGH',
        evidenceCount: 3,
        supportingEvidenceCount: 2,
        missingEvidenceCount: 0,
        policyConfidence: 'HIGH',
        runtimeCompleteness: 'HIGH',
        detail: 'High confidence.',
      },
      conflicts: [],
    },
    evidence: [
      {
        id: 'evidence-1',
        type: 'coach_decision_headline',
        source: 'Workout',
        expert: 'Workout',
        importance: 'HIGH',
        confidence: 'HIGH',
        availability: 'AVAILABLE',
        title: 'Coach headline',
        detail: 'Push the session.',
        metadata: {},
      },
    ],
    explainability: {
      decisionReasons: [],
      recommendationReasons: [],
      riskExplanations: [],
      confidenceExplanation: {
        confidence: 'HIGH',
        supportingEvidenceCount: 2,
        supportingExpertCount: 1,
        missingEvidenceCount: 0,
        policyRestrictions: [],
        metadata: {},
      },
      conflictExplanations: [],
      missingEvidence: [],
      evidence: [
        {
          id: 'evidence-1',
          type: 'coach_decision_headline',
          source: 'Workout',
          expert: 'Workout',
          importance: 'HIGH',
          confidence: 'HIGH',
          availability: 'AVAILABLE',
          title: 'Coach headline',
          detail: 'Push the session.',
          metadata: {},
        },
      ],
      metadata: {
        generatedAt: now,
        durationMs: 12,
        evidenceCount: 1,
        explanationCount: 0,
        missingEvidenceCount: 0,
      },
      summary: 'Evidence summary.',
    },
    warnings: [],
    availability: {
      status: 'available',
      fallbackUsed: false,
      retryable: false,
      reasonCode: 'READY',
      sections: {
        training: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        insight: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        evidence: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        explainability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        nutrition: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        recovery: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        goals: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        habits: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        progress: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        personalization: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        notifications: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
      },
    },
    freshness: {
      status: 'fresh',
      generatedAt: now,
      sections: {
        training: {
          status: 'fresh',
          generatedAt: now,
        },
        insight: {
          status: 'fresh',
          generatedAt: now,
        },
        evidence: {
          status: 'fresh',
          generatedAt: now,
        },
        explainability: {
          status: 'fresh',
          generatedAt: now,
        },
        nutrition: {
          status: 'fresh',
          generatedAt: now,
        },
        recovery: {
          status: 'fresh',
          generatedAt: now,
        },
        goals: {
          status: 'fresh',
          generatedAt: now,
        },
        habits: {
          status: 'fresh',
          generatedAt: now,
        },
        progress: {
          status: 'fresh',
          generatedAt: now,
        },
        personalization: {
          status: 'fresh',
          generatedAt: now,
        },
        notifications: {
          status: 'fresh',
          generatedAt: now,
        },
      },
    },
    sections: {
      training: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
      nutrition: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
      recovery: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
      goals: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
      habits: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
      progress: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
      personalization: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
      notifications: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: {
          status: 'fresh',
          generatedAt: now,
        },
        data: null,
        warnings: [],
      },
    },
    metadata: {
      contractVersion: '1',
      partialResult: false,
      fallbackUsed: false,
      featureAvailability: {
        insight: true,
        evidence: true,
        explainability: true,
        training: true,
        nutrition: true,
        recovery: true,
        goals: true,
        habits: true,
        progress: true,
        personalization: true,
        notifications: true,
      },
    },
  };
}
