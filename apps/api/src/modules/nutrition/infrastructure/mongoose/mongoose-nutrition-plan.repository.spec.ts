import { MongooseNutritionPlanRepository } from './mongoose-nutrition-plan.repository';

describe('MongooseNutritionPlanRepository', () => {
  it('creates and maps a nutrition plan', async () => {
    const create = jest.fn().mockResolvedValue(buildDocument());
    const repository = new MongooseNutritionPlanRepository({
      create,
    } as never);

    const result = await repository.create(buildCreateInput());

    expect(create).toHaveBeenCalledWith(buildCreateInput());
    expect(result).toEqual(
      expect.objectContaining({
        id: 'plan_123',
        userProfileId: 'profile_123',
        status: 'active',
        macroTargets: {
          calories: 2400,
          proteinGrams: 160,
          carbsGrams: 280,
          fatGrams: 70,
        },
      }),
    );
    expect(result.days).toHaveLength(1);
    expect(result.days[0].meals[0].alternatives).toHaveLength(1);
  });

  it('finds an active plan by userProfileId', async () => {
    const findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseNutritionPlanRepository({
      findOne,
    } as never);

    const result = await repository.findActiveByUserProfileId('profile_123');

    expect(findOne).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      status: 'active',
    });
    expect(result?.id).toBe('plan_123');
  });

  it('returns null when no active plan exists', async () => {
    const repository = new MongooseNutritionPlanRepository({
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    } as never);

    await expect(
      repository.findActiveByUserProfileId('profile_123'),
    ).resolves.toBeNull();
  });

  it('replaces active plans before creating a new active plan', async () => {
    const updateMany = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });
    const create = jest
      .fn()
      .mockResolvedValue(buildDocument({ id: 'plan_456' }));
    const repository = new MongooseNutritionPlanRepository({
      updateMany,
      create,
    } as never);

    const result = await repository.replaceActiveByUserProfileId(
      'profile_123',
      buildCreateInput(),
    );

    expect(updateMany).toHaveBeenCalledWith(
      {
        userProfileId: 'profile_123',
        status: 'active',
      },
      {
        $set: {
          status: 'replaced',
          replacedAt: expect.any(Date),
        },
      },
    );
    expect(create).toHaveBeenCalledWith(buildCreateInput());
    expect(result.id).toBe('plan_456');
  });

  it('finds a plan by id', async () => {
    const findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(buildDocument()),
    });
    const repository = new MongooseNutritionPlanRepository({
      findById,
    } as never);

    const result = await repository.findById('plan_123');

    expect(findById).toHaveBeenCalledWith('plan_123');
    expect(result?.id).toBe('plan_123');
  });
});

function buildCreateInput() {
  return {
    userProfileId: 'profile_123',
    nutritionProfileId: 'nutrition_123',
    fitnessProfileId: 'fitness_123',
    status: 'active' as const,
    weekStartDate: '2026-06-01',
    weekEndDate: '2026-06-07',
    macroTargets: {
      calories: 2400,
      proteinGrams: 160,
      carbsGrams: 280,
      fatGrams: 70,
    },
    days: [
      {
        date: '2026-06-01',
        dayIndex: 1,
        dailyMacroTargets: {
          calories: 2400,
          proteinGrams: 160,
          carbsGrams: 280,
          fatGrams: 70,
        },
        meals: [
          {
            id: 'meal_1',
            type: 'breakfast' as const,
            title: 'Oats',
            description: 'Oats bowl',
            foodItems: [
              {
                name: 'oats',
                quantity: '60',
                unit: 'g',
                tags: ['vegetarian'],
              },
            ],
            estimatedMacros: {
              calories: 500,
              proteinGrams: 30,
              carbsGrams: 70,
              fatGrams: 12,
            },
            alternatives: [
              {
                id: 'option_1',
                title: 'Tofu plate',
                foodItems: [
                  {
                    name: 'tofu',
                    quantity: '160',
                    unit: 'g',
                    tags: ['vegan', 'soy'],
                  },
                ],
                estimatedMacros: {
                  calories: 500,
                  proteinGrams: 30,
                  carbsGrams: 70,
                  fatGrams: 12,
                },
                reason: 'Compatible deterministic alternative',
              },
            ],
            status: 'planned' as const,
          },
        ],
      },
    ],
    generatedBy: 'deterministic' as const,
    sourceContext: {
      formulaVersion: 'mifflin-st-jeor-v1',
      activityMultiplier: 1.55,
      goalAdjustment: 250,
    },
  };
}

function buildDocument(overrides: { id?: string } = {}) {
  return {
    _id: {
      toString: () => overrides.id ?? 'plan_123',
    },
    ...buildCreateInput(),
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  };
}
