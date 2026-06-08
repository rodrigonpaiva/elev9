import { MongooseConsistencySummaryRepository } from './mongoose-consistency-summary.repository';

describe('MongooseConsistencySummaryRepository', () => {
  it('creates a summary through upsert', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseConsistencySummaryRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertSummary(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userProfileId: 'profile_123' },
      expect.objectContaining({
        $set: expect.objectContaining({
          score: 72,
          trend: 'improving',
          currentStreak: 5,
          longestStreak: 10,
          adherenceRate: 68,
          riskLevel: 'medium',
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
      score: 72,
      currentStreak: 5,
      longestStreak: 10,
      adherenceRate: 68,
      formulaVersion: 'habit-engine-v1',
    });
  });

  it('finds a summary by user profile', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseConsistencySummaryRepository({
      findOne,
    } as never);

    const result = await repository.findByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(result?.riskLevel.value).toBe('medium');
  });

  it('returns the existing summary when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseConsistencySummaryRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertSummary(buildInput());

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'profile_123' });
    expect(result.userProfileId).toBe('profile_123');
  });

  it('keeps user isolation when querying by user profile', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const repository = new MongooseConsistencySummaryRepository({
      findOne,
    } as never);

    await repository.findByUserProfileId('another_profile');

    expect(findOne).toHaveBeenCalledWith({ userProfileId: 'another_profile' });
  });
});

function buildInput() {
  return {
    userProfileId: 'profile_123',
    score: 72,
    trend: 'improving' as const,
    currentStreak: 5,
    longestStreak: 10,
    adherenceRate: 68,
    riskLevel: 'medium' as const,
    formulaVersion: 'habit-engine-v1',
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'consistency_summary_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
