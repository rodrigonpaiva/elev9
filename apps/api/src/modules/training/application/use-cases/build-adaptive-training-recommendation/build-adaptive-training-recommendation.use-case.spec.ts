import { AdaptiveTrainingRecommendationCalculatorService } from '../../services/adaptive-training-recommendation-calculator.service';
import { AdaptiveTrainingDateService } from '../../services/adaptive-training-date.service';
import { BuildAdaptiveTrainingRecommendationError } from './build-adaptive-training-recommendation.errors';
import { BuildAdaptiveTrainingRecommendationUseCase } from './build-adaptive-training-recommendation.use-case';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../../nutrition/domain/repositories/nutrition-log.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../../nutrition/domain/repositories/nutrition-plan.repository';
import {
  NUTRITION_RECOMMENDATION_REPOSITORY,
  NutritionRecommendationRepository,
} from '../../../../nutrition/domain/repositories/nutrition-recommendation.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../domain/repositories/training-plan.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  AdaptiveTrainingRecommendationRepository,
} from '../../../domain/repositories/adaptive-training-recommendation.repository';

describe('BuildAdaptiveTrainingRecommendationUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let recoverySnapshotRepository: jest.Mocked<RecoverySnapshotRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let nutritionLogRepository: jest.Mocked<NutritionLogRepository>;
  let nutritionRecommendationRepository: jest.Mocked<NutritionRecommendationRepository>;
  let adaptiveTrainingRecommendationRepository: jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  let adaptiveTrainingRecommendationCalculatorService: jest.Mocked<AdaptiveTrainingRecommendationCalculatorService>;
  let adaptiveTrainingDateService: jest.Mocked<AdaptiveTrainingDateService>;
  let useCase: BuildAdaptiveTrainingRecommendationUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-02T10:00:00.000Z'));

    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };

    fitnessProfileRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
    };

    trainingPlanRepository = {
      findById: jest.fn(),
      findActiveByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    };

    workoutLogRepository = {
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      create: jest.fn(),
    };

    recoverySnapshotRepository = {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    };

    nutritionPlanRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
      replaceActiveByUserProfileId: jest.fn(),
      replaceMeal: jest.fn(),
    };

    nutritionLogRepository = {
      create: jest.fn(),
      findByUserProfileIdAndDate: jest.fn(),
      findByUserProfileIdAndDateRange: jest.fn(),
      findByMealId: jest.fn(),
    };

    nutritionRecommendationRepository = {
      create: jest.fn(),
      findManyByUserProfileId: jest.fn(),
    };

    adaptiveTrainingRecommendationRepository = {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      upsertDailyRecommendation: jest.fn(),
    };

    adaptiveTrainingRecommendationCalculatorService = {
      calculate: jest.fn(),
    } as never;

    adaptiveTrainingDateService = {
      todayUtcDateString: jest.fn().mockReturnValue('2026-06-02'),
    } as never;

    useCase = new BuildAdaptiveTrainingRecommendationUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      recoverySnapshotRepository,
      nutritionPlanRepository,
      nutritionLogRepository,
      nutritionRecommendationRepository,
      adaptiveTrainingRecommendationRepository,
      adaptiveTrainingRecommendationCalculatorService,
      adaptiveTrainingDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds and persists a recommendation from all signals', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeRecoverySnapshot();
    arrangeWorkoutLogs();
    arrangeNutritionPlanAndLogs();
    arrangeNutritionRecommendation();
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation(),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(adaptiveTrainingDateService.todayUtcDateString).toHaveBeenCalled();
    expect(
      adaptiveTrainingRecommendationCalculatorService.calculate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        readinessScore: 84,
        fatigueScore: 22,
        recoveryTrend: 'improving',
        recoveryRecommendedIntensity: 'hard',
        adherenceScore: 75,
        currentStreak: 3,
        missedWorkouts: 1,
        recentWorkoutLoad: 100,
        nutritionAdherence: 34,
      }),
    );
    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        trainingPlanId: 'training_123',
        date: '2026-06-02',
        formulaVersion: 'adaptive-training-deterministic-v1',
        generatedBy: 'deterministic',
        sourceContext: expect.objectContaining({
          readinessScore: 84,
          fatigueScore: 22,
          recoveryTrend: 'improving',
          recoveryRecommendedIntensity: 'hard',
          adherenceScore: 75,
          currentStreak: 3,
          missedWorkouts: 1,
          recentWorkoutLoad: 100,
          nutritionAdherence: 34,
          recentWorkoutLogsCount: 3,
          trainingPlanId: 'training_123',
          nutritionRecommendationId: 'nutrition_recommendation_123',
          formulaVersion: 'adaptive-training-deterministic-v1',
          generatedAt: '2026-06-02T10:00:00.000Z',
        }),
      }),
    );
    expect(result.adaptiveTrainingRecommendation).toEqual(
      buildAdaptiveRecommendation(),
    );
  });

  it('builds a recommendation without a training plan', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile(null);
    arrangeRecoverySnapshot();
    arrangeNutritionRecommendation();
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation({ trainingPlanId: undefined }),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      trainingPlanRepository.findActiveByFitnessProfileId,
    ).not.toHaveBeenCalled();
    expect(
      adaptiveTrainingRecommendationCalculatorService.calculate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        adherenceScore: 50,
        currentStreak: 0,
        missedWorkouts: 0,
        recentWorkoutLoad: 50,
        nutritionAdherence: 82,
      }),
    );
    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingPlanId: undefined,
      }),
    );
  });

  it('uses neutral recovery fallback when no recovery snapshot exists', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(null);
    arrangeWorkoutLogs();
    arrangeNutritionPlanAndLogs();
    arrangeNutritionRecommendation();
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationCalculatorService.calculate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        readinessScore: 50,
        fatigueScore: 50,
        recoveryTrend: 'stable',
        recoveryRecommendedIntensity: 'moderate',
      }),
    );
  });

  it('uses neutral nutrition fallback when no nutrition signals exist', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeRecoverySnapshot();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(null);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationCalculatorService.calculate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        nutritionAdherence: 50,
      }),
    );
    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceContext: expect.objectContaining({
          nutritionAdherence: 50,
        }),
      }),
    );
  });

  it('uses neutral workout fallbacks when no workout logs exist', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeRecoverySnapshot();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    arrangeNutritionRecommendation();
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationCalculatorService.calculate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStreak: 0,
        recentWorkoutLoad: 50,
        adherenceScore: 50,
      }),
    );
  });

  it('returns the persisted recommendation and keeps the date stable across repeated runs', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeRecoverySnapshot();
    arrangeWorkoutLogs();
    arrangeNutritionPlanAndLogs();
    arrangeNutritionRecommendation();
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });
    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation,
    ).toHaveBeenCalledTimes(2);
    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mock
        .calls[0][0].date,
    ).toBe('2026-06-02');
    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mock
        .calls[1][0].date,
    ).toBe('2026-06-02');
  });

  it('uses only the reduced source context fields', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeRecoverySnapshot();
    arrangeWorkoutLogs();
    arrangeNutritionPlanAndLogs();
    arrangeNutritionRecommendation();
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    const sourceContext =
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mock
        .calls[0][0].sourceContext;

    expect(Object.keys(sourceContext).sort()).toEqual(
      [
        'adherenceScore',
        'currentStreak',
        'fatigueScore',
        'formulaVersion',
        'generatedAt',
        'missedWorkouts',
        'nutritionAdherence',
        'nutritionRecommendationId',
        'readinessScore',
        'recentWorkoutLoad',
        'recentWorkoutLogsCount',
        'recoveryRecommendedIntensity',
        'recoveryTrend',
        'trainingPlanId',
      ].sort(),
    );
    expect((sourceContext as Record<string, unknown>).recoverySnapshotId).toBeUndefined();
  });

  it('throws when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });

  it('throws when the auth session is invalid', async () => {
    await expect(useCase.execute({ authUserId: '   ' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_SESSION',
    });
  });

  it('uses the calculator influences in the persisted recommendation', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeTrainingPlan();
    arrangeRecoverySnapshot();
    arrangeWorkoutLogs();
    arrangeNutritionPlanAndLogs();
    arrangeNutritionRecommendation();
    adaptiveTrainingRecommendationCalculatorService.calculate.mockReturnValue({
      recommendationType: 'maintain',
      recommendedIntensity: 'moderate',
      volumeAction: 'maintain',
      reasoning: 'Balanced signals.',
      influences: [
        {
          code: 'HIGH_READINESS',
          label: 'Readiness is high.',
          impact: 'positive',
        } as never,
      ],
    });
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        influences: [
          {
            code: 'HIGH_READINESS',
            label: 'Readiness is high.',
            impact: 'positive',
          },
        ],
      }),
    );
  });

  it('keeps trainingPlanId optional when a plan does not exist', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile(null);
    arrangeRecoverySnapshot();
    arrangeNutritionRecommendation();
    arrangeCalculatorResult();
    adaptiveTrainingRecommendationRepository.upsertDailyRecommendation.mockResolvedValue(
      buildAdaptiveRecommendation({ trainingPlanId: undefined }),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationRepository.upsertDailyRecommendation,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingPlanId: undefined,
      }),
    );
  });

  function arrangeUserProfile(): void {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo Paiva',
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    } as never);
  }

  function arrangeFitnessProfile(value: unknown = {
    id: 'fitness_123',
    userProfileId: 'profile_123',
    heightCm: 180,
    weightKg: 82.5,
    goal: 'gain_muscle',
    activityLevel: 'medium',
    trainingAvailability: {
      daysPerWeek: 4,
      minutesPerSession: 60,
    },
    limitations: [],
    status: 'active',
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    updatedAt: new Date('2026-06-01T10:00:00.000Z'),
  }): void {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      value as never,
    );
  }

  function arrangeTrainingPlan(): void {
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue({
      id: 'training_123',
      fitnessProfileId: 'fitness_123',
      goal: 'gain_muscle',
      activityLevel: 'medium',
      weeklySchedule: [
        { dayIndex: 1, title: 'Day 1', focus: 'upper', format: 'strength', intensity: 'high', exercises: [] },
        { dayIndex: 2, title: 'Day 2', focus: 'lower', format: 'strength', intensity: 'high', exercises: [] },
        { dayIndex: 3, title: 'Day 3', focus: 'circuit', format: 'circuit', intensity: 'moderate', exercises: [] },
        { dayIndex: 4, title: 'Day 4', focus: 'full', format: 'strength', intensity: 'moderate', exercises: [] },
      ],
      status: 'active',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    } as never);
  }

  function arrangeRecoverySnapshot(): void {
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue({
      userProfileId: 'profile_123',
      date: '2026-06-02',
      readinessScore: 84,
      fatigueScore: 22,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      influences: [],
      formulaVersion: 'recovery-deterministic-v1',
      sourceContext: {},
      createdAt: new Date('2026-06-02T08:00:00.000Z'),
    } as never);
  }

  function arrangeWorkoutLogs(): void {
    const logs = [
      buildWorkoutLog('2026-06-02', 45, 4),
      buildWorkoutLog('2026-06-01', 60, 5),
      buildWorkoutLog('2026-05-31', 30, 3),
    ];

    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      logs as never,
    );
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue(
      logs as never,
    );
  }

  function arrangeNutritionPlanAndLogs(): void {
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'nutrition_plan_123',
      userProfileId: 'profile_123',
      nutritionProfileId: 'nutrition_profile_123',
      fitnessProfileId: 'fitness_123',
      status: 'active',
      weekStartDate: '2026-06-01',
      weekEndDate: '2026-06-07',
      macroTargets: {
        calories: 2200,
        proteinGrams: 150,
        carbsGrams: 250,
        fatGrams: 70,
      },
      days: [
        {
          date: '2026-06-02',
          dayIndex: 1,
          dailyMacroTargets: {
            calories: 2200,
            proteinGrams: 150,
            carbsGrams: 250,
            fatGrams: 70,
          },
          meals: [],
        },
      ],
      generatedBy: 'deterministic',
      sourceContext: {},
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-01T10:00:00.000Z'),
    } as never);

    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([
      buildNutritionLog('breakfast', 500),
      buildNutritionLog('lunch', 250),
    ] as never);
  }

  function arrangeNutritionRecommendation(): void {
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [
        {
          id: 'nutrition_recommendation_123',
          userProfileId: 'profile_123',
          message: 'Stay consistent.',
          recommendations: ['Choose protein first.'],
          influences: ['HIGH_ADHERENCE'],
          generatorVersion: 'nutrition-deterministic-v1',
          contextSnapshot: {
            adherenceScore: 82,
            goal: 'muscle_gain',
          },
          createdAt: new Date('2026-06-02T09:00:00.000Z'),
        } as never,
      ],
    );
  }

  function arrangeCalculatorResult() {
    adaptiveTrainingRecommendationCalculatorService.calculate.mockReturnValue({
      recommendationType: 'increase_intensity',
      recommendedIntensity: 'hard',
      volumeAction: 'increase',
      reasoning: 'High readiness and low fatigue support progression.',
      influences: [
        {
          code: 'HIGH_READINESS',
          label: 'Readiness is high.',
          impact: 'positive',
          weight: 0.25,
          value: 84,
        },
      ],
    });
  }

  function buildWorkoutLog(
    date: string,
    durationMinutes: number,
    completedExercisesCount: number,
  ) {
    return {
      id: `workout_${date}`,
      trainingPlanId: 'training_123',
      workoutDayIndex: 1,
      durationMinutes,
      completedExercises: Array.from(
        { length: completedExercisesCount },
        (_, index) => ({
          name: `exercise_${index + 1}`,
          setsDone: 3,
          repsDone: 10,
        }),
      ),
      feedback: {
        difficulty: 'medium' as const,
      },
      date,
      createdAt: new Date(`${date}T12:00:00.000Z`),
      updatedAt: new Date(`${date}T12:00:00.000Z`),
    };
  }

  function buildNutritionLog(mealId: string, calories: number) {
    return {
      id: `nutrition_log_${mealId}`,
      userProfileId: 'profile_123',
      nutritionPlanId: 'nutrition_plan_123',
      mealId,
      date: '2026-06-02',
      mealType: mealId === 'breakfast' ? 'breakfast' : 'lunch',
      status: 'consumed',
      actualMacros: {
        calories,
        proteinGrams: calories === 500 ? 35 : 20,
        carbsGrams: calories === 500 ? 55 : 25,
        fatGrams: calories === 500 ? 15 : 8,
      },
      createdAt: new Date('2026-06-02T12:00:00.000Z'),
      updatedAt: new Date('2026-06-02T12:00:00.000Z'),
    };
  }

  function buildAdaptiveRecommendation(overrides: { trainingPlanId?: string } = {}) {
    return {
      id: 'adaptive_recommendation_123',
      userProfileId: 'profile_123',
      trainingPlanId: overrides.trainingPlanId ?? 'training_123',
      date: '2026-06-02',
      recommendationType: 'increase_intensity',
      recommendedIntensity: 'hard',
      volumeAction: 'increase',
      reasoning: 'High readiness and low fatigue support progression.',
      influences: [
        {
          code: 'HIGH_READINESS',
          label: 'Readiness is high.',
          impact: 'positive',
          weight: 0.25,
          value: 84,
        },
      ],
      sourceContext: {
        readinessScore: 84,
        fatigueScore: 22,
        recoveryTrend: 'improving',
        recoveryRecommendedIntensity: 'hard',
        adherenceScore: 75,
        currentStreak: 3,
        missedWorkouts: 0,
        recentWorkoutLoad: 80,
        nutritionAdherence: 82,
        recentWorkoutLogsCount: 3,
        trainingPlanId: overrides.trainingPlanId ?? 'training_123',
        nutritionRecommendationId: 'nutrition_recommendation_123',
        formulaVersion: 'adaptive-training-deterministic-v1',
        generatedAt: '2026-06-02T10:00:00.000Z',
      },
      formulaVersion: 'adaptive-training-deterministic-v1',
      generatedBy: 'deterministic',
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    } as never;
  }
});
