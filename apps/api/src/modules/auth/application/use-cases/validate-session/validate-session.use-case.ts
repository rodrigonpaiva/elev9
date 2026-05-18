import { Inject, Injectable } from '@nestjs/common';

import {
  ACCESS_TOKEN_VERIFIER,
  AccessTokenVerifier,
} from '../../../domain/services/access-token-verifier.service';
import {
  VALIDATE_SESSION_ERROR_CODES,
  ValidateSessionError,
} from './validate-session.errors';
import { ValidateSessionInput } from './validate-session.input';
import { ValidateSessionOutput } from './validate-session.output';

@Injectable()
export class ValidateSessionUseCase {
  constructor(
    @Inject(ACCESS_TOKEN_VERIFIER)
    private readonly accessTokenVerifier: AccessTokenVerifier,
  ) {}

  async execute(input: ValidateSessionInput): Promise<ValidateSessionOutput> {
    const authorizationHeader =
      typeof input.authorizationHeader === 'string'
        ? input.authorizationHeader.trim()
        : '';

    const token = this.extractBearerToken(authorizationHeader);

    try {
      const payload = await this.accessTokenVerifier.verifyAccessToken(token);

      return {
        user: {
          id: payload.sub,
          email: payload.email,
        },
      };
    } catch (error) {
      if (error instanceof ValidateSessionError) {
        throw error;
      }

      throw new ValidateSessionError(
        VALIDATE_SESSION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private extractBearerToken(authorizationHeader: string): string {
    if (!authorizationHeader) {
      throw new ValidateSessionError(
        VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    const match = authorizationHeader.match(/^bearer\s+(.+)$/i);

    if (!match) {
      throw new ValidateSessionError(
        VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    const token = match[1]?.trim();

    if (!token) {
      throw new ValidateSessionError(
        VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    return token;
  }
}
