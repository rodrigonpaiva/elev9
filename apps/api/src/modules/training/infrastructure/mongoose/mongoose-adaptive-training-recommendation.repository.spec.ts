import { MongooseAdaptiveTrainingRecommendationRepository } from './mongoose-adaptive-training-recommendation.repository';

describe('MongooseAdaptiveTrainingRecommendationRepository', () => {
  it('creates and maps an adaptive training recommendation', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseAdaptiveTrainingRecommendationRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertDailyRecommendation(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        userProfileId: 'profile_123',
        date: '2026-06-02',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          trainingPlanId: 'plan_123',
          recommendationType: 'increase_intensity',
          recommendedIntensity: 'hard',
          volumeAction: 'increase',
          formulaVersion: 'adaptive-training-deterministic-v1',
          sourceContext: expect.objectContaining({
            formulaVersion: 'adaptive-training-deterministic-v1',
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
      id: 'adaptive_123',
      userProfileId: 'profile_123',
      trainingPlanId: 'plan_123',
      date: '2026-06-02',
      recommendationType: 'increase_intensity',
      recommendedIntensity: 'hard',
      volumeAction: 'increase',
      formulaVersion: 'adaptive-training-deterministic-v1',
    });
    expect(result.sourceContext).toMatchObject({
      formulaVersion: 'adaptive-training-deterministic-v1',
      generatedAt: '2026-06-02T06:00:00.000Z',
    });
    expect(result.influences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'HIGH_READINESS' }),
      ]),
    );
  });

  it('returns the existing recommendation when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseAdaptiveTrainingRecommendationRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertDailyRecommendation(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-02',
    });
    expect(result.id).toBe('adaptive_123');
  });

  it('finds a recommendation by user profile and date', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseAdaptiveTrainingRecommendationRepository({
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

  it('finds the latest recommendation for a user', async () => {
    const sort = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const findOne = jest.fn().mockReturnValue({
      sort,
    });
    const repository = new MongooseAdaptiveTrainingRecommendationRepository({
      findOne,
    } as never);

    const result = await repository.findLatestByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
    });
    expect(sort).toHaveBeenCalledWith({
      date: -1,
      createdAt: -1,
      _id: -1,
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
    const repository = new MongooseAdaptiveTrainingRecommendationRepository({
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
    const repository = new MongooseAdaptiveTrainingRecommendationRepository({
      find,
    } as never);

    const result = await repository.findRecentByUserProfileId('profile_123', {
      limit: 3,
    });

    expect(result).toHaveLength(1);
    expect(query.limit).toHaveBeenCalledWith(3);
  });

  it('isolates recommendations by user profile id', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const repository = new MongooseAdaptiveTrainingRecommendationRepository({
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
    trainingPlanId: 'plan_123',
    date: '2026-06-02',
    recommendationType: 'increase_intensity' as const,
    recommendedIntensity: 'hard' as const,
    volumeAction: 'increase' as const,
    reasoning: 'High readiness and low fatigue support progression.',
    influences: [
      {
        code: 'HIGH_READINESS' as const,
        label: 'Readiness is high.',
        impact: 'positive' as const,
        weight: 0.25,
        value: 88,
      },
    ],
    sourceContext: {
      readinessScore: 88,
      fatigueScore: 22,
      recoveryTrend: 'improving' as const,
      recoveryRecommendedIntensity: 'hard' as const,
      adherenceScore: 86,
      currentStreak: 6,
      missedWorkouts: 0,
      recentWorkoutLoad: 22,
      nutritionAdherence: 82,
      formulaVersion: 'adaptive-training-deterministic-v1',
      generatedAt: '2026-06-02T06:00:00.000Z',
    },
    formulaVersion: 'adaptive-training-deterministic-v1',
    generatedBy: 'deterministic' as const,
  };
}

function buildDocument(overrides: { id?: string } = {}) {
  return {
    _id: {
      toString: () => overrides.id ?? 'adaptive_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-02T06:00:00.000Z'),
    updatedAt: new Date('2026-06-02T06:00:00.000Z'),
  };
}
