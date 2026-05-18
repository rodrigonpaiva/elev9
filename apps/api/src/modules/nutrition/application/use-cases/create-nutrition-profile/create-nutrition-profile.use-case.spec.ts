import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionProfile } from '../../../domain/entities/nutrition-profile.entity';
import { NutritionProfileRepository } from '../../../domain/repositories/nutrition-profile.repository';
import { CREATE_NUTRITION_PROFILE_ERROR_CODES } from './create-nutrition-profile.errors';
import { CreateNutritionProfileUseCase } from './create-nutrition-profile.use-case';

describe('CreateNutritionProfileUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let nutritionProfileRepository: jest.Mocked<NutritionProfileRepository>;
  let useCase: CreateNutritionProfileUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };

    nutritionProfileRepository = {
      findActiveByUserProfileId: jest.fn(),
      upsertByUserProfileId: jest.fn(),
    };

    useCase = new CreateNutritionProfileUseCase(
      userProfileRepository,
      nutritionProfileRepository,
    );
  });

  it('creates a nutrition profile successfully', async () => {
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
    nutritionProfileRepository.upsertByUserProfileId.mockResolvedValue(
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
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      goal: 'muscle_gain',
      mealsPerDay: 4,
    });

    expect(
      nutritionProfileRepository.upsertByUserProfileId,
    ).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      goal: 'muscle_gain',
      mealsPerDay: 4,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: [],
      status: 'active',
    });
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
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      },
    });
  });

  it('updates an existing profile for the same userProfileId', async () => {
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
    nutritionProfileRepository.upsertByUserProfileId.mockResolvedValue(
      new NutritionProfile({
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'fat_loss',
        mealsPerDay: 3,
        dietaryRestrictions: ['lactose'],
        allergies: ['peanut'],
        dislikedFoods: ['broccoli'],
        preferredFoods: ['rice'],
        status: 'active',
        createdAt: new Date('2026-05-18T09:30:00.000Z'),
        updatedAt: new Date('2026-05-18T10:15:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      goal: 'fat_loss',
      mealsPerDay: 3,
      dietaryRestrictions: [' lactose '],
      allergies: ['peanut'],
      dislikedFoods: ['broccoli'],
      preferredFoods: ['rice'],
    });

    expect(
      nutritionProfileRepository.upsertByUserProfileId,
    ).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      goal: 'fat_loss',
      mealsPerDay: 3,
      dietaryRestrictions: ['lactose'],
      allergies: ['peanut'],
      dislikedFoods: ['broccoli'],
      preferredFoods: ['rice'],
      status: 'active',
    });
    expect(result.nutritionProfile.updatedAt).toEqual(
      new Date('2026-05-18T10:15:00.000Z'),
    );
  });

  it('fails when the user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'missing_auth_user',
        goal: 'maintenance',
        mealsPerDay: 3,
      }),
    ).rejects.toMatchObject({
      code: CREATE_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });

    expect(
      nutritionProfileRepository.upsertByUserProfileId,
    ).not.toHaveBeenCalled();
  });

  it('persists optional arrays correctly', async () => {
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
    nutritionProfileRepository.upsertByUserProfileId.mockResolvedValue(
      new NutritionProfile({
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'maintenance',
        mealsPerDay: 5,
        dietaryRestrictions: ['vegan'],
        allergies: ['soy'],
        dislikedFoods: ['mushroom'],
        preferredFoods: ['oats'],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
      goal: 'maintenance',
      mealsPerDay: 5,
      dietaryRestrictions: ['vegan'],
      allergies: ['soy'],
      dislikedFoods: ['mushroom'],
      preferredFoods: ['oats'],
    });

    expect(
      nutritionProfileRepository.upsertByUserProfileId,
    ).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      goal: 'maintenance',
      mealsPerDay: 5,
      dietaryRestrictions: ['vegan'],
      allergies: ['soy'],
      dislikedFoods: ['mushroom'],
      preferredFoods: ['oats'],
      status: 'active',
    });
  });

  it('uses empty arrays when optional arrays are omitted', async () => {
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
    nutritionProfileRepository.upsertByUserProfileId.mockResolvedValue(
      new NutritionProfile({
        id: 'nutrition_123',
        userProfileId: 'profile_123',
        goal: 'maintenance',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: 'active',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
      goal: 'maintenance',
      mealsPerDay: 4,
    });

    expect(
      nutritionProfileRepository.upsertByUserProfileId,
    ).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      goal: 'maintenance',
      mealsPerDay: 4,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: [],
      status: 'active',
    });
  });
});
