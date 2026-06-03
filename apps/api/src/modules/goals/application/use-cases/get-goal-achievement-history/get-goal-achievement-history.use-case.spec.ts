import { GoalAchievement } from '../../../domain/entities/goal-achievement.entity';
import { GoalAchievementRepository } from '../../../domain/repositories/goal-achievement.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GOAL_READ_ERROR_CODES } from '../../services/goal-seed.utils';
import { GetGoalAchievementHistoryUseCase } from './get-goal-achievement-history.use-case';

describe('GetGoalAchievementHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let goalAchievementRepository: jest.Mocked<GoalAchievementRepository>;
  let useCase: GetGoalAchievementHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = buildUserProfileRepository();
    goalAchievementRepository = buildGoalAchievementRepository();

    useCase = new GetGoalAchievementHistoryUseCase(
      userProfileRepository,
      goalAchievementRepository,
    );
  });

  it('returns achievements for the authenticated user', async () => {
    arrangeUserProfile();
    goalAchievementRepository.findManyByUserProfileId.mockResolvedValue([
      buildAchievement('2026-06-02'),
      buildAchievement('2026-06-01'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.limit).toBe(20);
    expect(result.goalAchievements).toHaveLength(2);
  });

  it('applies the default limit of 20', async () => {
    arrangeUserProfile();
    goalAchievementRepository.findManyByUserProfileId.mockResolvedValue([
      buildAchievement('2026-06-02'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.limit).toBe(20);
  });

  it('applies the max limit of 100', async () => {
    arrangeUserProfile();
    goalAchievementRepository.findManyByUserProfileId.mockResolvedValue([
      buildAchievement('2026-06-02'),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 100,
    });

    expect(result.limit).toBe(100);
  });

  it('rejects invalid limits', async () => {
    arrangeUserProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123', limit: 0 }),
    ).rejects.toMatchObject({
      code: GOAL_READ_ERROR_CODES.INVALID_LIMIT,
    });
  });

  it('preserves user isolation', async () => {
    arrangeUserProfile('profile_456');
    goalAchievementRepository.findManyByUserProfileId.mockResolvedValue([
      buildAchievement('2026-06-02', 'goal_456'),
    ]);

    await useCase.execute({
      authUserId: 'auth_user_456',
    });

    expect(goalAchievementRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_456',
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

  function buildAchievement(achievedAt: string, goalId = 'goal_123') {
    return new GoalAchievement({
      goalId,
      achievedAt: new Date(`${achievedAt}T00:00:00.000Z`),
      completionPercentage: 100,
      notes: 'Achieved.',
    });
  }

  function buildUserProfileRepository() {
    return {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
  }

  function buildGoalAchievementRepository() {
    return {
      findManyByUserProfileId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<GoalAchievementRepository>;
  }
});
