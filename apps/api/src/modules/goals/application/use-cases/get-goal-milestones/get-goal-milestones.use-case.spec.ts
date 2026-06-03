import { Goal } from '../../../domain/entities/goal.entity';
import { GoalMilestone } from '../../../domain/entities/goal-milestone.entity';
import { GoalProgressSnapshot } from '../../../domain/entities/goal-progress-snapshot.entity';
import { GoalMilestoneRepository } from '../../../domain/repositories/goal-milestone.repository';
import { GoalProgressSnapshotRepository } from '../../../domain/repositories/goal-progress-snapshot.repository';
import { GoalRepository } from '../../../domain/repositories/goal.repository';
import { GoalProgressCalculatorService } from '../../services/goal-progress-calculator.service';
import { GoalDateService } from '../../services/goal-date.service';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GetGoalMilestonesUseCase } from './get-goal-milestones.use-case';

describe('GetGoalMilestonesUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let goalRepository: jest.Mocked<GoalRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let goalMilestoneRepository: jest.Mocked<GoalMilestoneRepository>;
  let goalProgressSnapshotRepository: jest.Mocked<GoalProgressSnapshotRepository>;
  let goalProgressCalculatorService: GoalProgressCalculatorService;
  let goalDateService: GoalDateService;
  let useCase: GetGoalMilestonesUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    goalRepository = buildGoalRepository();
    fitnessProfileRepository = buildFitnessProfileRepository();
    goalMilestoneRepository = buildGoalMilestoneRepository();
    goalProgressSnapshotRepository = buildGoalProgressSnapshotRepository();
    goalProgressCalculatorService = new GoalProgressCalculatorService();
    goalDateService = new GoalDateService();
    goalMilestoneRepository.createMany.mockImplementation(async (input) => input);

    useCase = new GetGoalMilestonesUseCase(
      userProfileRepository,
      goalRepository,
      fitnessProfileRepository,
      goalMilestoneRepository,
      goalProgressSnapshotRepository,
      goalProgressCalculatorService,
      goalDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns existing milestones when present', async () => {
    arrangeUserProfile();
    arrangeGoal('lose_weight');
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([
      buildMilestone('weight_target', '25% goal milestone', 25, false),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.goalMilestones).toHaveLength(1);
    expect(goalMilestoneRepository.createMany).not.toHaveBeenCalled();
  });

  it('creates default milestones when missing', async () => {
    arrangeUserProfile();
    arrangeGoal('lose_weight');
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([]);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(
      buildSnapshot(60),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(goalMilestoneRepository.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: '25% goal milestone' }),
        expect.objectContaining({ title: '50% goal milestone' }),
        expect.objectContaining({ title: '75% goal milestone' }),
        expect.objectContaining({ title: '100% goal milestone' }),
      ]),
    );
    expect(result.goalMilestones).toHaveLength(4);
    expect(result.goalMilestones[0].type.value).toBe('weight_target');
  });

  it('uses goal-type specific milestone strategy', async () => {
    arrangeUserProfile();
    arrangeGoal('improve_consistency', 'goal_456');
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([]);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(
      buildSnapshot(80, 'goal_456', 'profile_123'),
    );

    const consistencyResult = await useCase.execute({
      authUserId: 'auth_user_123',
    });
    expect(consistencyResult.goalMilestones[0].type.value).toBe('streak');

    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      buildGoal('improve_recovery', 'goal_789'),
    );
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([]);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(
      buildSnapshot(80, 'goal_789', 'profile_123'),
    );

    const recoveryResult = await useCase.execute({
      authUserId: 'auth_user_123',
    });
    expect(recoveryResult.goalMilestones[0].type.value).toBe('recovery');
  });

  it('preserves user isolation', async () => {
    arrangeUserProfile('profile_456');
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      buildGoal('improve_recovery', 'goal_456', 'profile_456'),
    );
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([]);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(
      buildSnapshot(0, 'goal_456', 'profile_456'),
    );

    await useCase.execute({ authUserId: 'auth_user_456' });

    expect(goalRepository.findActiveByUserProfileId).toHaveBeenCalledWith(
      'profile_456',
    );
    expect(goalMilestoneRepository.findManyByGoalId).toHaveBeenCalledWith(
      'goal_456',
    );
  });

  function arrangeUserProfile(profileId = 'profile_123') {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: profileId,
      authUserId: profileId === 'profile_123' ? 'auth_user_123' : 'auth_user_456',
      name: 'Alex',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  }

  function arrangeGoal(
    type:
      | 'lose_weight'
      | 'gain_muscle'
      | 'maintain_weight'
      | 'improve_consistency'
      | 'improve_recovery',
    goalId = 'goal_123',
    profileId = 'profile_123',
  ) {
    goalRepository.findActiveByUserProfileId.mockResolvedValue(
      buildGoal(type, goalId, profileId),
    );
  }

  function buildGoal(
    type:
      | 'lose_weight'
      | 'gain_muscle'
      | 'maintain_weight'
      | 'improve_consistency'
      | 'improve_recovery',
    goalId = 'goal_123',
    profileId = 'profile_123',
  ) {
    return new Goal({
      id: goalId,
      userProfileId: profileId,
      type,
      status: { value: 'active' } as never,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      targetDate: undefined,
      achievedAt: undefined,
      targetValue: type === 'lose_weight' ? 72 : type === 'gain_muscle' ? 88 : 80,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    });
  }

  function buildSnapshot(
    progressPercentage: number,
    goalId = 'goal_123',
    profileId = 'profile_123',
  ) {
    return new GoalProgressSnapshot({
      goalId,
      userProfileId: profileId,
      date: '2026-06-02',
      progressPercentage,
      currentValue: 80,
      targetValue: 72,
      trend: { value: 'stable' } as never,
      sourceContext: {},
      formulaVersion: 'goal-deterministic-v1',
    });
  }

  function buildMilestone(
    type: 'weight_target' | 'streak' | 'recovery',
    title: string,
    targetValue: number,
    achieved: boolean,
  ) {
    return new GoalMilestone({
      goalId: 'goal_123',
      type: { value: type } as never,
      title,
      targetValue,
      achieved,
      achievedAt: achieved ? new Date('2026-06-02T00:00:00.000Z') : undefined,
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

  function buildGoalMilestoneRepository() {
    return {
      findManyByGoalId: jest.fn(),
      createMany: jest.fn(),
      markAchieved: jest.fn(),
    } as unknown as jest.Mocked<GoalMilestoneRepository>;
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
