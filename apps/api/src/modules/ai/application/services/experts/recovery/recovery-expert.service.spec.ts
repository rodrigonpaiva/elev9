import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import type { RecoverySnapshot } from '../../../../../recovery/domain/entities/recovery-snapshot.entity';
import type { RecoveryCurrentReadModel } from '../../../../../recovery/application/read-models/recovery-read-model.types';
import { RecoveryExpert } from './recovery-expert.service';

describe('RecoveryExpert', () => {
  const expert = new RecoveryExpert();

  it('analyzes an optimal recovery day with supportive nutrition and improving trend metadata', () => {
    const request = buildRequest();
    const healthContext = buildHealthContext({
      goal: 'gain_muscle',
      todayWorkout: buildTodayWorkout({
        title: 'Upper body strength',
        focus: 'strength',
      }),
      latestCheckIn: {
        energyLevel: 5,
        sleepQuality: 5,
        muscleSoreness: 0,
        motivationLevel: 5,
        createdAt: new Date('2026-07-07T07:30:00.000Z'),
      },
      recoverySnapshot: buildRecoverySnapshot({
        readinessScore: 88,
        fatigueScore: 12,
        recoveryTrend: 'improving',
        recommendedIntensity: 'hard',
      }),
      adaptiveTrainingRecommendation: {
        recommendationType: 'maintain',
        recommendedIntensity: 'hard',
        volumeAction: 'maintain',
        reasoning: 'Stable workload.',
        influences: [],
      },
      recentWorkoutLogs: [buildWorkoutLog()],
    });
    const context = buildContext({
      request,
      healthContext,
      recoveryHistory: [
        buildRecoverySnapshot({
          readinessScore: 82,
          fatigueScore: 16,
          recoveryTrend: 'improving',
          recommendedIntensity: 'moderate',
          date: '2026-07-06',
        }),
      ],
    });

    const loadedContext = expert.loadContext(request, context);
    const result = expert.analyze(request, loadedContext);

    expect(loadedContext.runtimeMetadata.recoveryExpert).toMatchObject({
      recoveryStatus: 'GOOD',
      readinessLevel: 'HIGH',
      trend: 'IMPROVING',
      trainingImpact: 'FULL_SESSION',
      confidence: 'HIGH',
    });
    expect(result.summary).toContain('status=GOOD');
    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      analysis: expect.objectContaining({
        recoveryStatus: 'GOOD',
        trend: expect.objectContaining({ trend: 'IMPROVING' }),
        nutritionSupport: expect.objectContaining({ level: 'UNKNOWN' }),
        goalAlignment: 'strength',
      }),
    });
    expect(result.contributions[1]).toMatchObject({
      type: 'CONTRIBUTION',
      summary: 'Prioritize hydration.',
    });
  });

  it('reduces intensity when adaptive recovery is declining and today nutrition is only partial', () => {
    const request = buildRequest();
    const context = buildContext({
      request,
      healthContext: buildHealthContext({
        goal: 'maintain',
        todayWorkout: buildTodayWorkout({
          title: 'Conditioning session',
          focus: 'conditioning',
        }),
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 2,
          createdAt: new Date('2026-07-07T07:30:00.000Z'),
        },
        recoverySnapshot: buildRecoverySnapshot({
          readinessScore: 42,
          fatigueScore: 58,
          recoveryTrend: 'declining',
          recommendedIntensity: 'light',
        }),
        adaptiveTrainingRecommendation: {
          recommendationType: 'decrease_intensity',
          recommendedIntensity: 'light',
          volumeAction: 'decrease',
          reasoning: 'Current recovery does not support intensity.',
          influences: [],
        },
        recentWorkoutLogs: [buildWorkoutLog()],
      }),
      recoveryHistory: [
        buildRecoverySnapshot({
          readinessScore: 46,
          fatigueScore: 55,
          recoveryTrend: 'declining',
          recommendedIntensity: 'light',
          date: '2026-07-06',
        }),
      ],
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.recoveryStatus).toBe('POOR');
    expect(result.metadata.analysis.trend.trend).toBe('DECLINING');
    expect(result.metadata.analysis.trainingImpact.impact).toBe(
      'REDUCED_INTENSITY',
    );
    expect(result.metadata.analysis.nutritionSupport.level).toBe('UNKNOWN');
    expect(
      result.metadata.analysis.recommendations.map(
        (recommendation) => recommendation.code,
      ),
    ).toContain('REDUCE_TODAYS_INTENSITY');
    expect(result.contributions[1].summary).toBe('Prioritize recovery.');
  });

  it('uses canonical Recovery semantics instead of recalculating from score or raw check-in values', () => {
    const request = buildRequest();
    const canonicalRecovery: RecoveryCurrentReadModel = {
      availability: 'available',
      recovery: {
        score: 92,
        fatigueScore: 8,
        category: 'low',
        freshness: 'current',
        lastUpdatedAt: '2026-07-28T10:00:00.000Z',
        trend: 'stable',
        breakdown: [
          {
            key: 'sleep',
            impact: 'negative',
            labelKey: 'recovery.factors.sleep.label',
            explanationKey: 'recovery.factors.sleep.explanation',
          },
          {
            key: 'energy',
            impact: 'positive',
            labelKey: 'recovery.factors.energy.label',
            explanationKey: 'recovery.factors.energy.explanation',
          },
        ],
        insight: {
          tone: 'caution',
          titleKey: 'recovery.insight.low.title',
          bodyKey: 'recovery.insight.low.body',
          action: 'prioritize_recovery',
        },
      },
    };
    const result = expert.analyze(
      request,
      buildContext({
        request,
        healthContext: buildHealthContext({
          recoveryExperience: canonicalRecovery,
          latestCheckIn: {
            energyLevel: 1,
            sleepQuality: 1,
            muscleSoreness: 5,
            motivationLevel: 1,
            createdAt: new Date('2026-07-28T10:00:00.000Z'),
          },
        }),
      }),
    );

    expect(result.metadata.analysis).toMatchObject({
      recoveryStatus: 'POOR',
      recoveryAvailability: 'available',
      recoveryFreshness: 'current',
      recoveryCategory: 'low',
      trend: { trend: 'STABLE' },
      trainingImpact: { impact: 'ACTIVE_RECOVERY' },
    });
    expect(result.metadata.analysis.factorImpacts).toEqual([
      { key: 'sleep', impact: 'negative' },
      { key: 'energy', impact: 'positive' },
    ]);
    expect(result.metadata.analysis.sleepQuality).toBeNull();
    expect(result.metadata.analysis.muscleSoreness).toBeNull();
    expect(JSON.stringify(result.metadata.analysis)).not.toContain(
      'motivationLevel=1',
    );
  });

  it('takes a full recovery day when readiness is critically poor and fatigue is very high', () => {
    const request = buildRequest();
    const context = buildContext({
      request,
      healthContext: buildHealthContext({
        goal: 'fat_loss',
        todayWorkout: buildTodayWorkout({
          title: 'Lower body strength',
          focus: 'strength',
        }),
        latestCheckIn: {
          energyLevel: 1,
          sleepQuality: 1,
          muscleSoreness: 5,
          motivationLevel: 1,
          createdAt: new Date('2026-07-07T07:30:00.000Z'),
        },
        recoverySnapshot: buildRecoverySnapshot({
          readinessScore: 18,
          fatigueScore: 91,
          recoveryTrend: 'declining',
          recommendedIntensity: 'recovery',
        }),
        recentWorkoutLogs: [],
      }),
      recoveryHistory: [
        buildRecoverySnapshot({
          readinessScore: 30,
          fatigueScore: 78,
          recoveryTrend: 'declining',
          recommendedIntensity: 'light',
          date: '2026-07-05',
        }),
        buildRecoverySnapshot({
          readinessScore: 26,
          fatigueScore: 82,
          recoveryTrend: 'declining',
          recommendedIntensity: 'light',
          date: '2026-07-06',
        }),
        buildRecoverySnapshot({
          readinessScore: 22,
          fatigueScore: 88,
          recoveryTrend: 'declining',
          recommendedIntensity: 'recovery',
          date: '2026-07-07',
        }),
      ],
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.recoveryStatus).toBe('CRITICAL');
    expect(result.metadata.analysis.trainingImpact.impact).toBe('FULL_REST');
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
    expect(result.metadata.analysis.confidence).toBe('HIGH');
    expect(result.contributions[1].summary).toBe('Take a full recovery day.');
  });

  it('aligns recovery to the current goal when no workout is scheduled', () => {
    const request = buildRequest();
    const context = buildContext({
      request,
      healthContext: buildHealthContext({
        goal: 'lose_weight',
        todayWorkout: null,
        latestCheckIn: {
          energyLevel: 4,
          sleepQuality: 4,
          muscleSoreness: 1,
          motivationLevel: 4,
          createdAt: new Date('2026-07-07T07:30:00.000Z'),
        },
        recoverySnapshot: buildRecoverySnapshot({
          readinessScore: 66,
          fatigueScore: 34,
          recoveryTrend: 'stable',
          recommendedIntensity: 'moderate',
        }),
        adaptiveTrainingRecommendation: {
          recommendationType: 'maintain',
          recommendedIntensity: 'moderate',
          volumeAction: 'maintain',
          reasoning: 'Steady workload.',
          influences: [],
        },
        recentWorkoutLogs: [],
      }),
      recoveryHistory: [],
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.goalAlignment).toBe('fat_loss');
    expect(result.metadata.analysis.trainingImpact.impact).toBe(
      'REDUCED_INTENSITY',
    );
    expect(result.metadata.analysis.recoveryStatus).toBe('MODERATE');
  });

  it('returns a blocked analysis when policy evaluation rejects the expert context', () => {
    const request = buildRequest();
    const context = buildContext({
      request,
      policyEvaluation: {
        decision: {
          approved: false,
          blocked: true,
          fallbackRequired: true,
          allowedTools: [],
          allowedExperts: [],
          allowedDomains: [],
          allowedLLM: false,
          metadata: {
            stage: 'EXECUTION',
            evaluatedPolicyIds: [],
            rejectedPolicyIds: ['policy:blocked'],
            violationCount: 1,
            fallbackDecisionCount: 1,
            blockedDomainIds: ['recovery'],
            blockedToolIds: [],
            blockedExpertIds: ['RecoveryExpert'],
            blockedLlmUsage: true,
            allowedDomainCount: 0,
            allowedToolCount: 0,
            allowedExpertCount: 0,
            candidateExpertCount: 0,
            selectedExpertCount: 0,
            estimatedCost: 0,
            estimatedLatencyMs: 0,
            maximumExecutionDepth: 0,
            maxSteps: 0,
            maxToolCalls: 0,
            evaluationDurationMs: 0,
          },
        },
        violations: [],
        reason: 'Blocked by policy.',
        actions: ['fallback'],
      } as never,
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.recoveryStatus).toBe('UNKNOWN');
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
    expect(result.contributions[1].summary).toBe(
      'Proceed with today’s session.',
    );
    expect(result.metadata.analysis.confidence).toBe('LOW');
  });
});

function buildRequest(
  overrides: Partial<CoachExpertRequest> = {},
): CoachExpertRequest {
  return {
    userId: 'user_123',
    conversationId: 'conversation_123',
    userMessage: 'Should I train today?',
    sessionMetadata: {
      requestId: 'request_123',
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      conversationId: 'conversation_123',
      userIdHash: 'hash_123',
    },
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: false,
    experimentMetadata: {} as never,
    signal: undefined,
    onDelta: undefined,
    intent: 'RECOVERY',
    selectedDomains: ['recovery', 'training', 'goals'],
    candidateExperts: [] as never,
    selectedExperts: [] as never,
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<CoachExpertContext> = {},
): CoachExpertContext {
  return {
    request: buildRequest(),
    selectionReason: 'Recovery selected for training and recovery signals.',
    runtimeMetadata: {},
    healthContext: buildHealthContext(),
    ...overrides,
  };
}

function buildHealthContext(
  overrides: Partial<CoachExpertContext['healthContext']> = {},
): NonNullable<CoachExpertContext['healthContext']> {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    userName: 'Taylor',
    goal: 'maintain',
    activityLevel: 'moderate',
    weeklyFrequency: 4,
    adherenceScore: 82,
    currentStreak: 5,
    averageWorkoutDuration: 45,
    fatigueLevel: 'LOW',
    availableEquipment: ['dumbbells'],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: 'training_plan_123',
    latestCheckIn: {
      energyLevel: 4,
      sleepQuality: 4,
      muscleSoreness: 1,
      motivationLevel: 4,
      createdAt: new Date('2026-07-07T07:30:00.000Z'),
    },
    recoverySnapshot: undefined,
    adaptiveTrainingRecommendation: undefined,
    adaptiveRecommendationType: undefined,
    adaptiveRecommendedIntensity: undefined,
    adaptiveVolumeAction: undefined,
    adaptiveTrainingInfluences: [],
    adaptiveTrainingReasoning: undefined,
    readinessScore: undefined,
    fatigueScore: undefined,
    recoveryInfluences: [],
    recoveryTrend: undefined,
    recommendedIntensity: undefined,
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-07-07T07:30:00.000Z'),
    ...overrides,
  };
}

function buildTodayWorkout(
  overrides: Partial<
    NonNullable<CoachExpertContext['healthContext']>['todayWorkout']
  > = {},
) {
  return {
    dayIndex: 2,
    title: 'Full body session',
    focus: 'conditioning',
    format: 'strength',
    intensity: 'moderate',
    exercises: [],
    ...overrides,
  } as NonNullable<CoachExpertContext['healthContext']>['todayWorkout'];
}

function buildRecoverySnapshot(
  overrides: Partial<RecoverySnapshot> &
    Pick<
      RecoverySnapshot,
      | 'readinessScore'
      | 'fatigueScore'
      | 'recoveryTrend'
      | 'recommendedIntensity'
    >,
): RecoverySnapshot {
  return {
    userProfileId: 'profile_123',
    date: overrides.date ?? '2026-07-07',
    readinessScore: overrides.readinessScore,
    fatigueScore: overrides.fatigueScore,
    recoveryTrend: overrides.recoveryTrend,
    recommendedIntensity: overrides.recommendedIntensity,
    influences: overrides.influences ?? [],
    formulaVersion: overrides.formulaVersion ?? 'recovery-v1',
    sourceContext:
      overrides.sourceContext ??
      ({
        formulaVersion: 'recovery-v1',
        generatedAt: '2026-07-07T07:30:00.000Z',
      } as never),
    createdAt: overrides.createdAt ?? new Date('2026-07-07T07:30:00.000Z'),
  };
}

function buildWorkoutLog() {
  return {
    id: 'workout_log_123',
    userProfileId: 'profile_123',
    workoutDayIndex: 2,
    completedExercises: [],
    status: 'completed',
    createdAt: new Date('2026-07-07T08:00:00.000Z'),
    updatedAt: new Date('2026-07-07T08:00:00.000Z'),
  } as never;
}
