import { Goal } from '../../../domain/entities/goal.entity';
import { GoalForecast } from '../../../domain/entities/goal-forecast.entity';
import { GoalForecastRepository } from '../../../domain/repositories/goal-forecast.repository';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GoalDateService } from '../../services/goal-date.service';
import { BuildGoalForecastUseCase } from '../build-goal-forecast/build-goal-forecast.use-case';
import { GOAL_READ_ERROR_CODES } from '../../services/goal-seed.utils';
import { GetGoalForecastUseCase } from './get-goal-forecast.use-case';

describe('GetGoalForecastUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let goalRepository: jest.Mocked<GoalRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let goalForecastRepository: jest.Mocked<GoalForecastRepository>;
  let buildGoalForecastUseCase: jest.Mocked<BuildGoalForecastUseCase>;
  let goalDateService: GoalDateService;
  let useCase: GetGoalForecastUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    goalRepository = buildGoalRepository();
    fitnessProfileRepository = buildFitnessProfileRepository();
    goalForecastRepository = buildGoalForecastRepository();
    buildGoalForecastUseCase = buildBuildGoalForecastUseCase();
    goalDateService = new GoalDateService();

    useCase = new GetGoalForecastUseCase(
      userProfileRepository,
      goalRepository,
      fitnessProfileRepository,
      goalForecastRepository,
      buildGoalForecastUseCase,
      goalDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the existing forecast', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    goalForecastRepository.findByGoalId.mockResolvedValue(buildForecast());

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.goalForecast.goalId).toBe('goal_123');
    expect(buildGoalForecastUseCase.execute).not.toHaveBeenCalled();
  });

  it('builds the forecast when missing', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    goalForecastRepository.findByGoalId.mockResolvedValue(null);
    buildGoalForecastUseCase.execute.mockResolvedValue({
      goalForecast: buildForecast(),
    } as never);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(buildGoalForecastUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.goalForecast.goalId).toBe('goal_123');
  });

  it('errors without a user profile', async () => {
    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('preserves user isolation', async () => {
    arrangeUserProfile('profile_456');
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      buildGoal('goal_456', 'profile_456'),
    );
    goalForecastRepository.findByGoalId.mockResolvedValue(
      buildForecast('goal_456'),
    );

    await useCase.execute({ authUserId: 'auth_user_456' });

    expect(goalRepository.findActiveByUserProfileId).toHaveBeenCalledWith(
      'profile_456',
    );
    expect(goalForecastRepository.findByGoalId).toHaveBeenCalledWith(
      'goal_456',
    );
  });

  function arrangeUserProfile(profileId = 'profile_123') {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: profileId,
      authUserId:
        profileId === 'profile_123' ? 'auth_user_123' : 'auth_user_456',
      name: 'Alex',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  }

  function arrangeActiveGoal(goalId = 'goal_123', profileId = 'profile_123') {
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      buildGoal(goalId, profileId),
    );
  }

  function buildGoal(goalId = 'goal_123', profileId = 'profile_123') {
    return new Goal({
      id: goalId,
      userProfileId: profileId,
      type: 'lose_weight',
      status: { value: 'active' } as never,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      targetDate: undefined,
      achievedAt: undefined,
      targetValue: 72,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
  }

  function buildForecast(goalId = 'goal_123') {
    return new GoalForecast({
      goalId,
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

  function buildGoalForecastRepository() {
    return {
      findByGoalId: jest.fn(),
      upsertForecast: jest.fn(),
    } as unknown as jest.Mocked<GoalForecastRepository>;
  }

  function buildBuildGoalForecastUseCase() {
    return {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildGoalForecastUseCase>;
  }
});
