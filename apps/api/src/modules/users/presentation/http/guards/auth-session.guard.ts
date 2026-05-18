import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import {
  VALIDATE_SESSION_ERROR_CODES,
  ValidateSessionError,
} from '../../../../auth/application/use-cases/validate-session/validate-session.errors';
import { ValidateSessionUseCase } from '../../../../auth/application/use-cases/validate-session/validate-session.use-case';

type RequestWithAuthUser = {
  headers: Record<string, string | string[] | undefined>;
  authUser?: {
    id: string;
    email: string;
  };
};

@Injectable()
export class AuthSessionGuard implements CanActivate {
  constructor(
    private readonly validateSessionUseCase: ValidateSessionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();

    const authorizationHeader = request.headers.authorization;
    const normalizedAuthorizationHeader = Array.isArray(authorizationHeader)
      ? (authorizationHeader[0] ?? '')
      : (authorizationHeader ?? '');

    try {
      const result = await this.validateSessionUseCase.execute({
        authorizationHeader: normalizedAuthorizationHeader,
      });

      request.authUser = result.user;

      return true;
    } catch (error) {
      if (
        error instanceof ValidateSessionError &&
        error.code === VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION
      ) {
        throw new UnauthorizedException({
          code: VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
          message: 'Invalid session.',
        });
      }

      if (
        error instanceof ValidateSessionError &&
        error.code === VALIDATE_SESSION_ERROR_CODES.INVALID_INPUT
      ) {
        throw new UnauthorizedException({
          code: VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION,
          message: 'Invalid session.',
        });
      }

      throw new InternalServerErrorException('An unexpected error occurred.');
    }
  }
}
