import { MongooseUserBehaviorProfileRepository } from './mongoose-user-behavior-profile.repository';

describe('MongooseUserBehaviorProfileRepository', () => {
  it('creates and maps a user behavior profile through upsert', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseUserBehaviorProfileRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertByUserProfileId(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userProfileId: 'profile_123' },
      expect.objectContaining({
        $set: expect.objectContaining({
          preferredCoachingStyle: 'motivational',
          notificationResponsiveness: 'high',
          goalResponsiveness: 'medium',
          recoveryResponsiveness: 'high',
          habitResponsiveness: 'medium',
          engagementProfile: 'high',
          riskOfDisengagement: 'low',
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

    expect(result.id).toBe('behavior_profile_123');
    expect(result.preferredCoachingStyle.value).toBe('motivational');
    expect(result.createdAt?.toISOString()).toBe(
      '2026-06-03T00:00:00.000Z',
    );
    expect(result.updatedAt?.toISOString()).toBe(
      '2026-06-04T00:00:00.000Z',
    );
  });

  it('returns the existing profile when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseUserBehaviorProfileRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertByUserProfileId(buildInput());

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(result.id).toBe('behavior_profile_123');
  });

  it('finds a profile by user profile id', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseUserBehaviorProfileRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(result?.engagementProfile.value).toBe('high');
  });

  it('keeps user isolation when querying profiles', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const repository = new MongooseUserBehaviorProfileRepository({
      findOne,
    } as never);

    await repository.findByUserProfileId('another_profile');

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'another_profile' });
  });

  it('preserves timestamps when mapping documents', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseUserBehaviorProfileRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileId('profile_123');

    expect(result?.createdAt?.toISOString()).toBe(
      '2026-06-03T00:00:00.000Z',
    );
    expect(result?.updatedAt?.toISOString()).toBe(
      '2026-06-04T00:00:00.000Z',
    );
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    preferredCoachingStyle: 'motivational' as const,
    notificationResponsiveness: 'high' as const,
    goalResponsiveness: 'medium' as const,
    recoveryResponsiveness: 'high' as const,
    habitResponsiveness: 'medium' as const,
    engagementProfile: 'high' as const,
    riskOfDisengagement: 'low' as const,
    formulaVersion: 'personalization-engine-v1',
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'behavior_profile_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-04T00:00:00.000Z'),
  };
}
