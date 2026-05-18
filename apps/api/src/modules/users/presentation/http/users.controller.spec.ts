import { ConflictException } from '@nestjs/common';

import {
  CREATE_USER_PROFILE_ERROR_CODES,
  CreateUserProfileError,
} from '../../application/use-cases/create-user-profile/create-user-profile.errors';
import { CreateUserProfileUseCase } from '../../application/use-cases/create-user-profile/create-user-profile.use-case';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let createUserProfileUseCase: jest.Mocked<CreateUserProfileUseCase>;
  let controller: UsersController;

  beforeEach(() => {
    createUserProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateUserProfileUseCase>;

    controller = new UsersController(createUserProfileUseCase);
  });

  it('returns the safe response on success', async () => {
    createUserProfileUseCase.execute.mockResolvedValue({
      userProfile: {
        id: 'profile_123',
        authUserId: 'usr_123',
        name: 'Rodrigo Paiva',
        birthDate: new Date('1994-06-15T00:00:00.000Z'),
        gender: 'male',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date('2026-04-28T10:00:00.000Z'),
      },
    });

    const result = await controller.createProfile(
      {
        authUser: {
          id: 'usr_123',
          email: 'rodrigo@email.com',
        },
      },
      {
        name: 'Rodrigo Paiva',
        birthDate: '1994-06-15',
        gender: 'male',
      },
    );

    expect(result).toEqual({
      userProfile: {
        id: 'profile_123',
        authUserId: 'usr_123',
        name: 'Rodrigo Paiva',
        birthDate: '1994-06-15T00:00:00.000Z',
        gender: 'male',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: '2026-04-28T10:00:00.000Z',
      },
    });
  });

  it('maps USER_PROFILE_ALREADY_EXISTS to HTTP 409', async () => {
    createUserProfileUseCase.execute.mockRejectedValue(
      new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.ALREADY_EXISTS,
        'User profile already exists.',
      ),
    );

    await expect(
      controller.createProfile(
        {
          authUser: {
            id: 'usr_123',
            email: 'rodrigo@email.com',
          },
        },
        {
          name: 'Rodrigo Paiva',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
