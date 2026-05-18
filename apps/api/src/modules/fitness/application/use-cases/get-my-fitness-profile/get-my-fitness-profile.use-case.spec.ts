import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { FitnessProfile } from '../../../domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../domain/repositories/fitness-profile.repository';
import { GET_MY_FITNESS_PROFILE_ERROR_CODES } from './get-my-fitness-profile.errors';
import { GetMyFitnessProfileUseCase } from './get-my-fitness-profile.use-case';

describe('GetMyFitnessProfileUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let useCase: GetMyFitnessProfileUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };

    fitnessProfileRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
    };

    useCase = new GetMyFitnessProfileUseCase(
      userProfileRepository,
      fitnessProfileRepository,
    );
  });

  it('returns the active fitness profile successfully', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo Paiva',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date('2026-04-29T10:00:00.000Z'),
        updatedAt: new Date('2026-04-29T10:00:00.000Z'),
      }),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date('2026-04-29T10:30:00.000Z'),
        updatedAt: new Date('2026-04-29T10:30:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual({
      fitnessProfile: {
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date('2026-04-29T10:30:00.000Z'),
      },
    });
  });

  it('returns USER_PROFILE_NOT_FOUND when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_MY_FITNESS_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('returns FITNESS_PROFILE_NOT_FOUND when active fitness profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo Paiva',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date('2026-04-29T10:00:00.000Z'),
        updatedAt: new Date('2026-04-29T10:00:00.000Z'),
      }),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_MY_FITNESS_PROFILE_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });
});
