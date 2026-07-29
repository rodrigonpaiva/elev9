import type {
  CoachEvidence,
  CoachIntelligenceAggregate,
  CoachIntelligenceAvailabilityReasonCode,
  CoachIntelligenceAvailabilityStatus,
  CoachIntelligenceSectionAvailability,
  CoachIntelligenceSectionFreshness,
  CoachIntelligenceSectionName,
} from './coach-intelligence';

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
] as const satisfies readonly CoachIntelligenceSectionName[];

describe('CoachIntelligenceAggregate', () => {
  it('models the canonical aggregate contract with explicit availability and freshness', () => {
    const aggregate = buildAggregateFixture();

    expect(aggregate.header.aggregateId).toBe('aggregate_123');
    expect(aggregate.insight.dailyPriority).toBe('PRIMARY');
    expect(aggregate.availability.status).toBe('available');
    expect(aggregate.availability.sections.training.status).toBe('available');
    expect(aggregate.freshness.sections.training.status).toBe('fresh');
    expect(aggregate.warnings).toHaveLength(1);
    expect(aggregate.explainability.evidence).toHaveLength(1);
    expect(
      aggregate.sections.training.data?.adaptiveTrainingRecommendation
        ?.recommendationType,
    ).toBe('maintain');
  });

  it.each<
    [
      CoachIntelligenceAvailabilityStatus,
      CoachIntelligenceAvailabilityReasonCode,
    ]
  >([
    ['available', 'READY'],
    ['unavailable', 'SOURCE_UNAVAILABLE'],
    ['stale', 'STALE_CONTEXT'],
    ['degraded', 'PARTIAL_FAILURE'],
    ['disabled', 'FEATURE_DISABLED'],
  ])('supports availability state %s', (status, reasonCode) => {
    const availability = buildSectionAvailability(status, reasonCode);

    expect(availability.status).toBe(status);
    expect(availability.reasonCode).toBe(reasonCode);
    expect(typeof availability.retryable).toBe('boolean');
    expect(typeof availability.fallbackUsed).toBe('boolean');
  });

  it('keeps evidence and warnings client-safe', () => {
    const aggregate = buildAggregateFixture();

    expect(aggregate.evidence[0].title).toBe('Workout completed');
    expect(aggregate.warnings[0].code).toBe('LOW_CONFIDENCE');
    expect(aggregate.warnings[0].affectedSections).toContain('insight');
  });
});

function buildAggregateFixture(): CoachIntelligenceAggregate {
  const evidence: CoachEvidence[] = [
    {
      id: 'evidence_1',
      type: 'workout_completed',
      source: 'Workout',
      expert: 'Workout',
      importance: 'HIGH',
      confidence: 'HIGH',
      availability: 'AVAILABLE',
      title: 'Workout completed',
      detail: 'The athlete completed the planned workout.',
      metadata: {
        workoutDayIndex: 2,
      },
    },
  ];

  const sectionAvailability = buildAvailabilityMap();
  const sectionFreshness = buildFreshnessMap();

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
      participatingExperts: ['Workout', 'Recovery', 'Goal'],
      supportingExperts: ['Recovery', 'Goal'],
    },
    insight: {
      summary: 'Workout focus with recovery caution.',
      dailyPriority: 'PRIMARY',
      currentFocus: 'WORKOUT',
      currentRisk: {
        level: 'MEDIUM',
        sources: ['Workout', 'Recovery'],
        title: 'Recovery needs attention',
        detail: 'A lighter day is recommended until readiness improves.',
        evidenceIds: ['evidence_1'],
        metadata: {},
      },
      topRecommendation: {
        code: 'maintain_plan',
        title: 'Maintain planned workout',
        detail: 'Keep the planned workout and reduce intensity if needed.',
        expert: 'Workout',
        priority: 'PRIMARY',
        supportingEvidenceIds: ['evidence_1'],
        metadata: {},
      },
      keyFindings: [
        {
          code: 'LOW_RECOVERY',
          title: 'Recovery is moderate',
          detail: 'Readiness is not yet optimal.',
          expert: 'Recovery',
          evidenceIds: ['evidence_1'],
          metadata: {},
        },
      ],
      recommendations: [
        {
          code: 'maintain_plan',
          title: 'Maintain planned workout',
          detail: 'Continue with the current workout plan.',
          expert: 'Workout',
          priority: 'PRIMARY',
          supportingEvidenceIds: ['evidence_1'],
          metadata: {},
        },
      ],
      risks: [
        {
          level: 'MEDIUM',
          sources: ['Workout', 'Recovery'],
          title: 'Moderate recovery risk',
          detail: 'Training load may be slightly high.',
          evidenceIds: ['evidence_1'],
          metadata: {},
        },
      ],
      confidence: {
        level: 'HIGH',
        evidenceCount: 1,
        supportingEvidenceCount: 1,
        missingEvidenceCount: 0,
        policyConfidence: 'HIGH',
        runtimeCompleteness: 'HIGH',
        detail: 'Deterministic confidence is high.',
      },
      conflicts: [
        {
          type: 'load_vs_recovery',
          experts: ['Workout', 'Recovery'],
          severity: 'MEDIUM',
          resolution:
            'Prefer maintaining the workout with a recovery-aware adjustment.',
          metadata: {},
        },
      ],
    },
    evidence,
    explainability: {
      decisionReasons: [
        {
          code: 'LOW_RECOVERY',
          title: 'Recovery is moderate',
          supportingEvidenceIds: ['evidence_1'],
          supportingExperts: ['Recovery'],
          priority: 'primary',
          reasonCategory: 'RECOVERY',
          metadata: {},
        },
      ],
      recommendationReasons: [
        {
          recommendationCode: 'maintain_plan',
          supportingEvidenceIds: ['evidence_1'],
          supportingExperts: ['Workout'],
          priority: 'PRIMARY',
          reasonCategory: 'WORKOUT',
          metadata: {},
        },
      ],
      riskExplanations: [
        {
          riskLevel: 'MEDIUM',
          supportingEvidenceIds: ['evidence_1'],
          supportingExperts: ['Recovery'],
          severity: 'MEDIUM',
          metadata: {},
        },
      ],
      confidenceExplanation: {
        confidence: 'HIGH',
        supportingEvidenceCount: 1,
        supportingExpertCount: 2,
        missingEvidenceCount: 0,
        policyRestrictions: [],
        metadata: {},
      },
      conflictExplanations: [
        {
          conflictType: 'load_vs_recovery',
          experts: ['Workout', 'Recovery'],
          resolution: 'Prefer the workout plan with recovery-aware adjustment.',
          resolvedBy: 'Primary expert',
          severity: 'MEDIUM',
          metadata: {},
        },
      ],
      missingEvidence: [],
      evidence,
      metadata: {
        generatedAt: '2026-07-13T10:00:00.000Z',
        durationMs: 12,
        evidenceCount: 1,
        explanationCount: 4,
        missingEvidenceCount: 0,
      },
      summary:
        'Workout guidance remains stable with a moderate recovery caution.',
    },
    warnings: [
      {
        code: 'LOW_CONFIDENCE',
        severity: 'LOW',
        affectedSections: ['insight', 'training'],
        retryable: false,
        title: 'Confidence is high enough for display',
        detail: 'No fallback is required for the current aggregate.',
        metadata: {},
      },
    ],
    availability: {
      status: 'available',
      fallbackUsed: false,
      retryable: false,
      reasonCode: 'READY',
      sections: sectionAvailability,
    },
    freshness: {
      status: 'fresh',
      generatedAt: '2026-07-13T10:00:00.000Z',
      sourceTimestamp: '2026-07-13T09:59:50.000Z',
      ageMs: 10000,
      sections: sectionFreshness,
    },
    sections: {
      training: {
        availability: sectionAvailability.training,
        freshness: sectionFreshness.training,
        data: {
          trainingPlan: {
            id: 'training_plan_1',
            fitnessProfileId: 'fitness_profile_1',
            status: 'active',
            goal: 'maintain',
            activityLevel: 'high',
            weeklySchedule: [],
            createdAt: '2026-07-13T00:00:00.000Z',
          },
          adaptiveTrainingRecommendation: {
            id: 'adaptive_1',
            userProfileId: 'user_1',
            date: '2026-07-13',
            recommendationType: 'maintain',
            recommendedIntensity: 'moderate',
            volumeAction: 'maintain',
            reasoning: 'Maintain the current plan.',
            influences: [],
            sourceContext: {},
            formulaVersion: '1.0.0',
            generatedBy: 'deterministic',
            createdAt: '2026-07-13T10:00:00.000Z',
            updatedAt: '2026-07-13T10:00:00.000Z',
          },
        },
        warnings: [],
      },
      nutrition: {
        availability: sectionAvailability.nutrition,
        freshness: sectionFreshness.nutrition,
        data: {
          nutritionContext: null,
        },
        warnings: [],
      },
      recovery: {
        availability: sectionAvailability.recovery,
        freshness: sectionFreshness.recovery,
        data: {
          recoverySnapshot: {
            userProfileId: 'user_1',
            date: '2026-07-13',
            readinessScore: 72,
            fatigueScore: 48,
            recoveryTrend: 'stable',
            recommendedIntensity: 'moderate',
            influences: [],
            formulaVersion: '1.0.0',
            sourceContext: {},
            createdAt: '2026-07-13T10:00:00.000Z',
          },
        },
        warnings: [],
      },
      goals: {
        availability: sectionAvailability.goals,
        freshness: sectionFreshness.goals,
        data: {
          currentGoal: {
            id: 'goal_1',
            userProfileId: 'user_1',
            type: 'improve_consistency',
            status: 'active',
            startDate: '2026-06-01',
            createdAt: '2026-06-01T00:00:00.000Z',
            updatedAt: '2026-07-13T10:00:00.000Z',
          },
          progressSnapshot: {
            goalId: 'goal_1',
            userProfileId: 'user_1',
            date: '2026-07-13',
            progressPercentage: 42,
            currentValue: 42,
            targetValue: 100,
            trend: 'improving',
            sourceContext: {},
            formulaVersion: '1.0.0',
          },
          forecast: {
            goalId: 'goal_1',
            userProfileId: 'user_1',
            confidence: 'medium',
            estimatedDaysRemaining: 30,
            generatedAt: '2026-07-13T10:00:00.000Z',
            formulaVersion: '1.0.0',
          },
          milestones: [],
          achievements: [],
        },
        warnings: [],
      },
      habits: {
        availability: sectionAvailability.habits,
        freshness: sectionFreshness.habits,
        data: {
          habitSnapshot: {
            userProfileId: 'user_1',
            date: '2026-07-13',
            consistencyScore: 78,
            streakDays: 5,
            adherenceScore: 80,
            trend: 'improving',
            sourceContext: {
              formulaVersion: '1.0.0',
              generatedAt: '2026-07-13T10:00:00.000Z',
            },
            formulaVersion: '1.0.0',
            generatedAt: '2026-07-13T10:00:00.000Z',
          },
          consistencySummary: {
            userProfileId: 'user_1',
            score: 78,
            trend: 'improving',
            currentStreak: 5,
            longestStreak: 8,
            adherenceRate: 0.8,
            riskLevel: 'low',
            updatedAt: '2026-07-13T10:00:00.000Z',
            formulaVersion: '1.0.0',
          },
          habitRiskSignals: [],
        },
        warnings: [],
      },
      progress: {
        availability: sectionAvailability.progress,
        freshness: sectionFreshness.progress,
        data: {
          progressSummary: {
            period: 'week',
            workoutsCompleted: 3,
            totalDurationMinutes: 180,
            averageDurationMinutes: 60,
            lastWorkoutDate: '2026-07-12',
            currentStreak: 3,
          },
          dailyCheckIn: {
            id: 'checkin_1',
            energyLevel: 7,
            sleepQuality: 8,
            muscleSoreness: 3,
            motivationLevel: 7,
            createdAt: '2026-07-13T07:00:00.000Z',
          },
        },
        warnings: [],
      },
      personalization: {
        availability: sectionAvailability.personalization,
        freshness: sectionFreshness.personalization,
        data: {
          personalizationSnapshot: {
            id: 'personalization_1',
            userProfileId: 'user_1',
            date: '2026-07-13',
            preferredCoachingStyle: 'balanced',
            engagementProfile: 'high',
            notificationResponsiveness: 'high',
            goalResponsiveness: 'high',
            recoveryResponsiveness: 'medium',
            habitResponsiveness: 'high',
            riskOfDisengagement: 'low',
            trend: 'stable',
            sourceContext: {
              formulaVersion: '1.0.0',
              generatedAt: '2026-07-13T10:00:00.000Z',
            },
            formulaVersion: '1.0.0',
            generatedAt: '2026-07-13T10:00:00.000Z',
          },
          userBehaviorProfile: {
            userProfileId: 'user_1',
            preferredCoachingStyle: 'balanced',
            notificationResponsiveness: 'high',
            goalResponsiveness: 'high',
            recoveryResponsiveness: 'medium',
            habitResponsiveness: 'high',
            engagementProfile: 'high',
            riskOfDisengagement: 'low',
            formulaVersion: '1.0.0',
            updatedAt: '2026-07-13T10:00:00.000Z',
            createdAt: '2026-06-01T00:00:00.000Z',
          },
          behavioralPatterns: [],
        },
        warnings: [],
      },
      notifications: {
        availability: sectionAvailability.notifications,
        freshness: sectionFreshness.notifications,
        data: {
          notificationDecision: {
            userProfileId: 'user_1',
            date: '2026-07-13',
            type: 'coach_nudge',
            priority: 'medium',
            channel: 'in_app',
            status: 'planned',
            title: 'Coach nudge',
            message: 'Keep going.',
            influences: [],
            sourceContext: {
              formulaVersion: '1.0.0',
            },
            formulaVersion: '1.0.0',
            generatedBy: 'deterministic',
          },
          engagementSummary: {
            engagementScore: 82,
            fatigueLevel: 'low',
            openedCount: 4,
            clickedCount: 2,
            dismissedCount: 1,
            completedCount: 1,
            recentEventsCount: 8,
          },
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
  } satisfies CoachIntelligenceAggregate;
}

function buildAvailabilityMap(): Record<
  CoachIntelligenceSectionName,
  CoachIntelligenceSectionAvailability
> {
  return Object.fromEntries(
    SECTION_NAMES.map((section) => [section, buildSectionAvailability()]),
  ) as Record<
    CoachIntelligenceSectionName,
    CoachIntelligenceSectionAvailability
  >;
}

function buildFreshnessMap(): Record<
  CoachIntelligenceSectionName,
  CoachIntelligenceSectionFreshness
> {
  return Object.fromEntries(
    SECTION_NAMES.map((section) => [section, buildSectionFreshness()]),
  ) as Record<CoachIntelligenceSectionName, CoachIntelligenceSectionFreshness>;
}

function buildSectionAvailability(
  status: CoachIntelligenceAvailabilityStatus = 'available',
  reasonCode: CoachIntelligenceAvailabilityReasonCode = 'READY',
): CoachIntelligenceSectionAvailability {
  return {
    status,
    fallbackUsed: status !== 'available',
    retryable: status === 'unavailable' || status === 'degraded',
    reasonCode,
  };
}

function buildSectionFreshness(
  status: CoachIntelligenceSectionFreshness['status'] = 'fresh',
): CoachIntelligenceSectionFreshness {
  return {
    status,
    generatedAt: '2026-07-13T10:00:00.000Z',
    sourceTimestamp: '2026-07-13T09:59:50.000Z',
    ageMs: 10000,
  };
}
