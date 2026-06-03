import { DailyCheckIn } from '../../../../progress/domain/entities/daily-check-in.entity';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import { DailyCheckInRepository } from '../../../../progress/domain/repositories/daily-check-in.repository';
import { WorkoutLogRepository } from '../../../../progress/domain/repositories/workout-log.repository';
import { FitnessProfile } from '../../../../fitness/domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { NutritionLogRepository } from '../../../../nutrition/domain/repositories/nutrition-log.repository';
import { NutritionPlanRepository } from '../../../../nutrition/domain/repositories/nutrition-plan.repository';
import { RecoverySnapshotRepository } from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import { AdaptiveTrainingRecommendationRepository } from '../../../../training/domain/repositories/adaptive-training-recommendation.repository';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { Goal } from '../../../domain/entities/goal.entity';
import { GoalProgressSnapshot } from '../../../domain/entities/goal-progress-snapshot.entity';
import { GoalProgressSnapshotRepository } from '../../../domain/repositories/goal-progress-snapshot.repository';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { GoalProgressCalculatorService } from '../../services/goal-progress-calculator.service';
import { GoalDateService } from '../../services/goal-date.service';
import {
  BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES,
} from './build-goal-progress-snapshot.errors';
import { BuildGoalProgressSnapshotUseCase } from './build-goal-progress-snapshot.use-case';

describe('BuildGoalProgressSnapshotUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let goalRepository: jest.Mocked<GoalRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let nutritionLogRepository: jest.Mocked<NutritionLogRepository>;
  let recoverySnapshotRepository: jest.Mocked<RecoverySnapshotRepository>;
  let adaptiveTrainingRecommendationRepository: jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  let goalProgressSnapshotRepository: jest.Mocked<GoalProgressSnapshotRepository>;
  let goalProgressCalculatorService: jest.Mocked<GoalProgressCalculatorService>;
  let goalDateService: GoalDateService;
  let useCase: BuildGoalProgressSnapshotUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    goalRepository = buildGoalRepository();
    fitnessProfileRepository = buildFitnessProfileRepository();
    trainingPlanRepository = buildTrainingPlanRepository();
    workoutLogRepository = buildWorkoutLogRepository();
    dailyCheckInRepository = buildDailyCheckInRepository();
    nutritionPlanRepository = buildNutritionPlanRepository();
    nutritionLogRepository = buildNutritionLogRepository();
    recoverySnapshotRepository = buildRecoverySnapshotRepository();
    adaptiveTrainingRecommendationRepository =
      buildAdaptiveTrainingRecommendationRepository();
    goalProgressSnapshotRepository = buildGoalProgressSnapshotRepository();
    goalProgressCalculatorService = buildGoalProgressCalculatorService();
    goalDateService = new GoalDateService();

    useCase = new BuildGoalProgressSnapshotUseCase(
      userProfileRepository,
      goalRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      dailyCheckInRepository,
      nutritionPlanRepository,
      nutritionLogRepository,
      recoverySnapshotRepository,
      adaptiveTrainingRecommendationRepository,
      goalProgressSnapshotRepository,
      goalProgressCalculatorService,
      goalDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds and persists a progress snapshot with full signals', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'lose_weight', targetValue: 75 });
    arrangeFitnessProfile({ weightKg: 82 });
    arrangeTrainingPlan();
    arrangeWorkoutLogs();
    arrangeDailyCheckIns();
    arrangeNutritionPlan();
    arrangeNutritionLogs();
    arrangeRecoverySnapshot();
    arrangeAdaptiveTrainingRecommendation();
    arrangeRecentGoalSnapshots([
      { date: '2026-06-01', progressPercentage: 42 },
      { date: '2026-06-02', progressPercentage: 44 },
    ]);
    goalProgressCalculatorService.calculate.mockReturnValue(
      buildCalculatorResult(),
    );
    goalProgressSnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildProgressSnapshot(),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(userProfileRepository.findByAuthUserId).toHaveBeenCalledWith(
      'auth_user_123',
    );
    expect(goalRepository.findActiveByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
    );
    expect(goalProgressSnapshotRepository.findManyByGoalId).toHaveBeenCalledWith(
      'goal_123',
      { limit: 9 },
    );
    expect(goalProgressCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        goalType: 'lose_weight',
        startValue: 89,
        currentValue: 82,
        targetValue: 75,
        previousSnapshots: [
          { progressPercentage: 42 },
          { progressPercentage: 44 },
        ],
      }),
    );
    expect(goalProgressSnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        goalId: 'goal_123',
        userProfileId: 'profile_123',
        date: '2026-06-03',
        formulaVersion: 'goal-deterministic-v1',
        sourceContext: expect.objectContaining({
          goalType: 'lose_weight',
          startValue: 89,
          currentValue: 82,
          targetValue: 75,
          formulaVersion: 'goal-deterministic-v1',
          generatedAt: '2026-06-03T10:00:00.000Z',
        }),
      }),
    );
    expect(result.goalProgressSnapshot).toBeDefined();
  });

  it('uses neutral fallbacks when signals are missing', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'improve_consistency' });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([]);
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(null);
    nutritionLogRepository.findByUserProfileIdAndDateRange.mockResolvedValue([]);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(null);
    adaptiveTrainingRecommendationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    goalProgressSnapshotRepository.findManyByGoalId.mockResolvedValue([]);
    goalProgressCalculatorService.calculate.mockReturnValue(
      buildCalculatorResult(),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([]);
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(null);
    nutritionLogRepository.findByUserProfileIdAndDateRange.mockResolvedValue([]);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(null);
    adaptiveTrainingRecommendationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    goalProgressSnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildProgressSnapshot(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(goalProgressCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        adherenceScore: 50,
        recoveryScore: 50,
        consistencyScore: 50,
      }),
    );
  });

  it('errors without a user profile', async () => {
    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('errors without an active goal', async () => {
    arrangeUserProfile();
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.GOAL_NOT_FOUND,
    });
  });

  it('errors when target value is required but missing', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'lose_weight', targetValue: undefined });

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES.MISSING_TARGET_VALUE,
    });
  });

  it('uses the date service and preserves user isolation', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'improve_recovery' });
    goalProgressCalculatorService.calculate.mockReturnValue(
      buildCalculatorResult(),
    );
    goalProgressSnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildProgressSnapshot(),
    );
    const todaySpy = jest.spyOn(goalDateService, 'todayUtcDateString');

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(todaySpy).toHaveBeenCalled();
    expect(goalProgressSnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
      }),
    );
  });

  it('persists via daily upsert', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'maintain_weight' });
    goalProgressCalculatorService.calculate.mockReturnValue(
      buildCalculatorResult(),
    );
    goalProgressSnapshotRepository.upsertDailySnapshot.mockResolvedValue(
      buildProgressSnapshot(),
    );

    await useCase.execute({ authUserId: 'auth_user_123' });
    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(goalProgressSnapshotRepository.upsertDailySnapshot).toHaveBeenCalledTimes(
      2,
    );
  });

  function arrangeUserProfile() {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Alex',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  }

  function arrangeGoal(overrides: Partial<{ type: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'improve_consistency' | 'improve_recovery'; targetValue?: number }> = {}) {
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      new Goal({
        id: 'goal_123',
        userProfileId: 'profile_123',
        type: overrides.type ?? 'lose_weight',
        status: { value: 'active' } as never,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        targetDate: undefined,
        achievedAt: undefined,
        targetValue: Object.prototype.hasOwnProperty.call(
          overrides,
          'targetValue',
        )
          ? overrides.targetValue
          : 75,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
  }

  function arrangeFitnessProfile(overrides: { weightKg?: number } = {}) {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'fitness_123',
      userProfileId: 'profile_123',
      heightCm: 180,
      weightKg: overrides.weightKg ?? 82,
      goal: 'lose_weight',
      activityLevel: 'medium',
      trainingAvailability: {
        daysPerWeek: 4,
        minutesPerSession: 45,
      },
      limitations: [],
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      status: 'active',
    } as never);
  }

  function arrangeTrainingPlan() {
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue({
      id: 'training_123',
      fitnessProfileId: 'fitness_123',
      userProfileId: 'profile_123',
      status: 'active',
      goal: 'lose_weight',
      activityLevel: 'medium',
      weeklySchedule: [{}, {}, {}],
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    } as never);
  }

  function arrangeWorkoutLogs() {
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      { date: '2026-06-03', durationMinutes: 45 } as WorkoutLog,
      { date: '2026-06-02', durationMinutes: 50 } as WorkoutLog,
      { date: '2026-06-01', durationMinutes: 40 } as WorkoutLog,
    ]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([
      { date: '2026-06-03', durationMinutes: 45 } as WorkoutLog,
      { date: '2026-06-02', durationMinutes: 50 } as WorkoutLog,
      { date: '2026-06-01', durationMinutes: 40 } as WorkoutLog,
    ]);
  }

  function arrangeDailyCheckIns() {
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([
      { createdAt: new Date('2026-06-03T08:00:00.000Z') } as DailyCheckIn,
      { createdAt: new Date('2026-06-02T08:00:00.000Z') } as DailyCheckIn,
    ]);
  }

  function arrangeNutritionPlan() {
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'nutrition_123',
      userProfileId: 'profile_123',
      nutritionProfileId: 'nutrition_profile_123',
      fitnessProfileId: 'fitness_123',
      status: 'active',
      weekStartDate: '2026-06-01',
      weekEndDate: '2026-06-07',
      macroTargets: {
        calories: 2400,
        proteinGrams: 160,
        carbsGrams: 280,
        fatGrams: 70,
      },
      days: [{ meals: [{}, {}] as never[], dayIndex: 1, date: '2026-06-01', dailyMacroTargets: { calories: 2400, proteinGrams: 160, carbsGrams: 280, fatGrams: 70 } }],
      generatedBy: 'deterministic',
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      sourceContext: undefined,
    } as never);
  }

  function arrangeNutritionLogs() {
    nutritionLogRepository.findByUserProfileIdAndDateRange.mockResolvedValue([
      { id: 'nutrition_log_1', date: '2026-06-03' } as NutritionLog,
      { id: 'nutrition_log_2', date: '2026-06-02' } as NutritionLog,
    ]);
  }

  function arrangeRecoverySnapshot() {
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue({
      readinessScore: 68,
      fatigueScore: 32,
      date: '2026-06-03',
    } as never);
  }

  function arrangeAdaptiveTrainingRecommendation() {
    adaptiveTrainingRecommendationRepository.findLatestByUserProfileId.mockResolvedValue(
      {
        id: 'adaptive_123',
        recommendationType: 'maintain',
        recommendedIntensity: 'moderate',
      } as never,
    );
  }

  function arrangeRecentGoalSnapshots(
    snapshots: Array<{ date: string; progressPercentage: number }>,
  ) {
    goalProgressSnapshotRepository.findManyByGoalId.mockResolvedValue(
      snapshots.map(
        (snapshot) =>
          ({
            goalId: 'goal_123',
            userProfileId: 'profile_123',
            date: snapshot.date,
            progressPercentage: snapshot.progressPercentage,
            currentValue: 0,
            targetValue: 0,
            trend: { value: 'stable' },
            sourceContext: {},
            formulaVersion: 'goal-deterministic-v1',
          }) as GoalProgressSnapshot,
      ),
    );
  }

  function buildCalculatorResult() {
    return {
      progressPercentage: 50,
      trend: 'improving' as const,
      forecast: {
        predictedCompletionDays: 30,
        confidence: 'medium' as const,
      },
      milestones: [],
    };
  }

  function buildProgressSnapshot() {
    return {
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      date: '2026-06-03',
      progressPercentage: 50,
      currentValue: 82,
      targetValue: 75,
      trend: 'improving' as const,
      sourceContext: {},
      formulaVersion: 'goal-deterministic-v1',
    } as GoalProgressSnapshot;
  }

  function buildUserProfileRepository() {
    return {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
  }

  function buildGoalRepository() {
    return {
      findActiveByUserProfileId: jest.fn(),
      findById: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      create: jest.fn(),
      replaceActiveGoal: jest.fn(),
      markAchieved: jest.fn(),
      markAbandoned: jest.fn(),
    } as unknown as jest.Mocked<GoalRepository>;
  }

  function buildFitnessProfileRepository() {
    return {
      findActiveByUserProfileId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<FitnessProfileRepository>;
  }

  function buildTrainingPlanRepository() {
    return {
      findActiveByFitnessProfileId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      replaceActiveByFitnessProfileId: jest.fn(),
    } as unknown as jest.Mocked<TrainingPlanRepository>;
  }

  function buildWorkoutLogRepository() {
    return {
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn().mockResolvedValue([]),
      findByTrainingPlanIdsAndDateRange: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    } as unknown as jest.Mocked<WorkoutLogRepository>;
  }

  function buildDailyCheckInRepository() {
    return {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<DailyCheckInRepository>;
  }

  function buildNutritionPlanRepository() {
    return {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      replaceActiveByUserProfileId: jest.fn(),
      replaceMeal: jest.fn(),
    } as unknown as jest.Mocked<NutritionPlanRepository>;
  }

  function buildNutritionLogRepository() {
    return {
      create: jest.fn(),
      findByUserProfileIdAndDate: jest.fn(),
      findByUserProfileIdAndDateRange: jest.fn().mockResolvedValue([]),
      findByMealId: jest.fn(),
    } as unknown as jest.Mocked<NutritionLogRepository>;
  }

  function buildRecoverySnapshotRepository() {
    return {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn().mockResolvedValue(null),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<RecoverySnapshotRepository>;
  }

  function buildAdaptiveTrainingRecommendationRepository() {
    return {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn().mockResolvedValue(null),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      upsertDailyRecommendation: jest.fn(),
    } as unknown as jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  }

  function buildGoalProgressSnapshotRepository() {
    return {
      findByGoalIdAndDate: jest.fn(),
      findLatestByGoalId: jest.fn(),
      findManyByGoalId: jest.fn().mockResolvedValue([]),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<GoalProgressSnapshotRepository>;
  }

  function buildGoalProgressCalculatorService() {
    return {
      calculate: jest.fn(),
      calculateProgress: jest.fn(),
      calculateTrend: jest.fn(),
      calculateForecast: jest.fn(),
      buildMilestones: jest.fn(),
    } as unknown as jest.Mocked<GoalProgressCalculatorService>;
  }
});
