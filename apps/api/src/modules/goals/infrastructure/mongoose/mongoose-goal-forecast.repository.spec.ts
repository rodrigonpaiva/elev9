import { MongooseGoalForecastRepository } from './mongoose-goal-forecast.repository';

describe('MongooseGoalForecastRepository', () => {
  it('upserts a forecast and replaces the existing one', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseGoalForecastRepository({
      findOneAndUpdate,
    } as never);

    const result = await repository.upsertForecast(buildInput());

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { goalId: 'goal_123' },
      expect.objectContaining({
        $set: expect.objectContaining({
          userProfileId: 'profile_123',
          confidence: 'high',
          estimatedDaysRemaining: 30,
          generatedAt: '2026-06-03T00:00:00.000Z',
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

  it('finds a forecast by goal id', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseGoalForecastRepository({
      findOne,
    } as never);

    const result = await repository.findByGoalId('goal_123');

    expect(findOne).toHaveBeenCalledWith({ goalId: 'goal_123' });
    expect(result?.confidence.value).toBe('high');
  });

  it('returns the existing forecast when the upsert hits a duplicate key', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseGoalForecastRepository({
      findOneAndUpdate,
      findOne,
    } as never);

    const result = await repository.upsertForecast(buildInput());

    expect(findOne).toHaveBeenCalledWith({ goalId: 'goal_123' });
    expect(result.goalId).toBe('goal_123');
  });
});

function buildInput() {
  return {
    goalId: 'goal_123',
    userProfileId: 'profile_123',
    predictedCompletionDate: '2026-07-03',
    confidence: 'high' as const,
    estimatedDaysRemaining: 30,
    generatedAt: '2026-06-03T00:00:00.000Z',
    formulaVersion: 'goal-deterministic-v1',
  };
}

function buildDocument() {
  return {
    _id: {
      toString: () => 'forecast_123',
    },
    ...buildInput(),
    createdAt: new Date('2026-06-03T00:00:00.000Z'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
  };
}
