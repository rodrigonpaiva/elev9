import {
  BadRequestException,
  Controller,
  Param,
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
import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
} from '../../application/services/personalization-read.errors';
import { GetBehavioralPatternsUseCase } from '../../application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetCurrentPersonalizationUseCase } from '../../application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetPersonalizationHistoryUseCase } from '../../application/use-cases/get-personalization-history/get-personalization-history.use-case';
import { GetTodayPersonalizationUseCase } from '../../application/use-cases/get-today-personalization/get-today-personalization.use-case';
import { GetUserBehaviorProfileUseCase } from '../../application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { ReplayPersonalizationSnapshotUseCase } from '../../application/use-cases/replay-personalization-snapshot/replay-personalization-snapshot.use-case';
import { BehavioralPattern } from '../../domain/entities/behavioral-pattern.entity';
import { PersonalizationSnapshot } from '../../domain/entities/personalization-snapshot.entity';
import { UserBehaviorProfile } from '../../domain/entities/user-behavior-profile.entity';
import { GetBehavioralPatternsResponseDto } from './dto/get-behavioral-patterns.response.dto';
import { GetCurrentPersonalizationResponseDto } from './dto/get-current-personalization.response.dto';
import { GetPersonalizationHistoryQueryDto } from './dto/get-personalization-history.query.dto';
import { GetPersonalizationHistoryResponseDto } from './dto/get-personalization-history.response.dto';
import { GetTodayPersonalizationResponseDto } from './dto/get-today-personalization.response.dto';
import { ReplayPersonalizationSnapshotResponseDto } from './dto/replay-personalization-snapshot.response.dto';
import { GetUserBehaviorProfileResponseDto } from './dto/get-user-behavior-profile.response.dto';
import {
  REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES,
  ReplayPersonalizationSnapshotError,
} from '../../application/use-cases/replay-personalization-snapshot/replay-personalization-snapshot.errors';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('personalization')
export class PersonalizationController {
  constructor(
    private readonly getTodayPersonalizationUseCase: GetTodayPersonalizationUseCase,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly getPersonalizationHistoryUseCase: GetPersonalizationHistoryUseCase,
    private readonly getBehavioralPatternsUseCase: GetBehavioralPatternsUseCase,
    private readonly getUserBehaviorProfileUseCase: GetUserBehaviorProfileUseCase,
    private readonly replayPersonalizationSnapshotUseCase: ReplayPersonalizationSnapshotUseCase,
  ) {}

  @Get('today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getTodayPersonalization(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayPersonalizationResponseDto> {
    try {
      const result = await this.getTodayPersonalizationUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        personalizationSnapshot: mapPersonalizationSnapshot(
          result.personalizationSnapshot,
        ),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('current')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentPersonalization(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetCurrentPersonalizationResponseDto> {
    try {
      const result = await this.getCurrentPersonalizationUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        personalizationSnapshot: mapPersonalizationSnapshot(
          result.personalizationSnapshot,
        ),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getPersonalizationHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetPersonalizationHistoryQueryDto,
  ): Promise<GetPersonalizationHistoryResponseDto> {
    try {
      const result = await this.getPersonalizationHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        personalizationSnapshots: result.personalizationSnapshots.map(
          mapPersonalizationSnapshot,
        ),
        limit: result.limit,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('patterns')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getBehavioralPatterns(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetBehavioralPatternsResponseDto> {
    try {
      const result = await this.getBehavioralPatternsUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        behavioralPatterns: result.behavioralPatterns.map(mapBehavioralPattern),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('profile')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getUserBehaviorProfile(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetUserBehaviorProfileResponseDto> {
    try {
      const result = await this.getUserBehaviorProfileUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        userBehaviorProfile: mapUserBehaviorProfile(result.userBehaviorProfile),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('debug/:id/replay')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async replayPersonalizationSnapshot(
    @Req() request: RequestWithAuthUser,
    @Param('id') personalizationSnapshotId: string,
  ): Promise<ReplayPersonalizationSnapshotResponseDto> {
    const normalizedId =
      typeof personalizationSnapshotId === 'string'
        ? personalizationSnapshotId.trim()
        : '';

    if (!normalizedId) {
      throw new BadRequestException(
        this.buildErrorPayload({
          code: REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INVALID_INPUT,
          message: 'Invalid personalization snapshot id.',
        }),
      );
    }

    try {
      const result = await this.replayPersonalizationSnapshotUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        personalizationSnapshotId: normalizedId,
      });

      return {
        persisted: mapPersonalizationSnapshot(result.persisted),
        recalculated: result.recalculated,
        comparison: {
          matches: result.comparison.matches,
          differences: result.comparison.differences.map((difference) => ({
            field: difference.field,
            persisted: difference.persisted,
            recalculated: difference.recalculated,
          })),
        },
        replayedAt: result.replayedAt,
      };
    } catch (error) {
      this.handleReplayError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof PersonalizationReadError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case PERSONALIZATION_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case PERSONALIZATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case PERSONALIZATION_READ_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case PERSONALIZATION_READ_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleReplayError(error: unknown): never {
    if (!(error instanceof ReplayPersonalizationSnapshotError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.PERSONALIZATION_SNAPSHOT_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private buildErrorPayload(error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }): {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  } {
    return {
      message: error.message,
      code: error.code,
      ...(error.details ? { details: error.details } : {}),
    };
  }
}

function mapPersonalizationSnapshot(snapshot: PersonalizationSnapshot) {
  return snapshot.toJSON();
}

function mapBehavioralPattern(pattern: BehavioralPattern) {
  return pattern.toJSON();
}

function mapUserBehaviorProfile(profile: UserBehaviorProfile) {
  return profile.toJSON();
}
