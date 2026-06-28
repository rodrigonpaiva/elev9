import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionLog } from '../../../domain/entities/nutrition-log.entity';
import { NutritionPlan } from '../../../domain/entities/nutrition-plan.entity';
import {
  DuplicateNutritionLogError,
  NutritionLogRepository,
} from '../../../domain/repositories/nutrition-log.repository';
import { NutritionPlanRepository } from '../../../domain/repositories/nutrition-plan.repository';
import { LOG_MEAL_ERROR_CODES } from './log-meal.errors';
import { LogMealUseCase } from './log-meal.use-case';

describe('LogMealUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let nutritionLogRepository: jest.Mocked<NutritionLogRepository>;
  let useCase: LogMealUseCase;

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
      create: jest.fn(async (input) => buildNutritionLog(input)),
      findByUserProfileIdAndDate: jest.fn(),
      findByUserProfileIdAndDateRange: jest.fn(),
      findByMealId: jest.fn(),
    };

    useCase = new LogMealUseCase(
      userProfileRepository,
      nutritionPlanRepository,
      nutritionLogRepository,
    );

    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('logs consumed meal with estimated macros when actual macros are absent', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      mealId: 'meal_breakfast',
      status: 'consumed',
    });

    expect(result.nutritionLog.actualMacros).toEqual({
      calories: 550,
      proteinGrams: 38,
      carbsGrams: 63,
      fatGrams: 18,
    });
  });

  it('logs consumed meal with provided actual macros', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      mealId: 'meal_breakfast',
      status: 'consumed',
      actualMacros: {
        calories: 500,
        proteinGrams: 35,
        carbsGrams: 55,
        fatGrams: 15,
      },
    });

    expect(result.nutritionLog.actualMacros?.calories).toBe(500);
  });

  it('logs partial meal with partial actual macros', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      mealId: 'meal_breakfast',
      status: 'partial',
      actualMacros: {
        calories: 250,
        proteinGrams: 20,
        carbsGrams: 25,
        fatGrams: 8,
      },
    });

    expect(result.nutritionLog.status).toBe('partial');
    expect(result.nutritionLog.actualMacros?.calories).toBe(250);
  });

  it('logs skipped meal with zero macros', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      mealId: 'meal_breakfast',
      status: 'skipped',
      actualMacros: {
        calories: 500,
        proteinGrams: 35,
        carbsGrams: 55,
        fatGrams: 15,
      },
    });

    expect(result.nutritionLog.actualMacros).toEqual({
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    });
  });

  it('fails without user profile', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        mealId: 'meal_breakfast',
        status: 'consumed',
      }),
    ).rejects.toMatchObject({
      code: LOG_MEAL_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('fails without active nutrition plan', async () => {
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        mealId: 'meal_breakfast',
        status: 'consumed',
      }),
    ).rejects.toMatchObject({
      code: LOG_MEAL_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
    });
  });

  it('fails when mealId does not exist in the active plan', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        mealId: 'meal_other_user',
        status: 'consumed',
      }),
    ).rejects.toMatchObject({
      code: LOG_MEAL_ERROR_CODES.MEAL_NOT_FOUND,
    });
  });

  it('fails when meal date does not match requested date', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        mealId: 'meal_breakfast',
        date: '2026-06-03',
        status: 'consumed',
      }),
    ).rejects.toMatchObject({
      code: LOG_MEAL_ERROR_CODES.MEAL_DATE_MISMATCH,
    });
  });

  it('maps duplicate log errors', async () => {
    nutritionLogRepository.create.mockRejectedValue(
      new DuplicateNutritionLogError(),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        mealId: 'meal_breakfast',
        status: 'consumed',
      }),
    ).rejects.toMatchObject({
      code: LOG_MEAL_ERROR_CODES.DUPLICATE_LOG,
    });
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

function buildNutritionPlan(): NutritionPlan {
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
            foodItems: [],
            estimatedMacros: {
              calories: 550,
              proteinGrams: 38,
              carbsGrams: 63,
              fatGrams: 18,
            },
            alternatives: [],
            status: 'planned',
          },
        ],
      },
    ],
    generatedBy: 'deterministic',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  });
}

function buildNutritionLog(
  input: Parameters<NutritionLogRepository['create']>[0],
): NutritionLog {
  return new NutritionLog({
    id: 'log_123',
    ...input,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
  });
}
