import { CoachExpertRegistry } from '../coach-expert.registry';
import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import { NutritionExpert } from './nutrition-expert.service';

describe('NutritionExpert', () => {
  const expert = new NutritionExpert();

  it('analyzes a complete nutrition day as on-track with strong confidence', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          goal: 'gain_muscle',
          todayWorkout: buildTodayWorkout(),
          recoverySnapshot: {
            readinessScore: 88,
            fatigueScore: 18,
            recoveryTrend: 'improving',
            recommendedIntensity: 'hard',
            influences: [],
            formulaVersion: 'recovery-v1',
            createdAt: new Date('2026-07-07T07:00:00.000Z'),
            date: '2026-07-07',
          },
        }),
        nutritionPlan: buildNutritionPlan(),
        todayNutrition: buildTodayNutrition({
          progress: {
            consumedCalories: 2200,
            consumedProteinGrams: 150,
            consumedCarbsGrams: 240,
            consumedFatGrams: 70,
            targetCalories: 2200,
            targetProteinGrams: 150,
            targetCarbsGrams: 240,
            targetFatGrams: 70,
            adherencePercentage: 100,
          },
          nextMeal: null,
        }),
        nutritionLogs: buildNutritionLogs(['consumed', 'consumed', 'consumed']),
      }),
    );

    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      analysis: expect.objectContaining({
        nutritionStatus: 'ON_TRACK',
        goalAlignment: 'strength',
      }),
    });
    expect(result.metadata.analysis.macroAssessment.overallStatus).toBe(
      'ON_TRACK',
    );
    expect(result.metadata.analysis.mealAssessment.mealTiming).toBe('AHEAD');
    expect(result.contributions[1]).toMatchObject({
      summary: 'Maintain current nutrition plan.',
    });
  });

  it('classifies partial adherence and supports recovery without overcommitting', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          goal: 'maintain',
          todayWorkout: buildTodayWorkout({ focus: 'conditioning' }),
          recoverySnapshot: {
            readinessScore: 52,
            fatigueScore: 48,
            recoveryTrend: 'stable',
            recommendedIntensity: 'moderate',
            influences: [],
            formulaVersion: 'recovery-v1',
            createdAt: new Date('2026-07-07T07:00:00.000Z'),
            date: '2026-07-07',
          },
        }),
        nutritionPlan: buildNutritionPlan(),
        todayNutrition: buildTodayNutrition({
          meals: [
            buildMeal({ id: 'meal_1', type: 'breakfast' }),
            buildMeal({ id: 'meal_2', type: 'lunch' }),
            buildMeal({ id: 'meal_3', type: 'dinner' }),
          ],
          progress: {
            consumedCalories: 1800,
            consumedProteinGrams: 130,
            consumedCarbsGrams: 210,
            consumedFatGrams: 60,
            targetCalories: 2200,
            targetProteinGrams: 150,
            targetCarbsGrams: 240,
            targetFatGrams: 70,
            adherencePercentage: 87,
          },
          nextMeal: buildMeal({ id: 'meal_3', type: 'dinner' }),
        }),
        nutritionLogs: buildNutritionLogs(['consumed', 'partial', 'consumed']),
      }),
    );

    expect(result.metadata.analysis.nutritionStatus).toBe('PARTIAL');
    expect(result.metadata.analysis.macroAssessment.protein.status).toBe(
      'PARTIAL',
    );
    expect(result.metadata.analysis.recoverySupport.level).toBe('PARTIAL');
    expect(result.metadata.analysis.mealAssessment.partialCount).toBe(1);
    expect(result.metadata.analysis.confidence).toBe('HIGH');
    expect(result.contributions[1].summary).toContain(
      'Distribute protein more evenly.',
    );
  });

  it('marks skipped meals as missed and recommends completing the remaining meals', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          goal: 'fat_loss',
          recoverySnapshot: {
            readinessScore: 34,
            fatigueScore: 72,
            recoveryTrend: 'needs_recovery',
            recommendedIntensity: 'light',
            influences: [],
            formulaVersion: 'recovery-v1',
            createdAt: new Date('2026-07-07T07:00:00.000Z'),
            date: '2026-07-07',
          },
        }),
        nutritionPlan: buildNutritionPlan(),
        todayNutrition: buildTodayNutrition({
          progress: {
            consumedCalories: 900,
            consumedProteinGrams: 55,
            consumedCarbsGrams: 90,
            consumedFatGrams: 25,
            targetCalories: 2200,
            targetProteinGrams: 150,
            targetCarbsGrams: 240,
            targetFatGrams: 70,
            adherencePercentage: 41,
          },
          nextMeal: buildMeal({ id: 'meal_2', type: 'lunch' }),
        }),
        nutritionLogs: buildNutritionLogs(['consumed', 'skipped', 'partial']),
      }),
    );

    expect(result.metadata.analysis.nutritionStatus).toBe('MISSED');
    expect(result.metadata.analysis.mealAssessment.missedCount).toBe(1);
    expect(result.metadata.analysis.riskAssessment.level).toBe('CRITICAL');
    expect(result.contributions[1]).toMatchObject({
      summary: 'Complete remaining meals.',
    });
  });

  it('returns a no-profile analysis when nutrition data is missing', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          nutritionProfile: undefined,
        }),
        nutritionPlan: undefined,
        todayNutrition: undefined,
        nutritionLogs: [],
      }),
    );

    expect(result.metadata.analysis.nutritionStatus).toBe('NO_PROFILE');
    expect(result.metadata.analysis.riskAssessment.level).toBe('CRITICAL');
    expect(result.contributions[1]).toMatchObject({
      summary: 'Set up a nutrition profile.',
    });
  });

  it('returns a no-plan analysis when the active nutrition plan is unavailable', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        nutritionPlan: undefined,
        todayNutrition: undefined,
        nutritionLogs: [],
      }),
    );

    expect(result.metadata.analysis.nutritionStatus).toBe('NO_PLAN');
    expect(result.metadata.analysis.riskAssessment.level).toBe('HIGH');
    expect(result.contributions[1]).toMatchObject({
      summary: 'Create or refresh the nutrition plan.',
    });
  });

  it('detects restriction and allergy conflicts in the meal plan', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          nutritionProfile: {
            goal: 'muscle_gain',
            mealsPerDay: 3,
            dietaryRestrictions: ['gluten'],
            allergies: ['peanut'],
            dislikedFoods: ['broccoli'],
            preferredFoods: ['rice'],
          },
        }),
        nutritionPlan: buildNutritionPlan(),
        todayNutrition: buildTodayNutrition({
          meals: [
            buildMeal({
              id: 'meal_1',
              title: 'Peanut butter oats',
              description: 'Contains peanut butter and gluten-free oats.',
            }),
          ],
          progress: {
            consumedCalories: 500,
            consumedProteinGrams: 30,
            consumedCarbsGrams: 40,
            consumedFatGrams: 22,
            targetCalories: 2200,
            targetProteinGrams: 150,
            targetCarbsGrams: 240,
            targetFatGrams: 70,
            adherencePercentage: 23,
          },
          nextMeal: buildMeal({ id: 'meal_1', type: 'breakfast' }),
        }),
        nutritionLogs: buildNutritionLogs(['consumed']),
      }),
    );

    expect(result.metadata.analysis.restrictionConflicts).toBeGreaterThan(0);
    expect(result.metadata.analysis.allergyConflicts).toBeGreaterThan(0);
    expect(result.metadata.analysis.riskAssessment.level).toBe('CRITICAL');
    expect(result.contributions[1].summary).toContain(
      'Address allergy conflicts',
    );
  });

  it('respects blocked policy evaluations', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
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
              stage: 'PLANNING',
              evaluatedPolicyIds: [],
              rejectedPolicyIds: ['nutrition-policy'],
              violationCount: 1,
              fallbackDecisionCount: 1,
              blockedDomainIds: ['nutrition'],
              blockedToolIds: [],
              blockedLlmUsage: true,
              allowedDomainCount: 0,
              allowedToolCount: 0,
              allowedExpertCount: 0,
              candidateExpertCount: 0,
              selectedExpertCount: 0,
              estimatedCost: 0,
              estimatedLatencyMs: 0,
              maximumExecutionDepth: 0,
              maxSteps: 6,
              maxToolCalls: 4,
              evaluationDurationMs: 1,
            },
          },
          violations: [],
          reason: 'blocked',
          actions: [],
        },
      }),
    );

    expect(result.metadata.analysis.nutritionStatus).toBe('UNKNOWN');
    expect(result.metadata.analysis.riskAssessment.level).toBe('CRITICAL');
    expect(result.contributions).toHaveLength(2);
  });

  it('attaches nutrition runtime metadata and is registered for nutrition intent', () => {
    const loaded = expert.loadContext(
      buildRequest(),
      buildContext({
        nutritionPlan: buildNutritionPlan(),
        todayNutrition: buildTodayNutrition(),
        nutritionLogs: buildNutritionLogs(['consumed', 'consumed', 'consumed']),
      }),
    );

    expect(loaded.runtimeMetadata).toMatchObject({
      nutritionExpert: expect.objectContaining({
        expertId: 'NutritionExpert',
        nutritionStatus: 'ON_TRACK',
      }),
    });

    const registry = new CoachExpertRegistry();

    expect(
      registry
        .getExpertsForIntent('NUTRITION')
        .map((entry) => entry.metadata.id),
    ).toContain('NutritionExpert');
  });
});

function buildRequest(): CoachExpertRequest {
  return {
    userId: 'profile_123',
    conversationId: 'conversation_123',
    userMessage: 'How should I handle today?',
    sessionMetadata: {
      requestId: 'request_123',
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      conversationId: 'conversation_123',
      userIdHash: 'user-hash-123',
    },
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: false,
    experimentMetadata: {
      experimentId: 'coach-chat-evaluation-rollout',
      promptId: 'coach-chat',
      currentPromptVersion: 'coach-chat-prompt-v1',
      previousPromptVersion: 'coach-chat-prompt-v0',
      selectedPromptVersion: 'coach-chat-prompt-v1',
      currentProvider: 'openai',
      previousProvider: 'openai',
      selectedProvider: 'openai',
      currentModel: 'gpt-4.1-mini',
      previousModel: 'gpt-4.1-mini',
      selectedModel: 'gpt-4.1-mini',
      canaryBucket: 12,
      canaryPercentage: 100,
      streamingEnabled: false,
      structuredOutputsEnabled: true,
      toolCallingEnabled: false,
      futureMemoryEnabled: false,
      rolloutVariant: 'current',
    } as never,
    intent: 'NUTRITION',
    selectedDomains: ['nutrition', 'goals', 'recovery'],
    candidateExperts: [],
    selectedExperts: [],
  } as never;
}

function buildContext(
  overrides: Partial<CoachExpertContext> & {
    healthContext?: Partial<NonNullable<CoachExpertContext['healthContext']>>;
  } = {},
): CoachExpertContext {
  const healthContext = buildHealthContext(overrides.healthContext);

  return {
    request: buildRequest(),
    healthContext,
    nutritionPlan:
      'nutritionPlan' in overrides
        ? overrides.nutritionPlan
        : buildNutritionPlan(),
    todayNutrition:
      'todayNutrition' in overrides
        ? overrides.todayNutrition
        : buildTodayNutrition(),
    nutritionLogs:
      'nutritionLogs' in overrides
        ? overrides.nutritionLogs
        : buildNutritionLogs(['consumed', 'consumed', 'consumed']),
    selectionReason: 'intent=NUTRITION; domains=nutrition,goals,recovery',
    runtimeMetadata: Object.freeze({}),
    ...(overrides.policyEvaluation
      ? { policyEvaluation: overrides.policyEvaluation }
      : {}),
  };
}

function buildHealthContext(
  overrides: Partial<NonNullable<CoachExpertContext['healthContext']>> = {},
): NonNullable<CoachExpertContext['healthContext']> {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    userName: 'Rodrigo Paiva',
    goal: 'gain_muscle',
    activityLevel: 'high',
    weeklyFrequency: 4,
    adherenceScore: 82,
    currentStreak: 5,
    averageWorkoutDuration: 55,
    fatigueLevel: 'LOW',
    availableEquipment: ['barbell', 'dumbbells'],
    limitations: [],
    todayWorkout: null,
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-07-07T08:00:00.000Z'),
    nutritionProfile: {
      goal: 'muscle_gain',
      mealsPerDay: 4,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: ['rice', 'eggs'],
    },
    recoverySnapshot: {
      date: '2026-07-07',
      readinessScore: 82,
      fatigueScore: 18,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      influences: [],
      formulaVersion: 'recovery-v1',
      createdAt: new Date('2026-07-07T07:00:00.000Z'),
    },
    ...overrides,
  } as never;
}

function buildNutritionPlan(
  overrides: Partial<NonNullable<CoachExpertContext['nutritionPlan']>> = {},
) {
  return {
    id: 'nutrition_plan_123',
    userProfileId: 'profile_123',
    nutritionProfileId: 'nutrition_profile_123',
    fitnessProfileId: 'fitness_profile_123',
    status: 'active',
    weekStartDate: '2026-07-06',
    weekEndDate: '2026-07-12',
    macroTargets: {
      calories: 2200,
      proteinGrams: 150,
      carbsGrams: 240,
      fatGrams: 70,
    },
    days: [
      {
        date: '2026-07-07',
        dayIndex: 2,
        meals: [
          buildMeal({ id: 'meal_1', type: 'breakfast' }),
          buildMeal({ id: 'meal_2', type: 'lunch' }),
          buildMeal({ id: 'meal_3', type: 'dinner' }),
        ],
        dailyMacroTargets: {
          calories: 2200,
          proteinGrams: 150,
          carbsGrams: 240,
          fatGrams: 70,
        },
      },
    ],
    generatedBy: 'deterministic',
    createdAt: new Date('2026-07-06T00:00:00.000Z'),
    ...overrides,
  } as never;
}

function buildTodayNutrition(
  overrides: Partial<NonNullable<CoachExpertContext['todayNutrition']>> = {},
) {
  return {
    date: '2026-07-07',
    macroTargets: {
      calories: 2200,
      proteinGrams: 150,
      carbsGrams: 240,
      fatGrams: 70,
    },
    meals: [
      buildMeal({ id: 'meal_1', type: 'breakfast', title: 'Protein oats' }),
      buildMeal({ id: 'meal_2', type: 'lunch', title: 'Chicken rice bowl' }),
      buildMeal({ id: 'meal_3', type: 'dinner', title: 'Salmon and potatoes' }),
    ],
    progress: {
      consumedCalories: 2200,
      consumedProteinGrams: 150,
      consumedCarbsGrams: 240,
      consumedFatGrams: 70,
      targetCalories: 2200,
      targetProteinGrams: 150,
      targetCarbsGrams: 240,
      targetFatGrams: 70,
      adherencePercentage: 100,
    },
    nextMeal: null,
    nutritionFocus: 'Focus on consistency and balanced meals across the day.',
    ...overrides,
  } as never;
}

function buildNutritionLogs(
  statuses: readonly Array<'consumed' | 'partial' | 'skipped'>,
) {
  return statuses.map((status, index) => ({
    id: `nutrition_log_${index + 1}`,
    userProfileId: 'profile_123',
    nutritionPlanId: 'nutrition_plan_123',
    mealId: `meal_${index + 1}`,
    date: '2026-07-07',
    mealType: (['breakfast', 'lunch', 'dinner'] as const)[index] ?? 'snack',
    status,
    actualMacros:
      status === 'skipped'
        ? undefined
        : {
            calories: status === 'partial' ? 300 : 700,
            proteinGrams: status === 'partial' ? 20 : 50,
            carbsGrams: status === 'partial' ? 30 : 70,
            fatGrams: status === 'partial' ? 10 : 20,
          },
    createdAt: new Date('2026-07-07T08:00:00.000Z'),
    updatedAt: new Date('2026-07-07T08:00:00.000Z'),
  })) as never;
}

function buildMeal(
  overrides: Partial<
    NonNullable<CoachExpertContext['todayNutrition']>['meals'][number]
  > = {},
) {
  return {
    id: 'meal_1',
    type: 'breakfast',
    title: 'Protein oats',
    description: 'Oats with protein and fruit.',
    foodItems: [
      {
        name: 'Oats',
        quantity: '80',
        unit: 'g',
        estimatedMacros: {
          calories: 300,
          proteinGrams: 10,
          carbsGrams: 50,
          fatGrams: 5,
        },
        tags: ['carbs'],
      },
      {
        name: 'Egg whites',
        quantity: '200',
        unit: 'g',
        estimatedMacros: {
          calories: 100,
          proteinGrams: 20,
          carbsGrams: 2,
          fatGrams: 0,
        },
        tags: ['protein'],
      },
    ],
    estimatedMacros: {
      calories: 400,
      proteinGrams: 30,
      carbsGrams: 45,
      fatGrams: 10,
    },
    alternatives: [],
    status: 'planned',
    ...overrides,
  } as never;
}

function buildTodayWorkout(
  overrides: Partial<
    NonNullable<CoachExpertContext['healthContext']>['todayWorkout']
  > = {},
) {
  return {
    dayIndex: 1,
    title: 'Upper Body Strength',
    focus: 'strength',
    format: 'weights',
    intensity: 'hard',
    exercises: [
      {
        name: 'Bench Press',
        sets: 4,
        reps: 5,
      },
    ],
    ...overrides,
  } as never;
}
