import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NutritionProfile } from '../../../domain/entities/nutrition-profile.entity';
import { NutritionProfileRepository } from '../../../domain/repositories/nutrition-profile.repository';
import { GET_NUTRITION_PROFILE_ERROR_CODES } from './get-nutrition-profile.errors';
import { GetNutritionProfileUseCase } from './get-nutrition-profile.use-case';

describe('GetNutritionProfileUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let nutritionProfileRepository: jest.Mocked<NutritionProfileRepository>;
  let useCase: GetNutritionProfileUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };

    nutritionProfileRepository = {
      findActiveByUserProfileId: jest.fn(),
      upsertByUserProfileId: jest.fn(),
    };

    useCase = new GetNutritionProfileUseCase(
      userProfileRepository,
      nutritionProfileRepository,
    );
  });

  it('returns the existing nutrition profile', async () => {
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
        updatedAt: new Date('2026-05-18T10:05:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
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
        updatedAt: new Date('2026-05-18T10:05:00.000Z'),
      },
    });
  });

  it('fails when the user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('fails when the nutrition profile does not exist', async () => {
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
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_NUTRITION_PROFILE_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
    });
  });
});
