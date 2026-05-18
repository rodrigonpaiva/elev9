import { Inject, Injectable } from '@nestjs/common';

import {
  AuthUserRepository,
  AUTH_USER_REPOSITORY,
} from '../../../domain/repositories/auth-user.repository';
import {
  ACCESS_TOKEN_SIGNER,
  AccessTokenSigner,
} from '../../../domain/services/access-token-signer.service';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '../../../domain/services/password-hasher.service';
import { LoginUserInput } from './login-user.input';
import { LOGIN_USER_ERROR_CODES, LoginUserError } from './login-user.errors';
import { LoginUserOutput } from './login-user.output';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY)
    private readonly authUserRepository: AuthUserRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(ACCESS_TOKEN_SIGNER)
    private readonly accessTokenSigner: AccessTokenSigner,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const normalizedEmail =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const rawPassword =
      typeof input.password === 'string' ? input.password : '';

    this.validateInput({
      email: normalizedEmail,
      password: rawPassword,
    });

    try {
      const authUser =
        await this.authUserRepository.findByEmail(normalizedEmail);

      if (!authUser) {
        throw new LoginUserError(
          LOGIN_USER_ERROR_CODES.INVALID_CREDENTIALS,
          'Invalid credentials.',
        );
      }

      const isPasswordValid = await this.passwordHasher.compare(
        rawPassword,
        authUser.passwordHash,
      );

      if (!isPasswordValid) {
        throw new LoginUserError(
          LOGIN_USER_ERROR_CODES.INVALID_CREDENTIALS,
          'Invalid credentials.',
        );
      }

      const accessToken = await this.accessTokenSigner.signAccessToken({
        sub: authUser.id,
        email: authUser.email,
      });

      return {
        accessToken,
        user: {
          id: authUser.id,
          email: authUser.email,
        },
      };
    } catch (error) {
      if (error instanceof LoginUserError) {
        throw error;
      }

      throw new LoginUserError(
        LOGIN_USER_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private validateInput(input: LoginUserInput): void {
    if (!input.email || !input.password) {
      throw new LoginUserError(
        LOGIN_USER_ERROR_CODES.INVALID_INPUT,
        'Invalid input.',
      );
    }

    if (!this.isValidEmail(input.email)) {
      throw new LoginUserError(
        LOGIN_USER_ERROR_CODES.INVALID_INPUT,
        'Invalid input.',
      );
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
