import { MongooseRecoverySnapshotRepository } from './mongoose-recovery-snapshot.repository';

describe('MongooseRecoverySnapshotRepository', () => {
  it('upserts and maps a recovery snapshot', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseRecoverySnapshotRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertDailySnapshot(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        userProfileId: 'profile_123',
        date: '2026-06-02',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          readinessScore: 82,
          fatigueScore: 24,
          recoveryTrend: 'improving',
          recommendedIntensity: 'hard',
          formulaVersion: 'recovery-deterministic-v1',
          sourceContext: expect.objectContaining({
            formulaVersion: 'recovery-deterministic-v1',
          }),
          generatedBy: 'deterministic',
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
      date: '2026-06-02',
      readinessScore: 82,
      fatigueScore: 24,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      formulaVersion: 'recovery-deterministic-v1',
    });
    expect(result.sourceContext).toMatchObject({
      formulaVersion: 'recovery-deterministic-v1',
      generatedAt: '2026-06-02T06:00:00.000Z',
    });
    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'HIGH_ADHERENCE' }),
      ]),
    );
  });

  it('returns the existing snapshot when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseRecoverySnapshotRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertDailySnapshot(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-02',
    });
  });

  it('finds a snapshot by user profile and date', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseRecoverySnapshotRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileIdAndDate(
      'profile_123',
      '2026-06-02',
    );

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-02',
    });
    expect(result?.date).toBe('2026-06-02');
  });

  it('finds the latest snapshot for a user', async () => {
    const findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDocument()),
      }),
    });
    const repository = new MongooseRecoverySnapshotRepository({
      findOne,
    } as never);

    const result = await repository.findLatestByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
    });
    expect(result?.date).toBe('2026-06-02');
  });

  it('finds history in descending order and applies limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseRecoverySnapshotRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123', {
      limit: 5,
    });

    expect(find).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
    });
    expect(sort).toHaveBeenCalledWith({
      date: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(1);
  });

  it('finds recent history using the same ordering contract', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseRecoverySnapshotRepository({
      find,
    } as never);

    const result = await repository.findRecentByUserProfileId('profile_123', {
      limit: 3,
    });

    expect(result).toHaveLength(1);
    expect(query.limit).toHaveBeenCalledWith(3);
  });

  it('isolates snapshots by user profile id', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const repository = new MongooseRecoverySnapshotRepository({
      findOne,
    } as never);

    await repository.findByUserProfileIdAndDate(
      'another_profile',
      '2026-06-02',
    );

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'another_profile',
      date: '2026-06-02',
    });
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    date: '2026-06-02',
    readinessScore: 82,
    fatigueScore: 24,
    recoveryTrend: 'improving' as const,
    recommendedIntensity: 'hard' as const,
    influences: [
      {
        code: 'HIGH_ADHERENCE' as const,
        label: 'Recent adherence is strong.',
        impact: 'positive' as const,
        weight: 0.15,
        value: 95,
      },
    ],
    formulaVersion: 'recovery-deterministic-v1',
    sourceContext: {
      sleepQuality: 5,
      energyLevel: 5,
      muscleSoreness: 1,
      adherenceScore: 95,
      recentWorkoutLoad: 10,
      currentStreak: 8,
      missedWorkouts: 0,
      previousReadinessScores: [78, 80, 81],
      formulaVersion: 'recovery-deterministic-v1',
      generatedAt: '2026-06-02T06:00:00.000Z',
    },
    generatedBy: 'deterministic' as const,
  };
}

function buildDocument(overrides: { id?: string } = {}) {
  return {
    _id: {
      toString: () => overrides.id ?? 'snapshot_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-02T06:00:00.000Z'),
    updatedAt: new Date('2026-06-02T06:00:00.000Z'),
  };
}
