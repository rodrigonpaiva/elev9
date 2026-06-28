import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionLog } from '../../../domain/entities/nutrition-log.entity';
import { NutritionPlan } from '../../../domain/entities/nutrition-plan.entity';
import { NutritionProfile } from '../../../domain/entities/nutrition-profile.entity';
import { NutritionRecommendation } from '../../../domain/entities/nutrition-recommendation.entity';
import { NutritionLogRepository } from '../../../domain/repositories/nutrition-log.repository';
import { NutritionPlanRepository } from '../../../domain/repositories/nutrition-plan.repository';
import { NutritionProfileRepository } from '../../../domain/repositories/nutrition-profile.repository';
import { NutritionRecommendationRepository } from '../../../domain/repositories/nutrition-recommendation.repository';
import { GenerateNutritionRecommendationUseCase } from './generate-nutrition-recommendation.use-case';

describe('GenerateNutritionRecommendationUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let nutritionProfileRepository: jest.Mocked<NutritionProfileRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let nutritionLogRepository: jest.Mocked<NutritionLogRepository>;
  let nutritionRecommendationRepository: jest.Mocked<NutritionRecommendationRepository>;
  let useCase: GenerateNutritionRecommendationUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-02T10:00:00.000Z'));
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
    nutritionRecommendationRepository = {
      create: jest.fn(
        async (input) =>
          new NutritionRecommendation({
            id: 'recommendation_123',
            ...input,
            createdAt: new Date('2026-06-02T10:00:00.000Z'),
          }),
      ),
      findManyByUserProfileId: jest.fn(),
    };
    useCase = new GenerateNutritionRecommendationUseCase(
      userProfileRepository,
      nutritionProfileRepository,
      nutritionPlanRepository,
      nutritionLogRepository,
      nutritionRecommendationRepository,
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
    nutritionLogRepository.findByUserProfileIdAndDateRange.mockResolvedValue(
      [],
    );
  });

  afterEach(() => jest.useRealTimers());

  it('generates and persists initial recommendation without logs', async () => {
    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.nutritionRecommendation.influences).toContain('NO_LOGS_YET');
    expect(nutritionRecommendationRepository.create).toHaveBeenCalled();
  });

  it('adds skipped and partial influences', async () => {
    nutritionLogRepository.findByUserProfileIdAndDateRange.mockResolvedValue([
      buildNutritionLog({ status: 'skipped' }),
      buildNutritionLog({ status: 'partial' }),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.nutritionRecommendation.influences).toContain(
      'SKIPPED_MEALS',
    );
    expect(result.nutritionRecommendation.influences).toContain(
      'PARTIAL_MEALS',
    );
  });

  it('adds goal focus influence for fat loss', async () => {
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionProfile({ goal: 'fat_loss' }),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.nutritionRecommendation.influences).toContain(
      'FAT_LOSS_DEFICIT_FOCUS',
    );
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
    dislikedFoods: [],
    preferredFoods: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

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
        meals: [],
      },
    ],
    generatedBy: 'deterministic',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildNutritionLog(
  overrides: Partial<ConstructorParameters<typeof NutritionLog>[0]> = {},
): NutritionLog {
  return new NutritionLog({
    id: 'log_123',
    userProfileId: 'profile_123',
    nutritionPlanId: 'plan_123',
    mealId: 'meal_123',
    date: '2026-06-02',
    mealType: 'breakfast',
    status: 'consumed',
    actualMacros: {
      calories: 100,
      proteinGrams: 5,
      carbsGrams: 10,
      fatGrams: 2,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}
