import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  REGISTER_USER_ERROR_CODES,
  RegisterUserError,
} from '../../application/use-cases/register-user/register-user.errors';
import {
  VALIDATE_SESSION_ERROR_CODES,
  ValidateSessionError,
} from '../../application/use-cases/validate-session/validate-session.errors';
import { LoginUserUseCase } from '../../application/use-cases/login-user/login-user.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user/register-user.use-case';
import { ValidateSessionUseCase } from '../../application/use-cases/validate-session/validate-session.use-case';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let registerUserUseCase: jest.Mocked<RegisterUserUseCase>;
  let loginUserUseCase: jest.Mocked<LoginUserUseCase>;
  let validateSessionUseCase: jest.Mocked<ValidateSessionUseCase>;
  let controller: AuthController;

  beforeEach(() => {
    registerUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RegisterUserUseCase>;

    loginUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LoginUserUseCase>;

    validateSessionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateSessionUseCase>;

    controller = new AuthController(
      registerUserUseCase,
      loginUserUseCase,
      validateSessionUseCase,
    );
  });

  it('returns the safe register response on success', async () => {
    registerUserUseCase.execute.mockResolvedValue({
      user: {
        id: 'usr_123',
        email: 'rodrigo@email.com',
        name: 'Rodrigo Paiva',
        isEmailVerified: false,
        createdAt: new Date('2026-04-28T10:00:00.000Z'),
      },
    });

    const result = await controller.register({
      name: 'Rodrigo Paiva',
      email: 'rodrigo@email.com',
      password: 'StrongPassword123',
    });

    expect(result).toEqual({
      user: {
        id: 'usr_123',
        email: 'rodrigo@email.com',
        name: 'Rodrigo Paiva',
        isEmailVerified: false,
        createdAt: '2026-04-28T10:00:00.000Z',
      },
    });
  });

  it('maps AUTH_EMAIL_ALREADY_EXISTS to HTTP 409', async () => {
    registerUserUseCase.execute.mockRejectedValue(
      new RegisterUserError(
        REGISTER_USER_ERROR_CODES.EMAIL_ALREADY_EXISTS,
        'Email already exists.',
      ),
    );

    await expect(
      controller.register({
        name: 'Rodrigo Paiva',
        email: 'rodrigo@email.com',
        password: 'StrongPassword123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps AUTH_INVALID_INPUT to HTTP 400', async () => {
    registerUserUseCase.execute.mockRejectedValue(
      new RegisterUserError(
        REGISTER_USER_ERROR_CODES.INVALID_INPUT,
        'Invalid input.',
      ),
    );

    await expect(
      controller.register({
        name: 'Rodrigo Paiva',
        email: 'rodrigo@email.com',
        password: 'StrongPassword123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps AUTH_PASSWORD_TOO_WEAK to HTTP 400', async () => {
    registerUserUseCase.execute.mockRejectedValue(
      new RegisterUserError(
        REGISTER_USER_ERROR_CODES.PASSWORD_TOO_WEAK,
        'Password does not meet security requirements.',
      ),
    );

    await expect(
      controller.register({
        name: 'Rodrigo Paiva',
        email: 'rodrigo@email.com',
        password: 'StrongPassword123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the safe session response on success', async () => {
    validateSessionUseCase.execute.mockResolvedValue({
      user: {
        id: 'usr_123',
        email: 'rodrigo@email.com',
      },
    });

    const result = await controller.me('Bearer valid-token');

    expect(result).toEqual({
      user: {
        id: 'usr_123',
        email: 'rodrigo@email.com',
      },
    });
  });

  it('maps AUTH_INVALID_SESSION to HTTP 401', async () => {
    validateSessionUseCase.execute.mockRejectedValue(
      new ValidateSessionError(
        VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(controller.me(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
