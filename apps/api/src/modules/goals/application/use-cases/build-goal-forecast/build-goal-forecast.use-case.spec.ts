import { Goal } from '../../../domain/entities/goal.entity';
import { GoalForecast } from '../../../domain/entities/goal-forecast.entity';
import { GoalProgressSnapshot } from '../../../domain/entities/goal-progress-snapshot.entity';
import { GoalForecastRepository } from '../../../domain/repositories/goal-forecast.repository';
import { GoalProgressSnapshotRepository } from '../../../domain/repositories/goal-progress-snapshot.repository';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { GoalProgressCalculatorService } from '../../services/goal-progress-calculator.service';
import { GoalDateService } from '../../services/goal-date.service';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import {
  BUILD_GOAL_FORECAST_ERROR_CODES,
} from './build-goal-forecast.errors';
import { BuildGoalForecastUseCase } from './build-goal-forecast.use-case';

describe('BuildGoalForecastUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let goalRepository: jest.Mocked<GoalRepository>;
  let goalProgressSnapshotRepository: jest.Mocked<GoalProgressSnapshotRepository>;
  let goalForecastRepository: jest.Mocked<GoalForecastRepository>;
  let goalProgressCalculatorService: jest.Mocked<GoalProgressCalculatorService>;
  let goalDateService: GoalDateService;
  let useCase: BuildGoalForecastUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    goalRepository = buildGoalRepository();
    goalProgressSnapshotRepository = buildGoalProgressSnapshotRepository();
    goalForecastRepository = buildGoalForecastRepository();
    goalProgressCalculatorService = buildGoalProgressCalculatorService();
    goalDateService = new GoalDateService();

    useCase = new BuildGoalForecastUseCase(
      userProfileRepository,
      goalRepository,
      goalProgressSnapshotRepository,
      goalForecastRepository,
      goalProgressCalculatorService,
      goalDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds and persists a forecast with enough history', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'lose_weight', targetValue: 75 });
    arrangeSnapshots([
      { date: '2026-06-01', progressPercentage: 38 },
      { date: '2026-06-02', progressPercentage: 42 },
      { date: '2026-06-03', progressPercentage: 50 },
    ]);
    goalProgressCalculatorService.calculateTrend.mockReturnValue('improving');
    goalProgressCalculatorService.calculateForecast.mockReturnValue({
      predictedCompletionDays: 30,
      confidence: 'high',
    });
    goalForecastRepository.upsertForecast.mockResolvedValue(buildForecast());

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(userProfileRepository.findByAuthUserId).toHaveBeenCalledWith(
      'auth_user_123',
    );
    expect(goalRepository.findActiveByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
    );
    expect(goalProgressSnapshotRepository.findManyByGoalId).toHaveBeenCalledWith(
      'goal_123',
      { limit: 7 },
    );
    expect(goalProgressCalculatorService.calculateForecast).toHaveBeenCalledWith(
      50,
      'improving',
      [
        { progressPercentage: 38 },
        { progressPercentage: 42 },
      ],
      expect.objectContaining({
        goalType: 'lose_weight',
      }),
    );
    expect(goalForecastRepository.upsertForecast).toHaveBeenCalledWith(
      expect.objectContaining({
        goalId: 'goal_123',
        userProfileId: 'profile_123',
        predictedCompletionDate: '2026-07-03',
        confidence: 'high',
        estimatedDaysRemaining: 30,
        generatedAt: '2026-06-03',
        formulaVersion: 'goal-deterministic-v1',
      }),
    );
    expect(result.goalForecast).toBeDefined();
  });

  it('supports sparse history with low confidence', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'improve_consistency' });
    arrangeSnapshots([{ date: '2026-06-02', progressPercentage: 18 }]);
    goalProgressCalculatorService.calculateTrend.mockReturnValue('stable');
    goalProgressCalculatorService.calculateForecast.mockReturnValue({
      predictedCompletionDays: 90,
      confidence: 'low',
    });
    goalForecastRepository.upsertForecast.mockResolvedValue(buildForecast());

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(goalProgressCalculatorService.calculateForecast).toHaveBeenCalledWith(
      18,
      'stable',
      [],
      expect.objectContaining({
        goalType: 'improve_consistency',
      }),
    );
  });

  it('errors without a user profile', async () => {
    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: BUILD_GOAL_FORECAST_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('errors without an active goal', async () => {
    arrangeUserProfile();
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: BUILD_GOAL_FORECAST_ERROR_CODES.GOAL_NOT_FOUND,
    });
  });

  it('uses the date service and preserves user isolation', async () => {
    arrangeUserProfile();
    arrangeGoal({ type: 'improve_recovery' });
    arrangeSnapshots([]);
    goalProgressCalculatorService.calculateTrend.mockReturnValue('stable');
    goalProgressCalculatorService.calculateForecast.mockReturnValue({
      predictedCompletionDays: 14,
      confidence: 'medium',
    });
    goalForecastRepository.upsertForecast.mockResolvedValue(buildForecast());
    const todaySpy = jest.spyOn(goalDateService, 'todayUtcDateString');

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(todaySpy).toHaveBeenCalled();
    expect(goalForecastRepository.upsertForecast).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
      }),
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

  function arrangeGoal(
    overrides: Partial<{
      type:
        | 'lose_weight'
        | 'gain_muscle'
        | 'maintain_weight'
        | 'improve_consistency'
        | 'improve_recovery';
      targetValue?: number;
    }> = {},
  ) {
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      new Goal({
        id: 'goal_123',
        userProfileId: 'profile_123',
        type: overrides.type ?? 'lose_weight',
        status: { value: 'active' } as never,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        targetDate: undefined,
        achievedAt: undefined,
        targetValue: overrides.targetValue ?? 75,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
  }

  function arrangeSnapshots(
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

  function buildGoalProgressSnapshotRepository() {
    return {
      findByGoalIdAndDate: jest.fn(),
      findLatestByGoalId: jest.fn(),
      findManyByGoalId: jest.fn().mockResolvedValue([]),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<GoalProgressSnapshotRepository>;
  }

  function buildGoalForecastRepository() {
    return {
      findByGoalId: jest.fn(),
      upsertForecast: jest.fn(),
    } as unknown as jest.Mocked<GoalForecastRepository>;
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

  function buildForecast() {
    return {
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      predictedCompletionDate: '2026-07-03',
      confidence: 'high',
      estimatedDaysRemaining: 30,
      generatedAt: '2026-06-03',
      formulaVersion: 'goal-deterministic-v1',
    } as GoalForecast;
  }
});
