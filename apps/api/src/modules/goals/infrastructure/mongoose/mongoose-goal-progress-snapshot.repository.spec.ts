import { MongooseGoalProgressSnapshotRepository } from './mongoose-goal-progress-snapshot.repository';

describe('MongooseGoalProgressSnapshotRepository', () => {
  it('upserts a daily snapshot', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseGoalProgressSnapshotRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertDailySnapshot(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        goalId: 'goal_123',
        date: '2026-06-03',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          userProfileId: 'profile_123',
          progressPercentage: 50,
          currentValue: 90,
          targetValue: 75,
          trend: 'improving',
          formulaVersion: 'goal-deterministic-v1',
        }),
      }),
      expect.objectContaining({
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }),
    );
    expect(result.goalId).toBe('goal_123');
  });

  it('returns the existing snapshot when duplicate key happens', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseGoalProgressSnapshotRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertDailySnapshot(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      goalId: 'goal_123',
      date: '2026-06-03',
    });
    expect(result.goalId).toBe('goal_123');
  });

  it('finds the latest snapshot', async () => {
    const findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDocument()),
      }),
    });
    const repository = new MongooseGoalProgressSnapshotRepository({
      findOne,
    } as never);

    const result = await repository.findLatestByGoalId('goal_123');

    expect(findOne).toHaveBeenCalledWith({ goalId: 'goal_123' });
    expect(result?.goalId).toBe('goal_123');
  });

  it('applies history limits and isolates by goal', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseGoalProgressSnapshotRepository({
      find,
    } as never);

    const result = await repository.findManyByGoalId('goal_456', {
      limit: 5,
    });

    expect(find).toHaveBeenCalledWith({ goalId: 'goal_456' });
    expect(sort).toHaveBeenCalledWith({
      date: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(1);
  });
});

function buildInput() {
  return {
    goalId: 'goal_123',
    userProfileId: 'profile_123',
    date: '2026-06-03',
    progressPercentage: 50,
    currentValue: 90,
    targetValue: 75,
    trend: 'improving' as const,
    sourceContext: {
      generatedAt: '2026-06-03T00:00:00.000Z',
    },
    formulaVersion: 'goal-deterministic-v1',
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'snapshot_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
