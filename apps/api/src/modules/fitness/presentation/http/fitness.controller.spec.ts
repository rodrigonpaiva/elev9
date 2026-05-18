import { ConflictException, NotFoundException } from '@nestjs/common';

import {
  CREATE_FITNESS_PROFILE_ERROR_CODES,
  CreateFitnessProfileError,
} from '../../application/use-cases/create-fitness-profile/create-fitness-profile.errors';
import { CreateFitnessProfileUseCase } from '../../application/use-cases/create-fitness-profile/create-fitness-profile.use-case';
import {
  GET_MY_FITNESS_PROFILE_ERROR_CODES,
  GetMyFitnessProfileError,
} from '../../application/use-cases/get-my-fitness-profile/get-my-fitness-profile.errors';
import { GetMyFitnessProfileUseCase } from '../../application/use-cases/get-my-fitness-profile/get-my-fitness-profile.use-case';
import { FitnessController } from './fitness.controller';

describe('FitnessController', () => {
  let createFitnessProfileUseCase: jest.Mocked<CreateFitnessProfileUseCase>;
  let getMyFitnessProfileUseCase: jest.Mocked<GetMyFitnessProfileUseCase>;
  let controller: FitnessController;

  beforeEach(() => {
    createFitnessProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateFitnessProfileUseCase>;
    getMyFitnessProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMyFitnessProfileUseCase>;

    controller = new FitnessController(
      createFitnessProfileUseCase,
      getMyFitnessProfileUseCase,
    );
  });

  it('returns the safe response on success', async () => {
    createFitnessProfileUseCase.execute.mockResolvedValue({
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

    const result = await controller.createProfile(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
      },
    );

    expect(createFitnessProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      heightCm: 180,
      weightKg: 82.5,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: {
        daysPerWeek: 4,
        minutesPerSession: 60,
      },
      limitations: undefined,
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
        createdAt: '2026-04-29T10:30:00.000Z',
      },
    });
  });

  it('maps FITNESS_PROFILE_ALREADY_EXISTS to HTTP 409', async () => {
    createFitnessProfileUseCase.execute.mockRejectedValue(
      new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.ALREADY_EXISTS,
        'Fitness profile already exists.',
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
          heightCm: 180,
          weightKg: 82.5,
          goal: 'gain_muscle',
          activityLevel: 'medium',
          trainingAvailability: {
            daysPerWeek: 4,
            minutesPerSession: 60,
          },
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the active fitness profile safely', async () => {
    getMyFitnessProfileUseCase.execute.mockResolvedValue({
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

    const result = await controller.getMyProfile(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      },
      {},
      {},
    );

    expect(getMyFitnessProfileUseCase.execute).toHaveBeenCalledWith({
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
        createdAt: '2026-04-29T10:30:00.000Z',
      },
    });
  });

  it('maps USER_PROFILE_NOT_FOUND to HTTP 404', async () => {
    getMyFitnessProfileUseCase.execute.mockRejectedValue(
      new GetMyFitnessProfileError(
        GET_MY_FITNESS_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      ),
    );

    await expect(
      controller.getMyProfile(
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
});
