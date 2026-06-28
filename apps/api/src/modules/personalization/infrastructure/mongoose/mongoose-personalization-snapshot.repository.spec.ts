import { MongoosePersonalizationSnapshotRepository } from './mongoose-personalization-snapshot.repository';

describe('MongoosePersonalizationSnapshotRepository', () => {
  it('creates and maps a personalization snapshot through upsert', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongoosePersonalizationSnapshotRepository({
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
          preferredCoachingStyle: 'motivational',
          engagementProfile: 'high',
          notificationResponsiveness: 'high',
          goalResponsiveness: 'medium',
          recoveryResponsiveness: 'high',
          habitResponsiveness: 'medium',
          riskOfDisengagement: 'low',
          trend: 'improving',
          formulaVersion: 'personalization-engine-v1',
          generatedAt: '2026-06-03T00:00:00.000Z',
        }),
      }),
      expect.objectContaining({
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }),
    );

    expect(result.id).toBe('snapshot_123');
    expect(result.sourceContext).toMatchObject({
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
      engagementScore: 90,
    });
  });

  it('returns the existing snapshot when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongoosePersonalizationSnapshotRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertDailySnapshot(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-03',
    });
    expect(result.id).toBe('snapshot_123');
  });

  it('finds a snapshot by user profile and date', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongoosePersonalizationSnapshotRepository({
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
    const repository = new MongoosePersonalizationSnapshotRepository({
      findOne,
    } as never);

    const result = await repository.findLatestByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(findOne.mock.results[0].value.sort).toHaveBeenCalledWith({
      date: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(result?.preferredCoachingStyle.value).toBe('motivational');
  });

  it('finds history with canonical ordering and limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongoosePersonalizationSnapshotRepository({
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
    const repository = new MongoosePersonalizationSnapshotRepository({
      findById,
    } as never);

    const result = await repository.findById('snapshot_123');

    expect(findById).toHaveBeenCalledWith('snapshot_123');
    expect(result?.id).toBe('snapshot_123');
  });

  it('keeps user isolation when querying snapshots', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const repository = new MongoosePersonalizationSnapshotRepository({
      findOne,
    } as never);

    await repository.findByUserProfileIdAndDate(
      'another_profile',
      '2026-06-03',
    );

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
    preferredCoachingStyle: 'motivational' as const,
    engagementProfile: 'high' as const,
    notificationResponsiveness: 'high' as const,
    goalResponsiveness: 'medium' as const,
    recoveryResponsiveness: 'high' as const,
    habitResponsiveness: 'medium' as const,
    riskOfDisengagement: 'low' as const,
    trend: 'improving' as const,
    sourceContext: {
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
      engagementScore: 90,
    },
    formulaVersion: 'personalization-engine-v1',
    generatedAt: '2026-06-03T00:00:00.000Z',
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'snapshot_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
  };
}
