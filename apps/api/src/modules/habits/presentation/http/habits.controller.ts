import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import {
  HABIT_READ_ERROR_CODES,
  HabitReadError,
} from '../../application/services/habit-read.errors';
import { GetConsistencySummaryUseCase } from '../../application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetHabitHistoryUseCase } from '../../application/use-cases/get-habit-history/get-habit-history.use-case';
import { GetHabitRiskSignalsUseCase } from '../../application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetTodayHabitsUseCase } from '../../application/use-cases/get-today-habits/get-today-habits.use-case';
import {
  REPLAY_HABIT_SNAPSHOT_ERROR_CODES,
  ReplayHabitSnapshotError,
} from '../../application/use-cases/replay-habit-snapshot/replay-habit-snapshot.errors';
import { ReplayHabitSnapshotUseCase } from '../../application/use-cases/replay-habit-snapshot/replay-habit-snapshot.use-case';
import { ConsistencySummary } from '../../domain/entities/consistency-summary.entity';
import { HabitRiskSignal } from '../../domain/entities/habit-risk-signal.entity';
import { HabitSnapshot } from '../../domain/entities/habit-snapshot.entity';
import { GetConsistencySummaryResponseDto } from './dto/get-consistency-summary.response.dto';
import { GetCurrentHabitsResponseDto } from './dto/get-current-habits.response.dto';
import { GetHabitHistoryQueryDto } from './dto/get-habit-history.query.dto';
import { GetHabitHistoryResponseDto } from './dto/get-habit-history.response.dto';
import { GetHabitRiskSignalsResponseDto } from './dto/get-habit-risk-signals.response.dto';
import { GetTodayHabitsResponseDto } from './dto/get-today-habits.response.dto';
import { ReplayHabitSnapshotResponseDto } from './dto/replay-habit-snapshot.response.dto';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('habits')
export class HabitsController {
  constructor(
    private readonly getTodayHabitsUseCase: GetTodayHabitsUseCase,
    private readonly getCurrentHabitsUseCase: GetCurrentHabitsUseCase,
    private readonly getHabitHistoryUseCase: GetHabitHistoryUseCase,
    private readonly getConsistencySummaryUseCase: GetConsistencySummaryUseCase,
    private readonly getHabitRiskSignalsUseCase: GetHabitRiskSignalsUseCase,
    private readonly replayHabitSnapshotUseCase: ReplayHabitSnapshotUseCase,
  ) {}

  @Get('today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getTodayHabits(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayHabitsResponseDto> {
    try {
      const result = await this.getTodayHabitsUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        habitSnapshot: mapHabitSnapshot(result.habitSnapshot),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('current')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentHabits(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetCurrentHabitsResponseDto> {
    try {
      const result = await this.getCurrentHabitsUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        habitSnapshot: mapHabitSnapshot(result.habitSnapshot),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getHabitHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetHabitHistoryQueryDto,
  ): Promise<GetHabitHistoryResponseDto> {
    try {
      const result = await this.getHabitHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        habitSnapshots: result.habitSnapshots.map(mapHabitSnapshot),
        limit: result.limit,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('summary')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getConsistencySummary(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetConsistencySummaryResponseDto> {
    try {
      const result = await this.getConsistencySummaryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        consistencySummary: mapConsistencySummary(result.consistencySummary),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('risk')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getHabitRiskSignals(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetHabitRiskSignalsResponseDto> {
    try {
      const result = await this.getHabitRiskSignalsUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        habitRiskSignals: result.habitRiskSignals.map(mapHabitRiskSignal),
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('debug/:id/replay')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async replayHabitSnapshot(
    @Req() request: RequestWithAuthUser,
    @Param('id') habitSnapshotId: string,
  ): Promise<ReplayHabitSnapshotResponseDto> {
    try {
      const result = await this.replayHabitSnapshotUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        habitSnapshotId,
      });

      return {
        persisted: mapHabitSnapshot(result.persisted),
        recalculated: {
          consistencyScore: result.recalculated.consistencyScore,
          streakDays: result.recalculated.streakDays,
          adherenceScore: result.recalculated.adherenceScore,
          trend: result.recalculated.trend,
          formulaVersion: result.recalculated.formulaVersion,
        },
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
    if (!(error instanceof HabitReadError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case HABIT_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case HABIT_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case HABIT_READ_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case HABIT_READ_ERROR_CODES.INTERNAL_ERROR:
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
      details: error.details,
    };
  }

  private handleReplayError(error: unknown): never {
    if (!(error instanceof ReplayHabitSnapshotError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case REPLAY_HABIT_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case REPLAY_HABIT_SNAPSHOT_ERROR_CODES.HABIT_SNAPSHOT_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }
}

function mapHabitSnapshot(snapshot: HabitSnapshot) {
  return snapshot.toJSON();
}

function mapConsistencySummary(summary: ConsistencySummary) {
  return summary.toJSON();
}

function mapHabitRiskSignal(signal: HabitRiskSignal) {
  return signal.toJSON();
}
