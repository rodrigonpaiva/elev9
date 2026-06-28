import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  CALCULATE_MACRO_TARGETS_ERROR_CODES,
  CalculateMacroTargetsError,
} from '../../application/use-cases/calculate-macro-targets/calculate-macro-targets.errors';
import { CalculateMacroTargetsUseCase } from '../../application/use-cases/calculate-macro-targets/calculate-macro-targets.use-case';
import {
  CREATE_NUTRITION_PLAN_ERROR_CODES,
  CreateNutritionPlanError,
} from '../../application/use-cases/create-nutrition-plan/create-nutrition-plan.errors';
import { CreateNutritionPlanUseCase } from '../../application/use-cases/create-nutrition-plan/create-nutrition-plan.use-case';
import {
  CREATE_NUTRITION_PROFILE_ERROR_CODES,
  CreateNutritionProfileError,
} from '../../application/use-cases/create-nutrition-profile/create-nutrition-profile.errors';
import { CreateNutritionProfileUseCase } from '../../application/use-cases/create-nutrition-profile/create-nutrition-profile.use-case';
import {
  GET_CURRENT_NUTRITION_PLAN_ERROR_CODES,
  GetCurrentNutritionPlanError,
} from '../../application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.errors';
import { GetCurrentNutritionPlanUseCase } from '../../application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.use-case';
import {
  GET_NUTRITION_PROFILE_ERROR_CODES,
  GetNutritionProfileError,
} from '../../application/use-cases/get-nutrition-profile/get-nutrition-profile.errors';
import { GetNutritionProfileUseCase } from '../../application/use-cases/get-nutrition-profile/get-nutrition-profile.use-case';
import {
  GET_TODAY_NUTRITION_ERROR_CODES,
  GetTodayNutritionError,
} from '../../application/use-cases/get-today-nutrition/get-today-nutrition.errors';
import { GetTodayNutritionUseCase } from '../../application/use-cases/get-today-nutrition/get-today-nutrition.use-case';
import { GenerateNutritionRecommendationUseCase } from '../../application/use-cases/generate-nutrition-recommendation/generate-nutrition-recommendation.use-case';
import { GetNutritionRecommendationsUseCase } from '../../application/use-cases/get-nutrition-recommendations/get-nutrition-recommendations.use-case';
import {
  LOG_MEAL_ERROR_CODES,
  LogMealError,
} from '../../application/use-cases/log-meal/log-meal.errors';
import { LogMealUseCase } from '../../application/use-cases/log-meal/log-meal.use-case';
import { ReplaceMealUseCase } from '../../application/use-cases/replace-meal/replace-meal.use-case';
import { NutritionController } from './nutrition.controller';

describe('NutritionController', () => {
  let createNutritionProfileUseCase: jest.Mocked<CreateNutritionProfileUseCase>;
  let getNutritionProfileUseCase: jest.Mocked<GetNutritionProfileUseCase>;
  let calculateMacroTargetsUseCase: jest.Mocked<CalculateMacroTargetsUseCase>;
  let createNutritionPlanUseCase: jest.Mocked<CreateNutritionPlanUseCase>;
  let getCurrentNutritionPlanUseCase: jest.Mocked<GetCurrentNutritionPlanUseCase>;
  let getTodayNutritionUseCase: jest.Mocked<GetTodayNutritionUseCase>;
  let logMealUseCase: jest.Mocked<LogMealUseCase>;
  let replaceMealUseCase: jest.Mocked<ReplaceMealUseCase>;
  let generateNutritionRecommendationUseCase: jest.Mocked<GenerateNutritionRecommendationUseCase>;
  let getNutritionRecommendationsUseCase: jest.Mocked<GetNutritionRecommendationsUseCase>;
  let controller: NutritionController;

  beforeEach(() => {
    createNutritionProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateNutritionProfileUseCase>;
    getNutritionProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetNutritionProfileUseCase>;
    calculateMacroTargetsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CalculateMacroTargetsUseCase>;
    createNutritionPlanUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateNutritionPlanUseCase>;
    getCurrentNutritionPlanUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentNutritionPlanUseCase>;
    getTodayNutritionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTodayNutritionUseCase>;
    logMealUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LogMealUseCase>;
    replaceMealUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReplaceMealUseCase>;
    generateNutritionRecommendationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GenerateNutritionRecommendationUseCase>;
    getNutritionRecommendationsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetNutritionRecommendationsUseCase>;

    controller = new NutritionController(
      createNutritionProfileUseCase,
      getNutritionProfileUseCase,
      calculateMacroTargetsUseCase,
      createNutritionPlanUseCase,
      getCurrentNutritionPlanUseCase,
      getTodayNutritionUseCase,
      logMealUseCase,
      replaceMealUseCase,
      generateNutritionRecommendationUseCase,
      getNutritionRecommendationsUseCase,
    );
  });

  it('uses the authenticated user', async () => {
    createNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      },
    });

    await controller.createProfile(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {
        goal: 'muscle_gain',
        mealsPerDay: 4,
      },
    );

    expect(createNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      goal: 'muscle_gain',
      mealsPerDay: 4,
      dietaryRestrictions: undefined,
      allergies: undefined,
      dislikedFoods: undefined,
      preferredFoods: undefined,
    });
  });

  it('returns a safe payload', async () => {
    createNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:05:00.000Z'),
      },
    });

    const result = await controller.createProfile(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
      },
    );

    expect(result).toEqual({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: 'active',
        createdAt: '2026-05-18T10:00:00.000Z',
        updatedAt: '2026-05-18T10:05:00.000Z',
      },
    });
  });

  it('maps invalid input errors to HTTP 400', async () => {
    createNutritionProfileUseCase.execute.mockRejectedValue(
      new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_INPUT,
        'Invalid nutrition profile input.',
      ),
    );

    await expect(
      controller.createProfile(
        {
          authUser: {
            id: 'auth_user_123',
            email: 'user@email.com',
          },
        },
        {
          goal: 'muscle_gain',
          mealsPerDay: 4,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps missing user profile errors to HTTP 404', async () => {
    createNutritionProfileUseCase.execute.mockRejectedValue(
      new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      ),
    );

    await expect(
      controller.createProfile(
        {
          authUser: {
            id: 'auth_user_123',
            email: 'user@email.com',
          },
        },
        {
          goal: 'muscle_gain',
          mealsPerDay: 4,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maintains isolation by using only the authenticated user context', async () => {
    createNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_abc',
        goal: 'maintenance',
        mealsPerDay: 3,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      },
    });

    await controller.createProfile(
      {
        authUser: {
          id: 'auth_user_real',
          email: 'user@email.com',
        },
      },
      {
        goal: 'maintenance',
        mealsPerDay: 3,
        userProfileId: 'forged_profile_id',
      } as CreateNutritionProfileUseCase extends never ? never : any,
    );

    expect(createNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_real',
      goal: 'maintenance',
      mealsPerDay: 3,
      dietaryRestrictions: undefined,
      allergies: undefined,
      dislikedFoods: undefined,
      preferredFoods: undefined,
    });
  });

  it('maps invalid session errors to HTTP 401', async () => {
    createNutritionProfileUseCase.execute.mockRejectedValue(
      new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.createProfile(
        {
          authUser: {
            id: '',
            email: 'user@email.com',
          },
        },
        {
          goal: 'muscle_gain',
          mealsPerDay: 4,
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('uses authUserId for get profile', async () => {
    getNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'maintenance',
        mealsPerDay: 3,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:05:00.000Z'),
      },
    });

    await controller.getProfile(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {},
      {},
    );

    expect(getNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
  });

  it('returns a safe and consistent response for get profile', async () => {
    getNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'maintenance',
        mealsPerDay: 3,
        dietaryRestrictions: ['vegetarian'],
        allergies: ['peanut'],
        dislikedFoods: ['broccoli'],
        preferredFoods: ['rice'],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:05:00.000Z'),
      },
    });

    const result = await controller.getProfile(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {},
      {},
    );

    expect(result).toEqual({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'maintenance',
        mealsPerDay: 3,
        dietaryRestrictions: ['vegetarian'],
        allergies: ['peanut'],
        dislikedFoods: ['broccoli'],
        preferredFoods: ['rice'],
        status: 'active',
        createdAt: '2026-05-18T10:00:00.000Z',
        updatedAt: '2026-05-18T10:05:00.000Z',
      },
    });
  });

  it('maintains isolation by using only authenticated context on get profile', async () => {
    getNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: 'nutrition_123',
        userProfileId: 'profile_real',
        goal: 'fat_loss',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:05:00.000Z'),
      },
    });

    await controller.getProfile(
      {
        authUser: {
          id: 'auth_user_real',
          email: 'user@email.com',
        },
      },
      {},
      {},
    );

    expect(getNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_real',
    });
  });

  it('maps nutrition profile not found to HTTP 404', async () => {
    getNutritionProfileUseCase.execute.mockRejectedValue(
      new GetNutritionProfileError(
        GET_NUTRITION_PROFILE_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
        'Nutrition profile not found.',
      ),
    );

    await expect(
      controller.getProfile(
        {
          authUser: {
            id: 'auth_user_123',
            email: 'user@email.com',
          },
        },
        {},
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses authUserId for macro target calculation', async () => {
    calculateMacroTargetsUseCase.execute.mockResolvedValue(
      buildMacroTargetsResponse(),
    );

    await controller.calculateMacroTargets({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(calculateMacroTargetsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
  });

  it('does not accept an external userProfileId for macro target calculation', async () => {
    calculateMacroTargetsUseCase.execute.mockResolvedValue(
      buildMacroTargetsResponse(),
    );

    await controller.calculateMacroTargets({
      authUser: {
        id: 'auth_user_real',
        email: 'user@email.com',
      },
      userProfileId: 'forged_profile_id',
    } as unknown as {
      authUser: { id: string; email: string };
    });

    expect(calculateMacroTargetsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_real',
    });
  });

  it('returns macro target calculation response', async () => {
    calculateMacroTargetsUseCase.execute.mockResolvedValue(
      buildMacroTargetsResponse(),
    );

    const result = await controller.calculateMacroTargets({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(result).toEqual(buildMacroTargetsResponse());
  });

  it('maps macro target invalid session errors to HTTP 401', async () => {
    calculateMacroTargetsUseCase.execute.mockRejectedValue(
      new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.calculateMacroTargets({
        authUser: {
          id: '',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps missing macro target dependencies to HTTP 404', async () => {
    calculateMacroTargetsUseCase.execute.mockRejectedValue(
      new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
        'Fitness profile not found.',
      ),
    );

    await expect(
      controller.calculateMacroTargets({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps missing macro target body metrics to HTTP 400', async () => {
    calculateMacroTargetsUseCase.execute.mockRejectedValue(
      new CalculateMacroTargetsError(
        CALCULATE_MACRO_TARGETS_ERROR_CODES.HEIGHT_CM_MISSING,
        'Height is required to calculate macro targets.',
      ),
    );

    await expect(
      controller.calculateMacroTargets({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses authUserId for nutrition plan creation', async () => {
    createNutritionPlanUseCase.execute.mockResolvedValue(
      buildNutritionPlanOutput(),
    );

    await controller.createNutritionPlan({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(createNutritionPlanUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
  });

  it('does not accept an external userProfileId for nutrition plan creation', async () => {
    createNutritionPlanUseCase.execute.mockResolvedValue(
      buildNutritionPlanOutput(),
    );

    await controller.createNutritionPlan({
      authUser: {
        id: 'auth_user_real',
        email: 'user@email.com',
      },
      userProfileId: 'forged_profile_id',
    } as unknown as {
      authUser: { id: string; email: string };
    });

    expect(createNutritionPlanUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_real',
    });
  });

  it('returns the expected nutrition plan DTO', async () => {
    createNutritionPlanUseCase.execute.mockResolvedValue(
      buildNutritionPlanOutput(),
    );

    const result = await controller.createNutritionPlan({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(result).toEqual({
      nutritionPlan: {
        id: 'plan_123',
        userProfileId: 'profile_123',
        nutritionProfileId: 'nutrition_123',
        fitnessProfileId: 'fitness_123',
        status: 'active',
        weekStartDate: '2026-06-01',
        weekEndDate: '2026-06-07',
        macroTargets: {
          calories: 2912,
          proteinGrams: 152,
          carbsGrams: 394,
          fatGrams: 81,
        },
        days: [
          {
            date: '2026-06-01',
            dayIndex: 1,
            dailyMacroTargets: {
              calories: 2912,
              proteinGrams: 152,
              carbsGrams: 394,
              fatGrams: 81,
            },
            meals: [
              {
                id: 'meal_123',
                type: 'breakfast',
                title: 'Oats and yogurt bowl',
                description: 'Oats with yogurt, banana, and seeds.',
                foodItems: [
                  {
                    name: 'oats',
                    quantity: '60',
                    unit: 'g',
                    estimatedMacros: undefined,
                    tags: ['vegetarian'],
                  },
                ],
                estimatedMacros: {
                  calories: 728,
                  proteinGrams: 38,
                  carbsGrams: 99,
                  fatGrams: 20,
                },
                alternatives: [
                  {
                    id: 'meal_option_123',
                    title: 'Tofu breakfast plate',
                    foodItems: [
                      {
                        name: 'tofu',
                        quantity: '160',
                        unit: 'g',
                        estimatedMacros: undefined,
                        tags: ['vegan', 'soy'],
                      },
                    ],
                    estimatedMacros: {
                      calories: 728,
                      proteinGrams: 38,
                      carbsGrams: 99,
                      fatGrams: 20,
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
        sourceContext: {
          formulaVersion: 'mifflin-st-jeor-v1',
          activityMultiplier: 1.55,
          goalAdjustment: 250,
        },
        createdAt: '2026-06-02T10:00:00.000Z',
        updatedAt: '2026-06-02T10:00:00.000Z',
        replacedAt: undefined,
      },
    });
  });

  it('maps nutrition plan invalid session errors to HTTP 401', async () => {
    createNutritionPlanUseCase.execute.mockRejectedValue(
      new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.createNutritionPlan({
        authUser: {
          id: '',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps missing nutrition plan dependencies to HTTP 404', async () => {
    createNutritionPlanUseCase.execute.mockRejectedValue(
      new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
        'Nutrition profile not found.',
      ),
    );

    await expect(
      controller.createNutritionPlan({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps nutrition plan validation errors to HTTP 400', async () => {
    createNutritionPlanUseCase.execute.mockRejectedValue(
      new CreateNutritionPlanError(
        CREATE_NUTRITION_PLAN_ERROR_CODES.WEIGHT_KG_MISSING,
        'Weight is required to create a nutrition plan.',
      ),
    );

    await expect(
      controller.createNutritionPlan({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses authUserId for current nutrition plan lookup', async () => {
    getCurrentNutritionPlanUseCase.execute.mockResolvedValue(
      buildNutritionPlanOutput(),
    );

    await controller.getCurrentNutritionPlan({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(getCurrentNutritionPlanUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
  });

  it('does not accept an external userProfileId for current nutrition plan lookup', async () => {
    getCurrentNutritionPlanUseCase.execute.mockResolvedValue(
      buildNutritionPlanOutput(),
    );

    await controller.getCurrentNutritionPlan({
      authUser: {
        id: 'auth_user_real',
        email: 'user@email.com',
      },
      userProfileId: 'forged_profile_id',
    } as unknown as {
      authUser: { id: string; email: string };
    });

    expect(getCurrentNutritionPlanUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_real',
    });
  });

  it('maps current nutrition plan not found errors to HTTP 404', async () => {
    getCurrentNutritionPlanUseCase.execute.mockRejectedValue(
      new GetCurrentNutritionPlanError(
        GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
        'Active nutrition plan not found.',
      ),
    );

    await expect(
      controller.getCurrentNutritionPlan({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses authUserId for today nutrition lookup', async () => {
    getTodayNutritionUseCase.execute.mockResolvedValue(
      buildTodayNutritionOutput(),
    );

    await controller.getTodayNutrition({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(getTodayNutritionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
  });

  it('does not accept an external userProfileId for today nutrition lookup', async () => {
    getTodayNutritionUseCase.execute.mockResolvedValue(
      buildTodayNutritionOutput(),
    );

    await controller.getTodayNutrition({
      authUser: {
        id: 'auth_user_real',
        email: 'user@email.com',
      },
      userProfileId: 'forged_profile_id',
    } as unknown as {
      authUser: { id: string; email: string };
    });

    expect(getTodayNutritionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_real',
    });
  });

  it('returns the expected today nutrition DTO', async () => {
    getTodayNutritionUseCase.execute.mockResolvedValue(
      buildTodayNutritionOutput(),
    );

    const result = await controller.getTodayNutrition({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(result.todayNutrition.progress).toEqual({
      consumedCalories: 0,
      consumedProteinGrams: 0,
      consumedCarbsGrams: 0,
      consumedFatGrams: 0,
      targetCalories: 2912,
      targetProteinGrams: 152,
      targetCarbsGrams: 394,
      targetFatGrams: 81,
      adherencePercentage: 0,
    });
    expect(result.todayNutrition.nextMeal?.id).toBe('meal_123');
  });

  it('maps today nutrition invalid session errors to HTTP 401', async () => {
    getTodayNutritionUseCase.execute.mockRejectedValue(
      new GetTodayNutritionError(
        GET_TODAY_NUTRITION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.getTodayNutrition({
        authUser: {
          id: '',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps today nutrition missing plan errors to HTTP 404', async () => {
    getTodayNutritionUseCase.execute.mockRejectedValue(
      new GetTodayNutritionError(
        GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
        'Active nutrition plan not found.',
      ),
    );

    await expect(
      controller.getTodayNutrition({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses authUserId for meal logging', async () => {
    logMealUseCase.execute.mockResolvedValue(buildLogMealOutput());

    await controller.logMeal(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {
        mealId: 'meal_123',
        status: 'consumed',
      },
    );

    expect(logMealUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      mealId: 'meal_123',
      date: undefined,
      status: 'consumed',
      actualMacros: undefined,
    });
  });

  it('does not accept an external userProfileId for meal logging', async () => {
    logMealUseCase.execute.mockResolvedValue(buildLogMealOutput());

    await controller.logMeal(
      {
        authUser: {
          id: 'auth_user_real',
          email: 'user@email.com',
        },
      },
      {
        mealId: 'meal_123',
        status: 'partial',
        userProfileId: 'forged_profile_id',
        actualMacros: {
          calories: 300,
          proteinGrams: 20,
          carbsGrams: 30,
          fatGrams: 10,
        },
      } as never,
    );

    expect(logMealUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_real',
      mealId: 'meal_123',
      date: undefined,
      status: 'partial',
      actualMacros: {
        calories: 300,
        proteinGrams: 20,
        carbsGrams: 30,
        fatGrams: 10,
      },
    });
  });

  it('returns the expected meal log DTO', async () => {
    logMealUseCase.execute.mockResolvedValue(buildLogMealOutput());

    const result = await controller.logMeal(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {
        mealId: 'meal_123',
        status: 'consumed',
      },
    );

    expect(result.nutritionLog).toEqual({
      id: 'log_123',
      userProfileId: 'profile_123',
      nutritionPlanId: 'plan_123',
      mealId: 'meal_123',
      date: '2026-06-02',
      mealType: 'breakfast',
      status: 'consumed',
      actualMacros: {
        calories: 728,
        proteinGrams: 38,
        carbsGrams: 99,
        fatGrams: 20,
      },
      createdAt: '2026-06-02T10:00:00.000Z',
      updatedAt: '2026-06-02T10:00:00.000Z',
    });
  });

  it('maps meal log duplicate errors to HTTP 409', async () => {
    logMealUseCase.execute.mockRejectedValue(
      new LogMealError(
        LOG_MEAL_ERROR_CODES.DUPLICATE_LOG,
        'Nutrition log already exists for this meal and date.',
      ),
    );

    await expect(
      controller.logMeal(
        {
          authUser: {
            id: 'auth_user_123',
            email: 'user@email.com',
          },
        },
        {
          mealId: 'meal_123',
          status: 'consumed',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps meal log validation errors to HTTP 400', async () => {
    logMealUseCase.execute.mockRejectedValue(
      new LogMealError(
        LOG_MEAL_ERROR_CODES.INVALID_INPUT,
        'Invalid meal log status.',
      ),
    );

    await expect(
      controller.logMeal(
        {
          authUser: {
            id: 'auth_user_123',
            email: 'user@email.com',
          },
        },
        {
          mealId: 'meal_123',
          status: 'consumed',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses authUserId for meal replacement', async () => {
    replaceMealUseCase.execute.mockResolvedValue({
      meal: buildNutritionPlanOutput().nutritionPlan.days[0].meals[0],
      replacement: {
        previousMeal: buildNutritionPlanOutput().nutritionPlan.days[0].meals[0],
        reason: 'preference',
        replacedAt: '2026-06-02T10:00:00.000Z',
      },
    });

    await controller.replaceMeal(
      { authUser: { id: 'auth_user_123', email: 'user@email.com' } },
      'meal_123',
      { reason: 'preference' },
    );

    expect(replaceMealUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      mealId: 'meal_123',
      reason: 'preference',
    });
  });

  it('uses authUserId for recommendation generation', async () => {
    generateNutritionRecommendationUseCase.execute.mockResolvedValue({
      nutritionRecommendation: buildNutritionRecommendation(),
    });

    await controller.generateNutritionRecommendation({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    });

    expect(generateNutritionRecommendationUseCase.execute).toHaveBeenCalledWith(
      {
        authUserId: 'auth_user_123',
      },
    );
  });

  it('uses authUserId and limit for recommendation history', async () => {
    getNutritionRecommendationsUseCase.execute.mockResolvedValue({
      recommendations: [buildNutritionRecommendation()],
    });

    await controller.getNutritionRecommendations(
      { authUser: { id: 'auth_user_123', email: 'user@email.com' } },
      { limit: 5 },
    );

    expect(getNutritionRecommendationsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 5,
    });
  });
});

function buildMacroTargetsResponse() {
  return {
    macroTargets: {
      calories: 2912,
      proteinGrams: 152,
      carbsGrams: 394,
      fatGrams: 81,
      formulaVersion: 'mifflin-st-jeor-v1',
      activityMultiplier: 1.55,
      goalAdjustment: 250,
      calculatedAt: '2026-06-02T10:00:00.000Z',
    },
  };
}

function buildNutritionPlanOutput() {
  return {
    nutritionPlan: {
      id: 'plan_123',
      userProfileId: 'profile_123',
      nutritionProfileId: 'nutrition_123',
      fitnessProfileId: 'fitness_123',
      status: 'active' as const,
      weekStartDate: '2026-06-01',
      weekEndDate: '2026-06-07',
      macroTargets: {
        calories: 2912,
        proteinGrams: 152,
        carbsGrams: 394,
        fatGrams: 81,
      },
      days: [
        {
          date: '2026-06-01',
          dayIndex: 1,
          dailyMacroTargets: {
            calories: 2912,
            proteinGrams: 152,
            carbsGrams: 394,
            fatGrams: 81,
          },
          meals: [
            {
              id: 'meal_123',
              type: 'breakfast' as const,
              title: 'Oats and yogurt bowl',
              description: 'Oats with yogurt, banana, and seeds.',
              foodItems: [
                {
                  name: 'oats',
                  quantity: '60',
                  unit: 'g',
                  tags: ['vegetarian'],
                },
              ],
              estimatedMacros: {
                calories: 728,
                proteinGrams: 38,
                carbsGrams: 99,
                fatGrams: 20,
              },
              alternatives: [
                {
                  id: 'meal_option_123',
                  title: 'Tofu breakfast plate',
                  foodItems: [
                    {
                      name: 'tofu',
                      quantity: '160',
                      unit: 'g',
                      tags: ['vegan', 'soy'],
                    },
                  ],
                  estimatedMacros: {
                    calories: 728,
                    proteinGrams: 38,
                    carbsGrams: 99,
                    fatGrams: 20,
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
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    },
  };
}

function buildTodayNutritionOutput() {
  const meal = buildNutritionPlanOutput().nutritionPlan.days[0].meals[0];

  return {
    todayNutrition: {
      date: '2026-06-02',
      macroTargets: {
        calories: 2912,
        proteinGrams: 152,
        carbsGrams: 394,
        fatGrams: 81,
      },
      meals: [meal],
      progress: {
        consumedCalories: 0,
        consumedProteinGrams: 0,
        consumedCarbsGrams: 0,
        consumedFatGrams: 0,
        targetCalories: 2912,
        targetProteinGrams: 152,
        targetCarbsGrams: 394,
        targetFatGrams: 81,
        adherencePercentage: 0,
      },
      nextMeal: meal,
      nutritionFocus:
        'Focus on a clean calorie surplus and consistent protein across meals.',
    },
  };
}

function buildLogMealOutput() {
  return {
    nutritionLog: {
      id: 'log_123',
      userProfileId: 'profile_123',
      nutritionPlanId: 'plan_123',
      mealId: 'meal_123',
      date: '2026-06-02',
      mealType: 'breakfast' as const,
      status: 'consumed' as const,
      actualMacros: {
        calories: 728,
        proteinGrams: 38,
        carbsGrams: 99,
        fatGrams: 20,
      },
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    },
  };
}

function buildNutritionRecommendation() {
  return {
    id: 'recommendation_123',
    userProfileId: 'profile_123',
    message: 'Keep today focused on a clean surplus and steady protein.',
    recommendations: ['Keep the surplus clean.'],
    influences: ['MUSCLE_GAIN_SURPLUS_FOCUS' as const],
    generatorVersion: 'nutrition-deterministic-v1',
    contextSnapshot: {
      goal: 'muscle_gain' as const,
    },
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
  };
}
