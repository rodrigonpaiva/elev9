import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionPlan } from '../../../domain/entities/nutrition-plan.entity';
import { NutritionPlanRepository } from '../../../domain/repositories/nutrition-plan.repository';
import { GET_CURRENT_NUTRITION_PLAN_ERROR_CODES } from './get-current-nutrition-plan.errors';
import { GetCurrentNutritionPlanUseCase } from './get-current-nutrition-plan.use-case';

describe('GetCurrentNutritionPlanUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let useCase: GetCurrentNutritionPlanUseCase;

  beforeEach(() => {
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

    useCase = new GetCurrentNutritionPlanUseCase(
      userProfileRepository,
      nutritionPlanRepository,
    );
  });

  it('returns the active nutrition plan', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan(),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.nutritionPlan.id).toBe('plan_123');
  });

  it('fails when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('fails when active nutrition plan does not exist', async () => {
    arrangeUserProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_CURRENT_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
    });
  });

  it('uses only the authenticated user profile id', async () => {
    arrangeUserProfile({ id: 'profile_real' });
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionPlan({ userProfileId: 'profile_real' }),
    );

    await useCase.execute({ authUserId: 'auth_user_real' });

    expect(
      nutritionPlanRepository.findActiveByUserProfileId,
    ).toHaveBeenCalledWith('profile_real');
  });

  function arrangeUserProfile(
    overrides: Partial<ConstructorParameters<typeof UserProfile>[0]> = {},
  ): void {
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
        ...overrides,
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
    days: [],
    generatedBy: 'deterministic',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  });
}
