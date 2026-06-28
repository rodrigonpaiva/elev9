import { MongooseGoalAchievementRepository } from './mongoose-goal-achievement.repository';

describe('MongooseGoalAchievementRepository', () => {
  it('creates an achievement', async () => {
    const create = jest.fn().mockResolvedValue(buildDocument());
    const repository = new MongooseGoalAchievementRepository({
      create,
    } as never);

    const result = await repository.create(buildInput());

    expect(create).toHaveBeenCalledWith(buildInput());
    expect(result.goalId).toBe('goal_123');
  });

  it('returns achievements by user profile id', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([buildDocument()]),
      }),
    });
    const repository = new MongooseGoalAchievementRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123');

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(result).toHaveLength(1);
  });
});

function buildInput() {
  return {
    goalId: 'goal_123',
    userProfileId: 'profile_123',
    achievedAt: '2026-06-10T00:00:00.000Z',
    completionPercentage: 100,
    notes: 'Goal completed',
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'achievement_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-10T00:00:00.000Z'),
    updatedAt: new Date('2026-06-10T00:00:00.000Z'),
  };
}
