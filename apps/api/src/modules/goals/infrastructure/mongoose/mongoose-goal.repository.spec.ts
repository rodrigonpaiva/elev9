import { MongooseGoalRepository } from './mongoose-goal.repository';

describe('MongooseGoalRepository', () => {
  it('creates a goal', async () => {
    const create = jest.fn().mockResolvedValue(buildDocument());
    const repository = new MongooseGoalRepository({ create } as never);

    const result = await repository.create(buildCreateInput());

    expect(create).toHaveBeenCalledWith(buildCreateInput());
    expect(result).toMatchObject({
      id: 'goal_123',
      userProfileId: 'profile_123',
      type: 'lose_weight',
      status: { value: 'active' },
    });
  });

  it('finds the active goal', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseGoalRepository({ findOne } as never);

    const result = await repository.findActiveByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      status: 'active',
    });
    expect(result?.id).toBe('goal_123');
  });

  it('replaces the active goal before creating a new one', async () => {
    const updateMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });
    const create = jest
      .fn()
      .mockResolvedValue(buildDocument({ id: 'goal_456' }));
    const repository = new MongooseGoalRepository({
      updateMany,
      create,
    } as never);

    const result = await repository.replaceActiveGoal('profile_123', {
      type: 'gain_muscle',
      startDate: '2026-06-03',
      targetDate: '2026-09-03',
      targetValue: 82,
    });

    expect(updateMany).toHaveBeenCalledWith(
      {
        userProfileId: 'profile_123',
        status: 'active',
      },
      {
        $set: {
          status: 'abandoned',
          updatedAt: expect.any(Date),
        },
      },
    );
    expect(create).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      type: 'gain_muscle',
      status: 'active',
      startDate: '2026-06-03',
      targetDate: '2026-09-03',
      targetValue: 82,
    });
    expect(result.id).toBe('goal_456');
  });

  it('marks a goal as achieved', async () => {
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument({ status: 'achieved' })),
    });
    const repository = new MongooseGoalRepository({
      findByIdAndUpdate,
    } as never);

    const result = await repository.markAchieved(
      'goal_123',
      '2026-06-10T00:00:00.000Z',
    );

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'goal_123',
      {
        $set: {
          status: 'achieved',
          achievedAt: '2026-06-10T00:00:00.000Z',
          updatedAt: expect.any(Date),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
    expect(result?.status.value).toBe('achieved');
  });

  it('marks a goal as abandoned', async () => {
    const findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument({ status: 'abandoned' })),
    });
    const repository = new MongooseGoalRepository({
      findByIdAndUpdate,
    } as never);

    const result = await repository.markAbandoned('goal_123');

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'goal_123',
      {
        $set: {
          status: 'abandoned',
          updatedAt: expect.any(Date),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );
    expect(result?.status.value).toBe('abandoned');
  });

  it('isolates by user profile id when listing history', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([buildDocument()]),
        }),
        exec: jest.fn().mockResolvedValue([buildDocument()]),
      }),
    });
    const repository = new MongooseGoalRepository({ find } as never);

    await repository.findManyByUserProfileId('another_profile', { limit: 10 });

    expect(find).toHaveBeenCalledWith({
      userProfileId: 'another_profile',
    });
  });
});

function buildCreateInput() {
  return {
    userProfileId: 'profile_123',
    type: 'lose_weight' as const,
    status: 'active' as const,
    startDate: '2026-06-03',
    targetDate: '2026-09-03',
    targetValue: 75,
  };
}

function buildDocument(overrides: { id?: string; status?: string } = {}) {
  return {
    _id: {
      toString: () => overrides.id ?? 'goal_123',
    },
    ...buildCreateInput(),
    status: overrides.status ?? 'active',
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
