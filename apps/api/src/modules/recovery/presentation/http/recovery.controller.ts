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
import { RecoverySnapshot as RecoverySnapshotEntity } from '../../domain/entities/recovery-snapshot.entity';
import {
  BUILD_RECOVERY_SNAPSHOT_ERROR_CODES,
  BuildRecoverySnapshotError,
} from '../../application/use-cases/build-recovery-snapshot/build-recovery-snapshot.errors';
import { BuildRecoverySnapshotUseCase } from '../../application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case';
import {
  GET_CURRENT_RECOVERY_ERROR_CODES,
  GetCurrentRecoveryError,
} from '../../application/use-cases/get-current-recovery/get-current-recovery.errors';
import { GetCurrentRecoveryUseCase } from '../../application/use-cases/get-current-recovery/get-current-recovery.use-case';
import {
  GET_RECOVERY_HISTORY_ERROR_CODES,
  GetRecoveryHistoryError,
} from '../../application/use-cases/get-recovery-history/get-recovery-history.errors';
import { GetRecoveryHistoryUseCase } from '../../application/use-cases/get-recovery-history/get-recovery-history.use-case';
import {
  GET_TODAY_RECOVERY_ERROR_CODES,
  GetTodayRecoveryError,
} from '../../application/use-cases/get-today-recovery/get-today-recovery.errors';
import { GetTodayRecoveryUseCase } from '../../application/use-cases/get-today-recovery/get-today-recovery.use-case';
import { GetRecoveryHistoryQueryDto } from './dto/get-recovery-history.query.dto';
import { GetRecoveryHistoryResponseDto } from './dto/get-recovery-history.response.dto';
import { GetCurrentRecoveryResponseDto } from './dto/get-current-recovery.response.dto';
import { GetTodayRecoveryResponseDto } from './dto/get-today-recovery.response.dto';
import type { RecoverySnapshotResponse } from './dto/recovery-response.type';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('recovery')
export class RecoveryController {
  constructor(
    private readonly getTodayRecoveryUseCase: GetTodayRecoveryUseCase,
    private readonly getCurrentRecoveryUseCase: GetCurrentRecoveryUseCase,
    private readonly getRecoveryHistoryUseCase: GetRecoveryHistoryUseCase,
    private readonly buildRecoverySnapshotUseCase: BuildRecoverySnapshotUseCase,
  ) {}

  @Get('today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getToday(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayRecoveryResponseDto> {
    try {
      const result = await this.getTodayRecoveryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        recoverySnapshot: mapRecoverySnapshot(result.recoverySnapshot),
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
  ): Promise<GetCurrentRecoveryResponseDto> {
    try {
      const result = await this.getCurrentRecoveryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        recoverySnapshot: mapRecoverySnapshot(result.recoverySnapshot),
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
    @Query() query: GetRecoveryHistoryQueryDto,
  ): Promise<GetRecoveryHistoryResponseDto> {
    try {
      const result = await this.getRecoveryHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        recoverySnapshots: result.recoverySnapshots.map(mapRecoverySnapshot),
      };
    } catch (error) {
      this.handleHistoryError(error);
    }
  }

  private handleTodayError(error: unknown): never {
    if (!(error instanceof GetTodayRecoveryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_TODAY_RECOVERY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_RECOVERY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_TODAY_RECOVERY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleCurrentError(error: unknown): never {
    if (!(error instanceof GetCurrentRecoveryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_CURRENT_RECOVERY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_RECOVERY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_CURRENT_RECOVERY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleHistoryError(error: unknown): never {
    if (!(error instanceof GetRecoveryHistoryError)) {
      if (error instanceof BuildRecoverySnapshotError) {
        throw new InternalServerErrorException({
          code: BUILD_RECOVERY_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
      }

      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_RECOVERY_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_RECOVERY_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_RECOVERY_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}

function mapRecoverySnapshot(
  snapshot: RecoverySnapshotEntity,
): RecoverySnapshotResponse {
  return {
    userProfileId: snapshot.userProfileId,
    date: snapshot.date,
    readinessScore: snapshot.readinessScore,
    fatigueScore: snapshot.fatigueScore,
    recoveryTrend: snapshot.recoveryTrend,
    recommendedIntensity: snapshot.recommendedIntensity,
    influences: snapshot.influences.map((influence) => influence.toJSON()),
    formulaVersion: snapshot.formulaVersion,
    sourceContext: snapshot.sourceContext,
    createdAt: snapshot.createdAt.toISOString(),
  };
}
