import { GetCoachIntelligenceError } from '../../services/coach-intelligence/coach-intelligence.errors';
import { CoachIntelligenceAggregationService } from '../../services/coach-intelligence/coach-intelligence.aggregation.service';
import { GetCoachIntelligenceUseCase } from './get-coach-intelligence.use-case';

describe('GetCoachIntelligenceUseCase', () => {
  let aggregationService: jest.Mocked<CoachIntelligenceAggregationService>;
  let useCase: GetCoachIntelligenceUseCase;

  beforeEach(() => {
    aggregationService = {
      build: jest.fn(),
    } as unknown as jest.Mocked<CoachIntelligenceAggregationService>;

    useCase = new GetCoachIntelligenceUseCase(aggregationService);
  });

  it('returns the canonical aggregate from the backend aggregation service', async () => {
    aggregationService.build.mockResolvedValue({
      aggregate: buildAggregate(),
    } as never);

    const result = await useCase.execute({
      authUserId: 'auth_123',
      requestId: 'request_123',
      conversationId: 'conversation_123',
      userProfileId: 'profile_123',
    });

    expect(aggregationService.build).toHaveBeenCalledWith({
      authUserId: 'auth_123',
      requestId: 'request_123',
      conversationId: 'conversation_123',
      userProfileId: 'profile_123',
    });
    expect(result.header.aggregateId).toBe('aggregate_123');
  });

  it('rejects an invalid session before invoking aggregation', async () => {
    await expect(
      useCase.execute({
        authUserId: '   ',
      }),
    ).rejects.toBeInstanceOf(GetCoachIntelligenceError);

    expect(aggregationService.build).not.toHaveBeenCalled();
  });

  it('wraps unexpected aggregation failures', async () => {
    aggregationService.build.mockRejectedValue(new Error('boom'));

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toMatchObject({
      code: 'COACH_INTELLIGENCE_INTERNAL_ERROR',
    });
  });
});

function buildAggregate() {
  return {
    header: {
      aggregateId: 'aggregate_123',
      requestId: 'request_123',
      generatedAt: '2026-07-13T00:00:00.000Z',
      sourceVersion: '1.0.0',
      rolloutState: 'aggregate',
    },
    ownership: {
      primaryExpert: 'Progress',
      participatingExperts: ['Progress'],
      supportingExperts: ['Motivation'],
    },
    insight: {
      summary: 'Summary',
      dailyPriority: 'PRIMARY',
      currentFocus: 'PROGRESS',
      currentRisk: null,
      topRecommendation: null,
      keyFindings: [],
      recommendations: [],
      risks: [],
      confidence: {
        level: 'HIGH',
        evidenceCount: 1,
        supportingEvidenceCount: 1,
        missingEvidenceCount: 0,
        policyConfidence: 'HIGH',
        runtimeCompleteness: 'HIGH',
        detail: 'Confidence detail',
      },
      conflicts: [],
    },
    evidence: [],
    explainability: {
      evidence: [],
      decisionReasons: [],
      recommendationReasons: [],
      riskExplanations: [],
      confidenceExplanation: {
        confidence: 'HIGH',
        supportingEvidenceCount: 1,
        supportingExpertCount: 1,
        missingEvidenceCount: 0,
        policyRestrictions: [],
        metadata: {},
      },
      conflictExplanations: [],
      missingEvidence: [],
      metadata: {
        generatedAt: '2026-07-13T00:00:00.000Z',
        durationMs: 1,
        evidenceCount: 0,
        explanationCount: 0,
        missingEvidenceCount: 0,
      },
      summary: 'Summary',
    },
    warnings: [],
    availability: {
      status: 'available',
      fallbackUsed: false,
      retryable: false,
      reasonCode: 'READY',
      sections: {
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
        training: {
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
      generatedAt: '2026-07-13T00:00:00.000Z',
      sourceTimestamp: '2026-07-13T00:00:00.000Z',
      ageMs: 0,
      sections: {
        insight: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        evidence: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        explainability: {
          status: 'fresh',
          generatedAt: '2026-07-13T00:00:00.000Z',
        },
        training: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        nutrition: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        recovery: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        goals: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        habits: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        progress: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        personalization: {
          status: 'fresh',
          generatedAt: '2026-07-13T00:00:00.000Z',
        },
        notifications: {
          status: 'fresh',
          generatedAt: '2026-07-13T00:00:00.000Z',
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
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: {
          trainingPlan: null,
          adaptiveTrainingRecommendation: null,
        },
        warnings: [],
      },
      nutrition: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: {
          todayNutrition: null,
          nutritionPlan: null,
          nutritionRecommendation: null,
        },
        warnings: [],
      },
      recovery: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: { recoverySnapshot: null },
        warnings: [],
      },
      goals: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: {
          currentGoal: null,
          progressSnapshot: null,
          forecast: null,
          milestones: [],
          achievements: [],
        },
        warnings: [],
      },
      habits: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: {
          habitSnapshot: null,
          consistencySummary: null,
          habitRiskSignals: [],
        },
        warnings: [],
      },
      progress: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: {
          progressSummary: null,
          dailyCheckIn: null,
        },
        warnings: [],
      },
      personalization: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: {
          personalizationSnapshot: null,
          userBehaviorProfile: null,
          behavioralPatterns: [],
        },
        warnings: [],
      },
      notifications: {
        availability: {
          status: 'available',
          fallbackUsed: false,
          retryable: false,
          reasonCode: 'READY',
        },
        freshness: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        data: {
          notificationDecision: null,
          engagementSummary: null,
        },
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
