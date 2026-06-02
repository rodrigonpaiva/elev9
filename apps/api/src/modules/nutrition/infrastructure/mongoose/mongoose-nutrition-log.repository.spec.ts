import { DuplicateNutritionLogError } from '../../domain/repositories/nutrition-log.repository';
import { MongooseNutritionLogRepository } from './mongoose-nutrition-log.repository';

describe('MongooseNutritionLogRepository', () => {
  it('creates and maps a nutrition log', async () => {
    const repository = new MongooseNutritionLogRepository({
      create: jest.fn().mockResolvedValue(buildDocument()),
    } as never);

    const result = await repository.create(buildCreateInput());

    expect(result).toMatchObject({
      id: 'log_123',
      userProfileId: 'profile_123',
      nutritionPlanId: 'plan_123',
      mealId: 'meal_123',
      date: '2026-06-02',
      mealType: 'breakfast',
      status: 'consumed',
      actualMacros: {
        calories: 500,
        proteinGrams: 35,
        carbsGrams: 55,
        fatGrams: 15,
      },
    });
  });

  it('finds logs by user profile and date', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const repository = new MongooseNutritionLogRepository({
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec }),
      }),
    } as never);

    const result = await repository.findByUserProfileIdAndDate(
      'profile_123',
      '2026-06-02',
    );

    expect(result).toHaveLength(1);
  });

  it('finds logs by date range', async () => {
    const exec = jest.fn().mockResolvedValue([buildDocument()]);
    const find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec }),
    });
    const repository = new MongooseNutritionLogRepository({ find } as never);

    await repository.findByUserProfileIdAndDateRange(
      'profile_123',
      '2026-06-01',
      '2026-06-07',
    );

    expect(find).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      date: {
        $gte: '2026-06-01',
        $lte: '2026-06-07',
      },
    });
  });

  it('finds a log by meal id', async () => {
    const repository = new MongooseNutritionLogRepository({
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(buildDocument()),
      }),
    } as never);

    const result = await repository.findByMealId(
      'profile_123',
      'meal_123',
      '2026-06-02',
    );

    expect(result?.mealId).toBe('meal_123');
  });

  it('throws predictable duplicate error for duplicate meal logs', async () => {
    const repository = new MongooseNutritionLogRepository({
      create: jest.fn().mockRejectedValue({ code: 11000 }),
    } as never);

    await expect(repository.create(buildCreateInput())).rejects.toBeInstanceOf(
      DuplicateNutritionLogError,
    );
  });
});

function buildCreateInput() {
  return {
    userProfileId: 'profile_123',
    nutritionPlanId: 'plan_123',
    mealId: 'meal_123',
    date: '2026-06-02',
    mealType: 'breakfast' as const,
    status: 'consumed' as const,
    actualMacros: {
      calories: 500,
      proteinGrams: 35,
      carbsGrams: 55,
      fatGrams: 15,
    },
  };
}

function buildDocument() {
  return {
    _id: { toString: () => 'log_123' },
    ...buildCreateInput(),
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
  };
}
