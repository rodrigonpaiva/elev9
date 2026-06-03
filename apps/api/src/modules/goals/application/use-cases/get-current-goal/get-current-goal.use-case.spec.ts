import { Goal } from '../../../domain/entities/goal.entity';
import { GoalForecast } from '../../../domain/entities/goal-forecast.entity';
import { GoalProgressSnapshot } from '../../../domain/entities/goal-progress-snapshot.entity';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { GoalForecastRepository } from '../../../domain/repositories/goal-forecast.repository';
import { GoalProgressSnapshotRepository } from '../../../domain/repositories/goal-progress-snapshot.repository';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GoalDateService } from '../../services/goal-date.service';
import { BuildGoalForecastUseCase } from '../build-goal-forecast/build-goal-forecast.use-case';
import { BuildGoalProgressSnapshotUseCase } from '../build-goal-progress-snapshot/build-goal-progress-snapshot.use-case';
import { GOAL_READ_ERROR_CODES } from '../../services/goal-seed.utils';
import { GetCurrentGoalUseCase } from './get-current-goal.use-case';

describe('GetCurrentGoalUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let goalRepository: jest.Mocked<GoalRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let goalProgressSnapshotRepository: jest.Mocked<GoalProgressSnapshotRepository>;
  let goalForecastRepository: jest.Mocked<GoalForecastRepository>;
  let buildGoalProgressSnapshotUseCase: jest.Mocked<BuildGoalProgressSnapshotUseCase>;
  let buildGoalForecastUseCase: jest.Mocked<BuildGoalForecastUseCase>;
  let goalDateService: GoalDateService;
  let useCase: GetCurrentGoalUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    goalRepository = buildGoalRepository();
    fitnessProfileRepository = buildFitnessProfileRepository();
    goalProgressSnapshotRepository = buildGoalProgressSnapshotRepository();
    goalForecastRepository = buildGoalForecastRepository();
    buildGoalProgressSnapshotUseCase = buildBuildGoalProgressSnapshotUseCase();
    buildGoalForecastUseCase = buildBuildGoalForecastUseCase();
    goalDateService = new GoalDateService();

    useCase = new GetCurrentGoalUseCase(
      userProfileRepository,
      goalRepository,
      fitnessProfileRepository,
      goalProgressSnapshotRepository,
      goalForecastRepository,
      buildGoalProgressSnapshotUseCase,
      buildGoalForecastUseCase,
      goalDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the active goal with today progress snapshot and forecast', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    arrangeExistingSnapshot();
    arrangeExistingForecast();

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.goal.id).toBe('goal_123');
    expect(result.progressSnapshot.date).toBe('2026-06-03');
    expect(result.forecast.goalId).toBe('goal_123');
    expect(goalRepository.create).not.toHaveBeenCalled();
    expect(
      buildGoalProgressSnapshotUseCase.execute,
    ).not.toHaveBeenCalled();
    expect(buildGoalForecastUseCase.execute).not.toHaveBeenCalled();
  });

  it('seeds a goal from the fitness profile when no active goal exists', async () => {
    arrangeUserProfile();
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);
    arrangeFitnessProfile({ goal: 'lose_weight', weightKg: 80 });
    goalProgressSnapshotRepository.findByGoalIdAndDate.mockResolvedValue(null);
    goalForecastRepository.findByGoalId.mockResolvedValue(null);
    buildGoalProgressSnapshotUseCase.execute.mockResolvedValue({
      goalProgressSnapshot: buildProgressSnapshot(),
    } as never);
    buildGoalForecastUseCase.execute.mockResolvedValue({
      goalForecast: buildForecast(),
    } as never);
    goalRepository.create.mockResolvedValue(buildGoal({ targetValue: 72 }));

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(goalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        type: 'lose_weight',
        status: 'active',
        startDate: '2026-06-03',
        targetValue: 72,
      }),
    );
    expect(result.goal.type).toBe('lose_weight');
    expect(result.progressSnapshot.goalId).toBe('goal_123');
    expect(result.forecast.goalId).toBe('goal_123');
  });

  it('errors without a user profile', async () => {
    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('errors without a fitness profile seed', async () => {
    arrangeUserProfile();
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GOAL_READ_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it('returns the built progress snapshot when today snapshot is missing', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    goalProgressSnapshotRepository.findByGoalIdAndDate.mockResolvedValue(null);
    goalForecastRepository.findByGoalId.mockResolvedValue(buildForecast());
    buildGoalProgressSnapshotUseCase.execute.mockResolvedValue({
      goalProgressSnapshot: buildProgressSnapshot(),
    } as never);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(buildGoalProgressSnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.progressSnapshot.goalId).toBe('goal_123');
  });

  it('returns the built forecast when forecast is missing', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    goalProgressSnapshotRepository.findByGoalIdAndDate.mockResolvedValue(
      buildProgressSnapshot(),
    );
    goalForecastRepository.findByGoalId.mockResolvedValue(null);
    buildGoalForecastUseCase.execute.mockResolvedValue({
      goalForecast: buildForecast(),
    } as never);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(buildGoalForecastUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.forecast.goalId).toBe('goal_123');
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

  function arrangeActiveGoal(overrides: Partial<{
    type:
      | 'lose_weight'
      | 'gain_muscle'
      | 'maintain_weight'
      | 'improve_consistency'
      | 'improve_recovery';
    targetValue?: number;
  }> = {}) {
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      buildGoal(overrides),
    );
  }

  function arrangeFitnessProfile(overrides: Partial<{
    goal: 'lose_weight' | 'gain_muscle' | 'maintain';
    weightKg: number;
  }> = {}) {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'fitness_123',
      userProfileId: 'profile_123',
      heightCm: 180,
      weightKg: overrides.weightKg ?? 80,
      goal: overrides.goal ?? 'lose_weight',
      activityLevel: 'medium',
      trainingAvailability: {
        daysPerWeek: 4,
        minutesPerSession: 45,
      },
      limitations: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  }

  function arrangeExistingSnapshot(snapshot: GoalProgressSnapshot | null = null) {
    goalProgressSnapshotRepository.findByGoalIdAndDate.mockResolvedValue(
      snapshot ?? buildProgressSnapshot(),
    );
  }

  function arrangeExistingForecast(forecast: GoalForecast | null = null) {
    goalForecastRepository.findByGoalId.mockResolvedValue(
      forecast ?? buildForecast(),
    );
  }

  function buildGoal(
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
    return new Goal({
      id: 'goal_123',
      userProfileId: 'profile_123',
      type: overrides.type ?? 'lose_weight',
      status: { value: 'active' } as never,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      targetDate: undefined,
      achievedAt: undefined,
      targetValue: overrides.targetValue ?? 72,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
  }

  function buildProgressSnapshot() {
    return new GoalProgressSnapshot({
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      date: '2026-06-03',
      progressPercentage: 52,
      currentValue: 80,
      targetValue: 72,
      trend: { value: 'stable' } as never,
      sourceContext: { generatedAt: '2026-06-03T10:00:00.000Z' },
      formulaVersion: 'goal-deterministic-v1',
    });
  }

  function buildForecast() {
    return new GoalForecast({
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      predictedCompletionDate: new Date('2026-07-03T00:00:00.000Z'),
      confidence: { value: 'medium' } as never,
      estimatedDaysRemaining: 30,
      generatedAt: new Date('2026-06-03T10:00:00.000Z'),
      formulaVersion: 'goal-deterministic-v1',
    });
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
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<FitnessProfileRepository>;
  }

  function buildGoalProgressSnapshotRepository() {
    return {
      findByGoalIdAndDate: jest.fn(),
      findLatestByGoalId: jest.fn(),
      findManyByGoalId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<GoalProgressSnapshotRepository>;
  }

  function buildGoalForecastRepository() {
    return {
      findByGoalId: jest.fn(),
      upsertForecast: jest.fn(),
    } as unknown as jest.Mocked<GoalForecastRepository>;
  }

  function buildBuildGoalProgressSnapshotUseCase() {
    return {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildGoalProgressSnapshotUseCase>;
  }

  function buildBuildGoalForecastUseCase() {
    return {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildGoalForecastUseCase>;
  }
});
