import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { AdaptiveTrainingRecommendation as AdaptiveTrainingRecommendationEntity } from '../../domain/entities/adaptive-training-recommendation.entity';
import {
  GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES,
  GetAdaptiveTrainingHistoryError,
} from '../../application/use-cases/get-adaptive-training-history/get-adaptive-training-history.errors';
import { GetAdaptiveTrainingHistoryUseCase } from '../../application/use-cases/get-adaptive-training-history/get-adaptive-training-history.use-case';
import {
  GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES,
  GetCurrentAdaptiveTrainingError,
} from '../../application/use-cases/get-current-adaptive-training/get-current-adaptive-training.errors';
import { GetCurrentAdaptiveTrainingUseCase } from '../../application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import {
  GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES,
  GetTodayAdaptiveTrainingError,
} from '../../application/use-cases/get-today-adaptive-training/get-today-adaptive-training.errors';
import { GetTodayAdaptiveTrainingUseCase } from '../../application/use-cases/get-today-adaptive-training/get-today-adaptive-training.use-case';
import { GetAdaptiveTrainingHistoryQueryDto } from './dto/get-adaptive-training-history.query.dto';
import { GetAdaptiveTrainingHistoryResponseDto } from './dto/get-adaptive-training-history.response.dto';
import { GetCurrentAdaptiveTrainingResponseDto } from './dto/get-current-adaptive-training.response.dto';
import { GetTodayAdaptiveTrainingResponseDto } from './dto/get-today-adaptive-training.response.dto';
import type { AdaptiveTrainingRecommendationResponse } from './dto/adaptive-training-response.type';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('training/adaptive')
export class AdaptiveTrainingController {
  constructor(
    private readonly getTodayAdaptiveTrainingUseCase: GetTodayAdaptiveTrainingUseCase,
    private readonly getCurrentAdaptiveTrainingUseCase: GetCurrentAdaptiveTrainingUseCase,
    private readonly getAdaptiveTrainingHistoryUseCase: GetAdaptiveTrainingHistoryUseCase,
  ) {}

  @Get('today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getToday(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayAdaptiveTrainingResponseDto> {
    try {
      const result = await this.getTodayAdaptiveTrainingUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        adaptiveTrainingRecommendation: mapAdaptiveTrainingRecommendation(
          result.adaptiveTrainingRecommendation,
        ),
      };
    } catch (error) {
      this.handleTodayError(error);
    }
  }

  @Get('current')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrent(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetCurrentAdaptiveTrainingResponseDto> {
    try {
      const result = await this.getCurrentAdaptiveTrainingUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        adaptiveTrainingRecommendation: mapAdaptiveTrainingRecommendation(
          result.adaptiveTrainingRecommendation,
        ),
      };
    } catch (error) {
      this.handleCurrentError(error);
    }
  }

  @Get('history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetAdaptiveTrainingHistoryQueryDto,
  ): Promise<GetAdaptiveTrainingHistoryResponseDto> {
    try {
      const result = await this.getAdaptiveTrainingHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        adaptiveTrainingRecommendations:
          result.adaptiveTrainingRecommendations.map(
            mapAdaptiveTrainingRecommendation,
          ),
      };
    } catch (error) {
      this.handleHistoryError(error);
    }
  }

  private handleTodayError(error: unknown): never {
    if (!(error instanceof GetTodayAdaptiveTrainingError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleCurrentError(error: unknown): never {
    if (!(error instanceof GetCurrentAdaptiveTrainingError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleHistoryError(error: unknown): never {
    if (!(error instanceof GetAdaptiveTrainingHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}

function mapAdaptiveTrainingRecommendation(
  recommendation: AdaptiveTrainingRecommendationEntity,
): AdaptiveTrainingRecommendationResponse {
  return {
    id: recommendation.id,
    userProfileId: recommendation.userProfileId,
    trainingPlanId: recommendation.trainingPlanId,
    date: recommendation.date,
    recommendationType: recommendation.recommendationType,
    recommendedIntensity: recommendation.recommendedIntensity,
    volumeAction: recommendation.volumeAction,
    reasoning: recommendation.reasoning,
    influences: recommendation.influences.map((influence) =>
      influence.toJSON(),
    ),
    sourceContext: recommendation.sourceContext,
    formulaVersion: recommendation.formulaVersion,
    generatedBy: recommendation.generatedBy,
    createdAt: recommendation.createdAt.toISOString(),
    updatedAt: recommendation.updatedAt.toISOString(),
  };
}
