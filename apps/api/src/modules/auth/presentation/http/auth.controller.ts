import {
  Get,
  Headers,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import {
  REGISTER_USER_ERROR_CODES,
  RegisterUserError,
} from '../../application/use-cases/register-user/register-user.errors';
import {
  LOGIN_USER_ERROR_CODES,
  LoginUserError,
} from '../../application/use-cases/login-user/login-user.errors';
import {
  VALIDATE_SESSION_ERROR_CODES,
  ValidateSessionError,
} from '../../application/use-cases/validate-session/validate-session.errors';
import { LoginUserUseCase } from '../../application/use-cases/login-user/login-user.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user/register-user.use-case';
import { ValidateSessionUseCase } from '../../application/use-cases/validate-session/validate-session.use-case';
import { LoginUserRequestDto } from './dto/login-user.request.dto';
import { LoginUserResponseDto } from './dto/login-user.response.dto';
import { RegisterUserRequestDto } from './dto/register-user.request.dto';
import { RegisterUserResponseDto } from './dto/register-user.response.dto';
import { ValidateSessionResponseDto } from './dto/validate-session.response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly validateSessionUseCase: ValidateSessionUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterUserRequestDto,
  ): Promise<RegisterUserResponseDto> {
    try {
      const result = await this.registerUserUseCase.execute({
        name: body.name,
        email: body.email,
        password: body.password,
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          isEmailVerified: result.user.isEmailVerified,
          createdAt: result.user.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof RegisterUserError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case REGISTER_USER_ERROR_CODES.INVALID_INPUT:
      case REGISTER_USER_ERROR_CODES.PASSWORD_TOO_WEAK:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REGISTER_USER_ERROR_CODES.EMAIL_ALREADY_EXISTS:
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REGISTER_USER_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: REGISTER_USER_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginUserRequestDto,
  ): Promise<LoginUserResponseDto> {
    try {
      const result = await this.loginUserUseCase.execute({
        email: body.email,
        password: body.password,
      });

      return {
        accessToken: result.accessToken,
        user: {
          id: result.user.id,
          email: result.user.email,
        } as LoginUserResponseDto['user'],
      };
    } catch (error) {
      this.handleLoginError(error);
    }
  }

  private handleLoginError(error: unknown): never {
    if (!(error instanceof LoginUserError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case LOGIN_USER_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOGIN_USER_ERROR_CODES.INVALID_CREDENTIALS:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOGIN_USER_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: LOGIN_USER_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(
    @Headers('authorization') authorizationHeader?: string,
  ): Promise<ValidateSessionResponseDto> {
    try {
      const result = await this.validateSessionUseCase.execute({
        authorizationHeader: authorizationHeader ?? '',
      });

      return {
        user: {
          id: result.user.id,
          email: result.user.email,
        },
      };
    } catch (error) {
      this.handleValidateSessionError(error);
    }
  }

  private handleValidateSessionError(error: unknown): never {
    if (!(error instanceof ValidateSessionError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case VALIDATE_SESSION_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case VALIDATE_SESSION_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case VALIDATE_SESSION_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: VALIDATE_SESSION_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}
