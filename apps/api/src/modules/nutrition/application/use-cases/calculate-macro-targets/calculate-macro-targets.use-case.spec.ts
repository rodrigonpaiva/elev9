import { FitnessProfile } from '../../../../fitness/domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionProfile } from '../../../domain/entities/nutrition-profile.entity';
import { NutritionProfileRepository } from '../../../domain/repositories/nutrition-profile.repository';
import { CALCULATE_MACRO_TARGETS_ERROR_CODES } from './calculate-macro-targets.errors';
import { CalculateMacroTargetsUseCase } from './calculate-macro-targets.use-case';

describe('CalculateMacroTargetsUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let nutritionProfileRepository: jest.Mocked<NutritionProfileRepository>;
  let useCase: CalculateMacroTargetsUseCase;

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

    useCase = new CalculateMacroTargetsUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      nutritionProfileRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates macro targets successfully with complete data', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile();
    arrangeNutritionProfile();

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result).toEqual({
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
    });
  });

  it('allows deterministic fallback when birthDate is missing', async () => {
    arrangeUserProfile({ birthDate: undefined });
    arrangeFitnessProfile();
    arrangeNutritionProfile();

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.macroTargets.calories).toBeGreaterThan(0);
  });

  it('allows deterministic fallback when gender is missing', async () => {
    arrangeUserProfile({ gender: undefined });
    arrangeFitnessProfile();
    arrangeNutritionProfile();

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.macroTargets.calories).toBeGreaterThan(0);
  });

  it('fails when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CALCULATE_MACRO_TARGETS_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('fails when fitness profile does not exist', async () => {
    arrangeUserProfile();
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CALCULATE_MACRO_TARGETS_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
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
      code: CALCULATE_MACRO_TARGETS_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
    });
  });

  it('fails when heightCm is missing', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile({ heightCm: undefined as unknown as number });
    arrangeNutritionProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CALCULATE_MACRO_TARGETS_ERROR_CODES.HEIGHT_CM_MISSING,
    });
  });

  it('fails when weightKg is missing', async () => {
    arrangeUserProfile();
    arrangeFitnessProfile({ weightKg: undefined as unknown as number });
    arrangeNutritionProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: CALCULATE_MACRO_TARGETS_ERROR_CODES.WEIGHT_KG_MISSING,
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
