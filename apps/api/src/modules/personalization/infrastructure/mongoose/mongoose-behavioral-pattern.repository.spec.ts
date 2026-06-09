import { MongooseBehavioralPatternRepository } from './mongoose-behavioral-pattern.repository';

describe('MongooseBehavioralPatternRepository', () => {
  it('upserts a behavioral pattern', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseBehavioralPatternRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertPattern(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        userProfileId: 'profile_123',
        type: 'responds_to_goals',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          confidence: 'high',
          evidenceCount: 4,
          formulaVersion: 'personalization-engine-v1',
        }),
      }),
      expect.objectContaining({
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }),
    );

    expect(result.id).toBe('pattern_123');
    expect(result.confidence.value).toBe('high');
    expect(result.evidenceCount).toBe(4);
  });

  it('returns the existing pattern when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseBehavioralPatternRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertPattern(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      type: 'responds_to_goals',
    });
    expect(result.id).toBe('pattern_123');
  });

  it('finds a pattern by user profile and type', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseBehavioralPatternRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileIdAndType(
      'profile_123',
      'responds_to_goals',
    );

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      type: 'responds_to_goals',
    });
    expect(result?.type.value).toBe('responds_to_goals');
  });

  it('finds many patterns with canonical ordering and limit', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const query = {
      limit: jest.fn().mockReturnThis(),
      exec,
    };
    const sort = jest.fn().mockReturnValue(query);
    const find = jest.fn().mockReturnValue({ sort });
    const repository = new MongooseBehavioralPatternRepository({
      find,
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123', {
      limit: 2,
    });

    expect(find).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(sort).toHaveBeenCalledWith({
      lastObservedAt: -1,
      createdAt: -1,
      _id: -1,
    });
    expect(query.limit).toHaveBeenCalledWith(2);
    expect(result).toHaveLength(1);
  });

  it('replaces many patterns for a user profile', async () => {
    const deleteMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ acknowledged: true }),
    });
    const insertMany = jest.fn().mockResolvedValue([buildDocument()]);
    const repository = new MongooseBehavioralPatternRepository({
      deleteMany,
      insertMany,
    } as never);

    const result = await repository.replaceManyByUserProfileId('profile_123', [
      buildInput(),
    ]);

    expect(deleteMany).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          userProfileId: 'profile_123',
          type: 'responds_to_goals',
          confidence: 'high',
          evidenceCount: 4,
          formulaVersion: 'personalization-engine-v1',
        }),
      ],
      { ordered: true },
    );
    expect(result).toHaveLength(1);
    expect(result[0].evidenceCount).toBe(4);
  });

  it('keeps user isolation when querying patterns', async () => {
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });
    const repository = new MongooseBehavioralPatternRepository({
      find,
    } as never);

    await repository.findManyByUserProfileId('another_profile');

    expect(find).toHaveBeenCalledWith({ userProfileId: 'another_profile' });
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    type: 'responds_to_goals' as const,
    confidence: 'high' as const,
    evidenceCount: 4,
    lastObservedAt: new Date('2026-06-03T00:00:00.000Z'),
    formulaVersion: 'personalization-engine-v1',
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'pattern_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
  };
}
