import { FitnessProfile } from '../../../../fitness/domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionPlan } from '../../../domain/entities/nutrition-plan.entity';
import { NutritionProfile } from '../../../domain/entities/nutrition-profile.entity';
import { NutritionPlanRepository } from '../../../domain/repositories/nutrition-plan.repository';
import { NutritionProfileRepository } from '../../../domain/repositories/nutrition-profile.repository';
import { CREATE_NUTRITION_PLAN_ERROR_CODES } from './create-nutrition-plan.errors';
import { CreateNutritionPlanUseCase } from './create-nutrition-plan.use-case';

describe('CreateNutritionPlanUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let nutritionProfileRepository: jest.Mocked<NutritionProfileRepository>;
  let nutritionPlanRepository: jest.Mocked<NutritionPlanRepository>;
  let useCase: CreateNutritionPlanUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-02T10:00:00.000Z'));

    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    fitnessProfileRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
    };
    nutritionProfileRepository = {
      findActiveByUserProfileId: jest.fn(),
      upsertByUserProfileId: jest.fn(),
    };
    nutritionPlanRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
      replaceActiveByUserProfileId: jest.fn(async (_userProfileId, input) =>
        buildPersistedPlan(input),
      ),
      replaceMeal: jest.fn(),
    };

    useCase = new CreateNutritionPlanUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      nutritionProfileRepository,
      nutritionPlanRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a weekly nutrition plan when no active plan exists', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeNutritionProfile();
    nutritionPlanRepository.findActiveByUserProfileId.mockResolvedValue(null);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      nutritionPlanRepository.replaceActiveByUserProfileId,
    ).toHaveBeenCalledWith(
      'profile_123',
      expect.objectContaining({
        userProfileId: 'profile_123',
        nutritionProfileId: 'nutrition_123',
        fitnessProfileId: 'fitness_123',
        status: 'active',
        weekStartDate: '2026-06-01',
        weekEndDate: '2026-06-07',
        generatedBy: 'deterministic',
      }),
    );
    expect(result.nutritionPlan.status).toBe('active');
  });

  it('uses the repository replacement policy for active plans', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeNutritionProfile();

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      nutritionPlanRepository.replaceActiveByUserProfileId,
    ).toHaveBeenCalledTimes(1);
  });

  it('fails when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CREATE_NUTRITION_PLAN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('fails when fitness profile does not exist', async () => {
    arrangeUserProfile();
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CREATE_NUTRITION_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it('fails when nutrition profile does not exist', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CREATE_NUTRITION_PLAN_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
    });
  });

  it('fails when heightCm is missing', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile({ heightCm: undefined as unknown as number });
    arrangeNutritionProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CREATE_NUTRITION_PLAN_ERROR_CODES.HEIGHT_CM_MISSING,
    });
  });

  it('fails when weightKg is missing', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile({ weightKg: undefined as unknown as number });
    arrangeNutritionProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CREATE_NUTRITION_PLAN_ERROR_CODES.WEIGHT_KG_MISSING,
    });
  });

  it('generates a plan with 7 days and mealsPerDay meals', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeNutritionProfile({ mealsPerDay: 5 });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.nutritionPlan.days).toHaveLength(7);
    expect(
      result.nutritionPlan.days.every((day) => day.meals.length === 5),
    ).toBe(true);
  });

  it('snapshots macro targets and source context into the persisted plan', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeNutritionProfile();

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.nutritionPlan.macroTargets).toEqual({
      calories: 2912,
      proteinGrams: 152,
      carbsGrams: 394,
      fatGrams: 81,
    });
    expect(result.nutritionPlan.sourceContext).toEqual({
      formulaVersion: 'mifflin-st-jeor-v1',
      activityMultiplier: 1.55,
      goalAdjustment: 250,
    });
  });

  function arrangeUserProfile(
    overrides: Partial<ConstructorParameters<typeof UserProfile>[0]> = {},
  ): void {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo Paiva',
        birthDate: new Date('1994-05-20T00:00:00.000Z'),
        gender: 'male',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date('2026-05-18T09:00:00.000Z'),
        updatedAt: new Date('2026-05-18T09:00:00.000Z'),
        ...overrides,
      }),
    );
  }

  function arrangeFitnessProfile(
    overrides: Partial<ConstructorParameters<typeof FitnessProfile>[0]> = {},
  ): void {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 178,
        weightKg: 76,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 50,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date('2026-05-18T09:00:00.000Z'),
        updatedAt: new Date('2026-05-18T09:00:00.000Z'),
        ...overrides,
      }),
    );
  }

  function arrangeNutritionProfile(
    overrides: Partial<ConstructorParameters<typeof NutritionProfile>[0]> = {},
  ): void {
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new NutritionProfile({
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
        ...overrides,
      }),
    );
  }
});

function buildPersistedPlan(
  input: Parameters<NutritionPlanRepository['create']>[0],
): NutritionPlan {
  return new NutritionPlan({
    id: 'plan_123',
    ...input,
    createdAt: new Date('2026-06-02T10:00:00.000Z'),
    updatedAt: new Date('2026-06-02T10:00:00.000Z'),
  });
}
