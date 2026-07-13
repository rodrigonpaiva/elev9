import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import type { RecoverySnapshot } from '../../../../../recovery/domain/entities/recovery-snapshot.entity';
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
      nutritionProfile: {
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: ['rice'],
      },
      recentWorkoutLogs: [buildWorkoutLog()],
    });
    const context = buildContext({
      request,
      healthContext,
      todayNutrition: buildTodayNutrition(100),
      nutritionLogs: [buildNutritionLog('consumed')],
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
      recoveryStatus: 'OPTIMAL',
      readinessLevel: 'HIGH',
      trend: 'IMPROVING',
      trainingImpact: 'FULL_SESSION',
      confidence: 'HIGH',
    });
    expect(result.summary).toContain('status=OPTIMAL');
    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      analysis: expect.objectContaining({
        recoveryStatus: 'OPTIMAL',
        trend: expect.objectContaining({ trend: 'IMPROVING' }),
        nutritionSupport: expect.objectContaining({ level: 'SUPPORTIVE' }),
        goalAlignment: 'strength',
      }),
    });
    expect(result.contributions[1]).toMatchObject({
      type: 'CONTRIBUTION',
      summary: 'Maintain recovery routine.',
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
        nutritionProfile: {
          goal: 'maintenance',
          mealsPerDay: 4,
          dietaryRestrictions: [],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: [],
        },
        recentWorkoutLogs: [buildWorkoutLog()],
      }),
      todayNutrition: buildTodayNutrition(72),
      nutritionLogs: [
        buildNutritionLog('consumed'),
        buildNutritionLog('partial'),
      ],
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
    expect(result.metadata.analysis.nutritionSupport.level).toBe(
      'INSUFFICIENT',
    );
    expect(
      result.metadata.analysis.recommendations.map(
        (recommendation) => recommendation.code,
      ),
    ).toContain('REDUCE_TODAYS_INTENSITY');
    expect(result.contributions[1].summary).toBe('Prioritize recovery.');
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
        nutritionProfile: {
          goal: 'fat_loss',
          mealsPerDay: 3,
          dietaryRestrictions: [],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: [],
        },
        recentWorkoutLogs: [],
      }),
      todayNutrition: buildTodayNutrition(38),
      nutritionLogs: [
        buildNutritionLog('skipped'),
        buildNutritionLog('skipped'),
      ],
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
        nutritionProfile: {
          goal: 'fat_loss',
          mealsPerDay: 3,
          dietaryRestrictions: [],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: [],
        },
        recentWorkoutLogs: [],
      }),
      todayNutrition: buildTodayNutrition(84),
      nutritionLogs: [buildNutritionLog('consumed')],
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
    nutritionProfile: {
      goal: 'maintenance',
      mealsPerDay: 3,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: [],
    },
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

function buildTodayNutrition(adherencePercentage: number) {
  return {
    date: '2026-07-07',
    macroTargets: {
      calories: 2200,
      proteinGrams: 150,
      carbsGrams: 240,
      fatGrams: 70,
    },
    meals: [],
    progress: {
      consumedCalories: adherencePercentage >= 100 ? 2200 : 1600,
      consumedProteinGrams: adherencePercentage >= 100 ? 150 : 110,
      consumedCarbsGrams: adherencePercentage >= 100 ? 240 : 170,
      consumedFatGrams: adherencePercentage >= 100 ? 70 : 52,
      targetCalories: 2200,
      targetProteinGrams: 150,
      targetCarbsGrams: 240,
      targetFatGrams: 70,
      adherencePercentage,
    },
    nextMeal: null,
    nutritionFocus: 'Focus on recovery nutrition consistency.',
  } as never;
}

function buildNutritionLog(status: 'consumed' | 'partial' | 'skipped') {
  return {
    id: `nutrition_log_${status}`,
    userProfileId: 'profile_123',
    nutritionPlanId: 'nutrition_plan_123',
    mealId: `meal_${status}`,
    date: '2026-07-07',
    mealType: 'breakfast',
    status,
    actualMacros: undefined,
    createdAt: new Date('2026-07-07T08:00:00.000Z'),
    updatedAt: new Date('2026-07-07T08:00:00.000Z'),
  } as never;
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
