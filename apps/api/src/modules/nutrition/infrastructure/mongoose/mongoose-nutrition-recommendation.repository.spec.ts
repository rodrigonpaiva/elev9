import { MongooseNutritionRecommendationRepository } from './mongoose-nutrition-recommendation.repository';

describe('MongooseNutritionRecommendationRepository', () => {
  it('creates a recommendation', async () => {
    const repository = new MongooseNutritionRecommendationRepository({
      create: jest.fn().mockResolvedValue(buildDocument()),
    } as never);

    const result = await repository.create({
      userProfileId: 'profile_123',
      message: 'Message',
      recommendations: ['Do this'],
      influences: ['NO_LOGS_YET'],
      generatorVersion: 'nutrition-deterministic-v1',
      contextSnapshot: { goal: 'maintenance' },
    });

    expect(result.id).toBe('recommendation_123');
    expect(result.influences).toEqual(['NO_LOGS_YET']);
  });

  it('finds recommendations by user profile with limit', async () => {
    const limit = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([buildDocument()]),
    });
    const repository = new MongooseNutritionRecommendationRepository({
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit }),
      }),
    } as never);

    const result = await repository.findManyByUserProfileId('profile_123', 5);

    expect(limit).toHaveBeenCalledWith(5);
    expect(result).toHaveLength(1);
  });
});

function buildDocument() {
  return {
    _id: { toString: () => 'recommendation_123' },
    userProfileId: 'profile_123',
    message: 'Message',
    recommendations: ['Do this'],
    influences: ['NO_LOGS_YET'],
    generatorVersion: 'nutrition-deterministic-v1',
    contextSnapshot: { goal: 'maintenance' },
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
  };
}
