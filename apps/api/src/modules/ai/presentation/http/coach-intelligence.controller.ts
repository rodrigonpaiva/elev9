import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import type { CoachIntelligenceAggregate } from '@elev9/types';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import {
  COACH_INTELLIGENCE_ERROR_CODES,
  GetCoachIntelligenceError,
} from '../../application/services/coach-intelligence/coach-intelligence.errors';
import { GetCoachIntelligenceUseCase } from '../../application/use-cases/get-coach-intelligence/get-coach-intelligence.use-case';
import type { RequestWithCorrelationId } from '../../../../common/http/request-with-correlation.interface';

type RequestWithAuthUser = RequestWithCorrelationId &
  Request & {
    authUser?: {
      id: string;
      email: string;
    };
  };

@Controller('ai')
export class CoachIntelligenceController {
  constructor(
    private readonly getCoachIntelligenceUseCase: GetCoachIntelligenceUseCase,
  ) {}

  @Get('coach-intelligence')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachIntelligence(
    @Req() request: RequestWithAuthUser,
  ): Promise<CoachIntelligenceAggregate> {
    const authUserId = request.authUser?.id?.trim();

    if (!authUserId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_SESSION',
        message: 'Invalid session.',
      });
    }

    try {
      return await this.getCoachIntelligenceUseCase.execute({
        authUserId,
        ...(request.requestId ? { requestId: request.requestId } : {}),
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof GetCoachIntelligenceError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case COACH_INTELLIGENCE_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: 'AUTH_INVALID_SESSION',
          message: 'Invalid session.',
        });
      case COACH_INTELLIGENCE_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
        });
      case COACH_INTELLIGENCE_ERROR_CODES.FEATURE_DISABLED:
        throw new ServiceUnavailableException(
          'Coach intelligence is temporarily unavailable.',
        );
      case COACH_INTELLIGENCE_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: COACH_INTELLIGENCE_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}
