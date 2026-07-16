import type {
  CoachIntelligenceAggregate,
  CoachIntelligenceSectionState,
} from '@elev9/types';

const SECTION_NAMES = [
  'insight',
  'evidence',
  'explainability',
  'training',
  'nutrition',
  'recovery',
  'goals',
  'habits',
  'progress',
  'personalization',
  'notifications',
] as const;

const SHARED_AVAILABILITY = {
  status: 'available',
  fallbackUsed: false,
  retryable: false,
  reasonCode: 'READY',
} as const;

const SHARED_FRESHNESS = {
  status: 'fresh',
  generatedAt: '2026-07-13T10:00:00.000Z',
  sourceTimestamp: '2026-07-13T09:59:50.000Z',
  ageMs: 10000,
} as const;

export function buildCoachIntelligenceAggregateFixture(): CoachIntelligenceAggregate {
  const sharedAvailability = SHARED_AVAILABILITY;
  const sharedFreshness = SHARED_FRESHNESS;

  const availabilitySections = Object.fromEntries(
    SECTION_NAMES.map((section) => [section, sharedAvailability]),
  ) as CoachIntelligenceAggregate['availability']['sections'];

  const freshnessSections = Object.fromEntries(
    SECTION_NAMES.map((section) => [section, sharedFreshness]),
  ) as CoachIntelligenceAggregate['freshness']['sections'];

  return {
    header: {
      aggregateId: 'aggregate_123',
      requestId: 'request_123',
      generatedAt: '2026-07-13T10:00:00.000Z',
      sourceVersion: '1.0.0',
      rolloutState: 'aggregate',
    },
    ownership: {
      primaryExpert: 'Workout',
      participatingExperts: ['Workout'],
      supportingExperts: [],
    },
    insight: {
      summary: 'Workout guidance is stable.',
      dailyPriority: 'PRIMARY',
      currentFocus: 'WORKOUT',
      currentRisk: null,
      topRecommendation: null,
      keyFindings: [],
      recommendations: [],
      risks: [],
      confidence: {
        level: 'HIGH',
        evidenceCount: 0,
        supportingEvidenceCount: 0,
        missingEvidenceCount: 0,
        policyConfidence: 'HIGH',
        runtimeCompleteness: 'HIGH',
        detail: 'High confidence.',
      },
      conflicts: [],
    },
    evidence: [],
    explainability: {
      decisionReasons: [],
      recommendationReasons: [],
      riskExplanations: [],
      confidenceExplanation: {
        confidence: 'HIGH',
        supportingEvidenceCount: 0,
        supportingExpertCount: 0,
        missingEvidenceCount: 0,
        policyRestrictions: [],
        metadata: {},
      },
      conflictExplanations: [],
      missingEvidence: [],
      evidence: [],
      metadata: {
        generatedAt: '2026-07-13T10:00:00.000Z',
        durationMs: 1,
        evidenceCount: 0,
        explanationCount: 0,
        missingEvidenceCount: 0,
      },
      summary: 'Stable guidance summary.',
    },
    warnings: [],
    availability: {
      status: 'available',
      fallbackUsed: false,
      retryable: false,
      reasonCode: 'READY',
      sections: availabilitySections,
    },
    freshness: {
      status: 'fresh',
      generatedAt: '2026-07-13T10:00:00.000Z',
      sourceTimestamp: '2026-07-13T09:59:50.000Z',
      ageMs: 10000,
      sections: freshnessSections,
    },
    sections: {
      training: buildSectionState({
        trainingPlan: null,
        adaptiveTrainingRecommendation: null,
      }),
      nutrition: buildSectionState({
        todayNutrition: null,
        nutritionPlan: null,
        nutritionRecommendation: null,
      }),
      recovery: buildSectionState({
        recoverySnapshot: null,
      }),
      goals: buildSectionState({
        currentGoal: null,
        progressSnapshot: null,
        forecast: null,
        milestones: [],
        achievements: [],
      }),
      habits: buildSectionState({
        habitSnapshot: null,
        consistencySummary: null,
        habitRiskSignals: [],
      }),
      progress: buildSectionState({
        progressSummary: null,
        dailyCheckIn: null,
      }),
      personalization: buildSectionState({
        personalizationSnapshot: null,
        userBehaviorProfile: null,
        behavioralPatterns: [],
      }),
      notifications: buildSectionState({
        notificationDecision: null,
        engagementSummary: null,
      }),
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
  } satisfies CoachIntelligenceAggregate;
}

function buildSectionState<TData>(
  data: TData,
): CoachIntelligenceSectionState<TData> {
  return {
    availability: SHARED_AVAILABILITY,
    freshness: SHARED_FRESHNESS,
    data,
    warnings: [],
  };
}
