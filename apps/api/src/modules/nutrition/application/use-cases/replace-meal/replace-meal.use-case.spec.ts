import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionLogRepository } from '../../../domain/repositories/nutrition-log.repository';
import { NutritionPlanRepository } from '../../../domain/repositories/nutrition-plan.repository';
import { NutritionProfileRepository } from '../../../domain/repositories/nutrition-profile.repository';
import { NutritionProfile } from '../../../domain/entities/nutrition-profile.entity';
import { NutritionPlan } from '../../../domain/entities/nutrition-plan.entity';
import { REPLACE_MEAL_ERROR_CODES } from './replace-meal.errors';
import { ReplaceMealUseCase } from './replace-meal.use-case';

describe('ReplaceMealUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let nutritionProfileRepository: jest.Mocked<NutritionProfileRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let nutritionLogRepository: jest.Mocked<NutritionLogRepository>;
  let useCase: ReplaceMealUseCase;

  beforeEach(() => {
    userProfileRepository = { findByAuthUserId: jest.fn(), create: jest.fn() };
    nutritionProfileRepository = {
      findActiveByUserProfileId: jest.fn(),
      upsertByUserProfileId: jest.fn(),
    };
    nutritionPlanRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
      replaceActiveByUserProfileId: jest.fn(),
      replaceMeal: jest.fn(),
    };
    nutritionLogRepository = {
      create: jest.fn(),
      findByUserProfileIdAndDate: jest.fn(),
      findByUserProfileIdAndDateRange: jest.fn(),
      findByMealId: jest.fn(),
    };
    useCase = new ReplaceMealUseCase(
      userProfileRepository,
      nutritionProfileRepository,
      nutritionPlanRepository,
      nutritionLogRepository,
    );

    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionProfile(),
    );
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );
    nutritionPlanRepository.replaceMeal.mockResolvedValue(
      buildNutritionPlan({ title: 'Preferred rice bowl' }),
    );
    nutritionLogRepository.findByMealId.mockResolvedValue(null);
  });

  it('replaces a meal with a compatible preferred alternative', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      mealId: 'meal_123',
      reason: 'preference',
    });

    expect(nutritionPlanRepository.replaceMeal).toHaveBeenCalled();
    expect(result.meal.title).toBe('Preferred rice bowl');
    expect(result.replacement.previousMeal.status).toBe('replaced');
  });

  it('fails when meal is already logged', async () => {
    nutritionLogRepository.findByMealId.mockResolvedValue({
      id: 'log_123',
    } as never);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123', mealId: 'meal_123' }),
    ).rejects.toMatchObject({
      code: REPLACE_MEAL_ERROR_CODES.MEAL_ALREADY_LOGGED,
    });
  });

  it('fails when no compatible alternative exists', async () => {
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionProfile({ allergies: ['rice', 'lentils'] }),
    );

    await expect(
      useCase.execute({ authUserId: 'auth_user_123', mealId: 'meal_123' }),
    ).rejects.toMatchObject({
      code: REPLACE_MEAL_ERROR_CODES.NO_COMPATIBLE_ALTERNATIVE,
    });
  });
});

function buildUserProfile(): UserProfile {
  return new UserProfile({
    id: 'profile_123',
    authUserId: 'auth_user_123',
    name: 'Rodrigo',
    language: 'en-US',
    timezone: 'UTC',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildNutritionProfile(
  overrides: Partial<ConstructorParameters<typeof NutritionProfile>[0]> = {},
): NutritionProfile {
  return new NutritionProfile({
    id: 'nutrition_123',
    userProfileId: 'profile_123',
    goal: 'muscle_gain',
    mealsPerDay: 4,
    dietaryRestrictions: [],
    allergies: [],
    dislikedFoods: ['lentils'],
    preferredFoods: ['rice'],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function buildNutritionPlan(input: { title?: string } = {}): NutritionPlan {
  return new NutritionPlan({
    id: 'plan_123',
    userProfileId: 'profile_123',
    nutritionProfileId: 'nutrition_123',
    fitnessProfileId: 'fitness_123',
    status: 'active',
    weekStartDate: '2026-06-01',
    weekEndDate: '2026-06-07',
    macroTargets: {
      calories: 2200,
      proteinGrams: 150,
      carbsGrams: 250,
      fatGrams: 70,
    },
    days: [
      {
        date: '2026-06-02',
        dayIndex: 2,
        dailyMacroTargets: {
          calories: 2200,
          proteinGrams: 150,
          carbsGrams: 250,
          fatGrams: 70,
        },
        meals: [
          {
            id: 'meal_123',
            type: 'lunch',
            title: input.title ?? 'Chicken plate',
            description: 'Lunch',
            foodItems: [],
            estimatedMacros: {
              calories: 500,
              proteinGrams: 40,
              carbsGrams: 50,
              fatGrams: 15,
            },
            alternatives: [
              {
                id: 'option_rice',
                title: 'Preferred rice bowl',
                foodItems: [
                  { name: 'rice', quantity: '180', unit: 'g', tags: ['grain'] },
                ],
                estimatedMacros: {
                  calories: 520,
                  proteinGrams: 35,
                  carbsGrams: 65,
                  fatGrams: 12,
                },
                reason: 'Compatible deterministic alternative',
              },
              {
                id: 'option_lentils',
                title: 'Lentil bowl',
                foodItems: [
                  {
                    name: 'lentils',
                    quantity: '180',
                    unit: 'g',
                    tags: ['legume'],
                  },
                ],
                estimatedMacros: {
                  calories: 500,
                  proteinGrams: 30,
                  carbsGrams: 60,
                  fatGrams: 10,
                },
                reason: 'Compatible deterministic alternative',
              },
            ],
            status: 'planned',
          },
        ],
      },
    ],
    generatedBy: 'deterministic',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
