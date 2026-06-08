import { MongooseHabitSnapshotRepository } from './mongoose-habit-snapshot.repository';

describe('MongooseHabitSnapshotRepository', () => {
  it('creates and maps a habit snapshot through upsert', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseHabitSnapshotRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertDailySnapshot(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        userProfileId: 'profile_123',
        date: '2026-06-03',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          consistencyScore: 72,
          streakDays: 5,
          adherenceScore: 68,
          trend: 'improving',
          formulaVersion: 'habit-engine-v1',
        }),
      }),
      expect.objectContaining({
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }),
    );

    expect(result).toMatchObject({
      userProfileId: 'profile_123',
      date: '2026-06-03',
      consistencyScore: 72,
      streakDays: 5,
      adherenceScore: 68,
      formulaVersion: 'habit-engine-v1',
    });
    expect(result.sourceContext).toMatchObject({
      formulaVersion: 'habit-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
    });
  });

  it('returns the existing snapshot when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseHabitSnapshotRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertDailySnapshot(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-03',
    });
    expect(result.date).toBe('2026-06-03');
  });

  it('finds a snapshot by user profile and date', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseHabitSnapshotRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileIdAndDate(
      'profile_123',
      '2026-06-03',
    );

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-03',
    });
    expect(result?.date).toBe('2026-06-03');
  });

  it('finds the latest snapshot by canonical ordering', async () => {
    const findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDocument()),
      }),
    });
    const repository = new MongooseHabitSnapshotRepository({
      findOne,
    } as never);

    const result = await repository.findLatestByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(findOne.mock.results[0].value.sort).toHaveBeenCalledWith({
      date: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(result?.consistencyScore).toBe(72);
  });

  it('finds history with canonical ordering and limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseHabitSnapshotRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123', {
      limit: 2,
    });

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(sort).toHaveBeenCalledWith({
      date: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(2);
    expect(result).toHaveLength(1);
  });

  it('finds a snapshot by id', async () => {
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseHabitSnapshotRepository({
      findById,
    } as never);

    const result = await repository.findById('habit_snapshot_123');

    expect(findById).toHaveBeenCalledWith('habit_snapshot_123');
    expect(result?.userProfileId).toBe('profile_123');
  });

  it('keeps user isolation when querying by user profile', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const repository = new MongooseHabitSnapshotRepository({
      findOne,
    } as never);

    await repository.findByUserProfileIdAndDate('another_profile', '2026-06-03');

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'another_profile',
      date: '2026-06-03',
    });
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    date: '2026-06-03',
    consistencyScore: 72,
    streakDays: 5,
    adherenceScore: 68,
    trend: 'improving' as const,
    sourceContext: {
      formulaVersion: 'habit-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
      workoutCompletionRate: 80,
    },
    formulaVersion: 'habit-engine-v1',
    generatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'habit_snapshot_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
