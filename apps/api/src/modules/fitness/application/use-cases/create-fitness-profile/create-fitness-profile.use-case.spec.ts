import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { FitnessProfile } from '../../../domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../domain/repositories/fitness-profile.repository';
import { CREATE_FITNESS_PROFILE_ERROR_CODES } from './create-fitness-profile.errors';
import { CreateFitnessProfileUseCase } from './create-fitness-profile.use-case';

describe('CreateFitnessProfileUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let useCase: CreateFitnessProfileUseCase;

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

    useCase = new CreateFitnessProfileUseCase(
      userProfileRepository,
      fitnessProfileRepository,
    );
  });

  it('creates a fitness profile successfully', async () => {
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
    fitnessProfileRepository.create.mockResolvedValue(
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
      heightCm: 180,
      weightKg: 82.5,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: {
        daysPerWeek: 4,
        minutesPerSession: 60,
      },
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

  it('returns USER_PROFILE_NOT_FOUND when the user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'missing_auth_user',
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
      }),
    ).rejects.toMatchObject({
      code: CREATE_FITNESS_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });

    expect(fitnessProfileRepository.create).not.toHaveBeenCalled();
  });

  it('returns FITNESS_PROFILE_ALREADY_EXISTS when an active profile already exists', async () => {
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

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
      }),
    ).rejects.toMatchObject({
      code: CREATE_FITNESS_PROFILE_ERROR_CODES.ALREADY_EXISTS,
    });
  });

  it('returns FITNESS_PROFILE_INVALID_INPUT for invalid ranges', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        heightCm: 99,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
      }),
    ).rejects.toMatchObject({
      code: CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
    });
  });
});
