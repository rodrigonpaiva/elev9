import { MongooseCoachDecisionRepository } from './mongoose-coach-decision.repository';

describe('MongooseCoachDecisionRepository', () => {
  it('creates and maps a coach decision', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseCoachDecisionRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertDailyDecision(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        userProfileId: 'profile_123',
        date: '2026-06-02',
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          recoverySnapshotId: 'recovery_123',
          nutritionRecommendationId: 'nutrition_123',
          adaptiveTrainingRecommendationId: 'adaptive_123',
          priority: 'recovery',
          formulaVersion: 'coach-decision-v1',
          sourceContext: expect.objectContaining({
            generatedAt: '2026-06-02T06:00:00.000Z',
          }),
          generatedBy: 'deterministic',
          llmMetadata: expect.objectContaining({
            used: false,
          }),
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
      id: 'decision_123',
      userProfileId: 'profile_123',
      date: '2026-06-02',
      recoverySnapshotId: 'recovery_123',
      nutritionRecommendationId: 'nutrition_123',
      adaptiveTrainingRecommendationId: 'adaptive_123',
      priority: 'recovery',
      formulaVersion: 'coach-decision-v1',
      generatedBy: 'deterministic',
    });
    expect(result.sourceContext).toMatchObject({
      generatedAt: '2026-06-02T06:00:00.000Z',
    });
    expect(result.llmMetadata).toEqual({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      used: false,
      failed: true,
    });
  });

  it('returns the existing decision when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseCoachDecisionRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertDailyDecision(buildInput());

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: '2026-06-02',
    });
    expect(result.id).toBe('decision_123');
  });

  it('finds a decision by user profile and date', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseCoachDecisionRepository({
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

  it('finds the latest decision for a user', async () => {
    const findOne = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDocument()),
      }),
    });
    const repository = new MongooseCoachDecisionRepository({
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
    const repository = new MongooseCoachDecisionRepository({
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
    const repository = new MongooseCoachDecisionRepository({
      find,
    } as never);

    const result = await repository.findRecentByUserProfileId('profile_123', {
      limit: 3,
    });

    expect(result).toHaveLength(1);
    expect(query.limit).toHaveBeenCalledWith(3);
  });

  it('finds a decision by id', async () => {
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseCoachDecisionRepository({
      findById,
    } as never);

    const result = await repository.findById('decision_123');

    expect(findById).toHaveBeenCalledWith('decision_123');
    expect(result?.id).toBe('decision_123');
  });

  it('isolates decisions by user profile id', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    const repository = new MongooseCoachDecisionRepository({
      findOne,
    } as never);

    await repository.findByUserProfileIdAndDate('another_profile', '2026-06-02');

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
    recoverySnapshotId: 'recovery_123',
    nutritionRecommendationId: 'nutrition_123',
    adaptiveTrainingRecommendationId: 'adaptive_123',
    priority: 'recovery' as const,
    headline: 'Recovery should be your focus today',
    summary: 'Recovery is the main priority because readiness is low.',
    actionItems: [
      'Reduce training intensity today',
      'Prioritize sleep tonight',
      'Keep hydration high',
    ],
    influences: [
      {
        code: 'LOW_READINESS' as const,
        label: 'Readiness is low.',
        impact: 'negative' as const,
        source: 'recovery' as const,
        weight: 0.3,
        value: 32,
      },
    ],
    sourceContext: {
      readinessScore: 32,
      fatigueScore: 81,
      nutritionAdherence: 39,
      adaptiveRecommendationType: 'rest_day',
      adaptiveIntensity: 'recovery',
      currentStreak: 0,
      missedWorkouts: 3,
      generatedAt: '2026-06-02T06:00:00.000Z',
    },
    formulaVersion: 'coach-decision-v1',
    generatedBy: 'deterministic' as const,
    llmMetadata: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      used: false,
      failed: true,
    },
  };
}

function buildDocument(overrides: { id?: string } = {}) {
  return {
    _id: {
      toString: () => overrides.id ?? 'decision_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-02T06:00:00.000Z'),
    updatedAt: new Date('2026-06-02T06:00:00.000Z'),
  };
}
