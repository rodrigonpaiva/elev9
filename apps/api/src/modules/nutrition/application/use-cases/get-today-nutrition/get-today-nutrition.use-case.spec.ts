import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionLog } from '../../../domain/entities/nutrition-log.entity';
import { NutritionPlan } from '../../../domain/entities/nutrition-plan.entity';
import { NutritionLogRepository } from '../../../domain/repositories/nutrition-log.repository';
import { NutritionPlanRepository } from '../../../domain/repositories/nutrition-plan.repository';
import { GET_TODAY_NUTRITION_ERROR_CODES } from './get-today-nutrition.errors';
import { GetTodayNutritionUseCase } from './get-today-nutrition.use-case';

describe('GetTodayNutritionUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let nutritionLogRepository: jest.Mocked<NutritionLogRepository>;
  let useCase: GetTodayNutritionUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-02T10:00:00.000Z'));

    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
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
      findByUserProfileIdAndDate: jest.fn().mockResolvedValue([]),
      findByUserProfileIdAndDateRange: jest.fn(),
      findByMealId: jest.fn(),
    };

    useCase = new GetTodayNutritionUseCase(
      userProfileRepository,
      nutritionPlanRepository,
      nutritionLogRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns today nutrition from the active plan snapshot', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.date).toBe('2026-06-02');
    expect(result.todayNutrition.macroTargets).toEqual({
      calories: 2200,
      proteinGrams: 150,
      carbsGrams: 250,
      fatGrams: 70,
    });
  });

  it('fails when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_TODAY_NUTRITION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('fails when active nutrition plan does not exist', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
    });
  });

  it('fails when active plan does not contain today', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan({ days: [] }),
    );

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_DAY_NOT_FOUND,
    });
  });

  it('returns zero progress while nutrition logs do not exist', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.progress).toEqual({
      consumedCalories: 0,
      consumedProteinGrams: 0,
      consumedCarbsGrams: 0,
      consumedFatGrams: 0,
      targetCalories: 2200,
      targetProteinGrams: 150,
      targetCarbsGrams: 250,
      targetFatGrams: 70,
      adherencePercentage: 0,
      adherenceStatus: 'off_track',
      macroProgress: {
        protein: { consumed: 0, target: 150, percentage: 0 },
        carbs: { consumed: 0, target: 250, percentage: 0 },
        fat: { consumed: 0, target: 70, percentage: 0 },
      },
    });
  });

  it('sums consumed macros from nutrition logs', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([
      buildNutritionLog({
        mealId: 'meal_breakfast',
        status: 'consumed',
        actualMacros: {
          calories: 550,
          proteinGrams: 38,
          carbsGrams: 63,
          fatGrams: 18,
        },
      }),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.progress).toMatchObject({
      consumedCalories: 550,
      consumedProteinGrams: 38,
      consumedCarbsGrams: 63,
      consumedFatGrams: 18,
      adherencePercentage: 25,
    });
  });

  it('does not sum skipped meal macros', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([
      buildNutritionLog({
        mealId: 'meal_breakfast',
        status: 'skipped',
        actualMacros: {
          calories: 550,
          proteinGrams: 38,
          carbsGrams: 63,
          fatGrams: 18,
        },
      }),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.progress.consumedCalories).toBe(0);
  });

  it('sums partial actual macros', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([
      buildNutritionLog({
        mealId: 'meal_breakfast',
        status: 'partial',
        actualMacros: {
          calories: 250,
          proteinGrams: 20,
          carbsGrams: 25,
          fatGrams: 8,
        },
      }),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.progress.consumedCalories).toBe(250);
  });

  it('returns the first planned meal as nextMeal while logs do not exist', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.nextMeal?.id).toBe('meal_breakfast');
  });

  it('returns the first meal without log as nextMeal', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([
      buildNutritionLog({ mealId: 'meal_breakfast' }),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.nextMeal?.id).toBe('meal_lunch');
  });

  it('returns null nextMeal when all meals are logged', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([
      buildNutritionLog({ mealId: 'meal_breakfast' }),
      buildNutritionLog({ mealId: 'meal_lunch' }),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.todayNutrition.nextMeal).toBeNull();
  });

  it('changes nutrition focus by goal adjustment snapshot when possible', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan({ sourceContext: { goalAdjustment: -400 } }),
    );

    const fatLoss = await useCase.execute({ authUserId: 'auth_user_123' });

    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan({ sourceContext: { goalAdjustment: 250 } }),
    );

    const muscleGain = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(fatLoss.todayNutrition.nutritionFocus).toContain(
      'controlled calorie deficit',
    );
    expect(muscleGain.todayNutrition.nutritionFocus).toContain(
      'clean calorie surplus',
    );
  });

  function arrangeUserProfile(): void {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo Paiva',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date('2026-05-18T09:00:00.000Z'),
        updatedAt: new Date('2026-05-18T09:00:00.000Z'),
      }),
    );
  }
});

function buildNutritionPlan(
  overrides: Partial<ConstructorParameters<typeof NutritionPlan>[0]> = {},
): NutritionPlan {
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
            id: 'meal_breakfast',
            type: 'breakfast',
            title: 'Breakfast',
            description: 'Deterministic breakfast.',
            foodItems: [
              {
                name: 'oats',
                quantity: '60',
                unit: 'g',
                tags: ['vegetarian'],
              },
            ],
            estimatedMacros: {
              calories: 550,
              proteinGrams: 38,
              carbsGrams: 63,
              fatGrams: 18,
            },
            alternatives: [],
            status: 'planned',
          },
          {
            id: 'meal_lunch',
            type: 'lunch',
            title: 'Lunch',
            description: 'Deterministic lunch.',
            foodItems: [],
            estimatedMacros: {
              calories: 650,
              proteinGrams: 45,
              carbsGrams: 75,
              fatGrams: 20,
            },
            alternatives: [],
            status: 'planned',
          },
        ],
      },
    ],
    generatedBy: 'deterministic',
    sourceContext: { goalAdjustment: 0 },
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  });
}

function buildNutritionLog(
  overrides: Partial<ConstructorParameters<typeof NutritionLog>[0]> = {},
): NutritionLog {
  return new NutritionLog({
    id: 'log_123',
    userProfileId: 'profile_123',
    nutritionPlanId: 'plan_123',
    mealId: 'meal_breakfast',
    date: '2026-06-02',
    mealType: 'breakfast',
    status: 'consumed',
    actualMacros: {
      calories: 550,
      proteinGrams: 38,
      carbsGrams: 63,
      fatGrams: 18,
    },
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    ...overrides,
  });
}
