import { Goal } from '../../../domain/entities/goal.entity';
import { GoalProgressSnapshot } from '../../../domain/entities/goal-progress-snapshot.entity';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { GoalProgressSnapshotRepository } from '../../../domain/repositories/goal-progress-snapshot.repository';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GoalDateService } from '../../services/goal-date.service';
import { GOAL_READ_ERROR_CODES } from '../../services/goal-seed.utils';
import { GetGoalHistoryUseCase } from './get-goal-history.use-case';

describe('GetGoalHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let goalRepository: jest.Mocked<GoalRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let goalProgressSnapshotRepository: jest.Mocked<GoalProgressSnapshotRepository>;
  let goalDateService: GoalDateService;
  let useCase: GetGoalHistoryUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    goalRepository = buildGoalRepository();
    fitnessProfileRepository = buildFitnessProfileRepository();
    goalProgressSnapshotRepository = buildGoalProgressSnapshotRepository();
    goalDateService = new GoalDateService();

    useCase = new GetGoalHistoryUseCase(
      userProfileRepository,
      goalRepository,
      fitnessProfileRepository,
      goalProgressSnapshotRepository,
      goalDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns progress snapshots for the active goal', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    goalProgressSnapshotRepository.findManyByGoalId.mockResolvedValue([
      buildSnapshot('2026-06-02', 42),
      buildSnapshot('2026-06-01', 40),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.limit).toBe(14);
    expect(result.goalProgressSnapshots).toHaveLength(2);
    expect(
      goalProgressSnapshotRepository.findManyByGoalId,
    ).toHaveBeenCalledWith('goal_123', { limit: 14 });
  });

  it('applies the default limit of 14', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    goalProgressSnapshotRepository.findManyByGoalId.mockResolvedValue([]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.limit).toBe(14);
  });

  it('applies the max limit of 90', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();
    goalProgressSnapshotRepository.findManyByGoalId.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 90,
    });

    expect(result.limit).toBe(90);
  });

  it('rejects invalid limits', async () => {
    arrangeUserProfile();
    arrangeActiveGoal();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123', limit: 0 }),
    ).rejects.toMatchObject({
      code: GOAL_READ_ERROR_CODES.INVALID_LIMIT,
    });
  });

  it('preserves user isolation', async () => {
    arrangeUserProfile('profile_456');
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      new Goal({
        id: 'goal_456',
        userProfileId: 'profile_456',
        type: 'improve_consistency',
        status: { value: 'active' } as never,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        targetDate: undefined,
        achievedAt: undefined,
        targetValue: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    goalProgressSnapshotRepository.findManyByGoalId.mockResolvedValue([]);

    await useCase.execute({ authUserId: 'auth_user_456' });

    expect(goalRepository.findActiveByUserProfileId).toHaveBeenCalledWith(
      'profile_456',
    );
    expect(
      goalProgressSnapshotRepository.findManyByGoalId,
    ).toHaveBeenCalledWith('goal_456', { limit: 14 });
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

  function arrangeActiveGoal() {
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      new Goal({
        id: 'goal_123',
        userProfileId: 'profile_123',
        type: 'lose_weight',
        status: { value: 'active' } as never,
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        targetDate: undefined,
        achievedAt: undefined,
        targetValue: 72,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
  }

  function buildSnapshot(date: string, progressPercentage: number) {
    return new GoalProgressSnapshot({
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      date,
      progressPercentage,
      currentValue: 80,
      targetValue: 72,
      trend: { value: 'stable' } as never,
      sourceContext: {},
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
});
