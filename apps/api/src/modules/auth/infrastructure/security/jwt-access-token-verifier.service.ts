import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import {
  AccessTokenVerifier,
  AccessTokenVerifierPayload,
} from '../../domain/services/access-token-verifier.service';
import {
  ValidateSessionError,
  VALIDATE_SESSION_ERROR_CODES,
} from '../../application/use-cases/validate-session/validate-session.errors';

@Injectable()
export class JwtAccessTokenVerifierService implements AccessTokenVerifier {
  constructor(private readonly jwtService: JwtService) {}

  async verifyAccessToken(token: string): Promise<AccessTokenVerifierPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<AccessTokenVerifierPayload>(token);

      if (!payload?.sub || !payload?.email) {
        throw new ValidateSessionError(
          VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
          'Invalid session.',
        );
      }

      return {
        sub: payload.sub,
        email: payload.email,
      };
    } catch (error) {
      if (error instanceof ValidateSessionError) {
        throw error;
      }

      if (
        error instanceof TokenExpiredError ||
        error instanceof JsonWebTokenError
      ) {
        throw new ValidateSessionError(
          VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
          'Invalid session.',
        );
      }

      throw error;
    }
  }
}
