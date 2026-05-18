import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import {
  CREATE_DAILY_CHECK_IN_ERROR_CODES,
  CreateDailyCheckInError,
} from '../../application/use-cases/create-daily-check-in/create-daily-check-in.errors';
import { CreateDailyCheckInUseCase } from '../../application/use-cases/create-daily-check-in/create-daily-check-in.use-case';
import {
  GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES,
  GetDailyCheckInHistoryError,
} from '../../application/use-cases/get-daily-check-in-history/get-daily-check-in-history.errors';
import { GetDailyCheckInHistoryUseCase } from '../../application/use-cases/get-daily-check-in-history/get-daily-check-in-history.use-case';
import {
  GET_WORKOUT_HISTORY_ERROR_CODES,
  GetWorkoutHistoryError,
} from '../../application/use-cases/get-workout-history/get-workout-history.errors';
import { GetWorkoutHistoryUseCase } from '../../application/use-cases/get-workout-history/get-workout-history.use-case';
import {
  GET_PROGRESS_SUMMARY_ERROR_CODES,
  GetProgressSummaryError,
} from '../../application/use-cases/get-progress-summary/get-progress-summary.errors';
import { GetProgressSummaryUseCase } from '../../application/use-cases/get-progress-summary/get-progress-summary.use-case';
import {
  LOG_WORKOUT_ERROR_CODES,
  LogWorkoutError,
} from '../../application/use-cases/log-workout/log-workout.errors';
import { LogWorkoutUseCase } from '../../application/use-cases/log-workout/log-workout.use-case';
import { CreateDailyCheckInRequestDto } from './dto/create-daily-check-in.request.dto';
import { CreateDailyCheckInResponseDto } from './dto/create-daily-check-in.response.dto';
import { GetDailyCheckInHistoryQueryDto } from './dto/get-daily-check-in-history.query.dto';
import { GetDailyCheckInHistoryResponseDto } from './dto/get-daily-check-in-history.response.dto';
import { GetProgressSummaryQueryDto } from './dto/get-progress-summary.query.dto';
import { GetProgressSummaryResponseDto } from './dto/get-progress-summary.response.dto';
import { GetWorkoutHistoryQueryDto } from './dto/get-workout-history.query.dto';
import { GetWorkoutHistoryResponseDto } from './dto/get-workout-history.response.dto';
import { LogWorkoutRequestDto } from './dto/log-workout.request.dto';
import { LogWorkoutResponseDto } from './dto/log-workout.response.dto';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

class GetProgressSummaryBodyDto {}
class GetDailyCheckInHistoryBodyDto {}
class GetWorkoutHistoryBodyDto {}

@Controller('progress')
export class ProgressController {
  constructor(
    private readonly createDailyCheckInUseCase: CreateDailyCheckInUseCase,
    private readonly logWorkoutUseCase: LogWorkoutUseCase,
    private readonly getProgressSummaryUseCase: GetProgressSummaryUseCase,
    private readonly getDailyCheckInHistoryUseCase: GetDailyCheckInHistoryUseCase,
    private readonly getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase,
  ) {}

  @Post('daily-check-in')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDailyCheckIn(
    @Req() request: RequestWithAuthUser,
    @Body() body: CreateDailyCheckInRequestDto,
  ): Promise<CreateDailyCheckInResponseDto> {
    try {
      const result = await this.createDailyCheckInUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        energyLevel: body.energyLevel,
        sleepQuality: body.sleepQuality,
        muscleSoreness: body.muscleSoreness,
        motivationLevel: body.motivationLevel,
      });

      return {
        dailyCheckIn: {
          id: result.dailyCheckIn.id,
          energyLevel: result.dailyCheckIn.energyLevel,
          sleepQuality: result.dailyCheckIn.sleepQuality,
          muscleSoreness: result.dailyCheckIn.muscleSoreness,
          motivationLevel: result.dailyCheckIn.motivationLevel,
          createdAt: result.dailyCheckIn.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleCreateDailyCheckInError(error);
    }
  }

  @Post('workout-logs')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async logWorkout(
    @Req() request: RequestWithAuthUser,
    @Body() body: LogWorkoutRequestDto,
  ): Promise<LogWorkoutResponseDto> {
    try {
      const result = await this.logWorkoutUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        trainingPlanId: body.trainingPlanId,
        workoutDayIndex: body.workoutDayIndex,
        durationMinutes: body.durationMinutes,
        completedExercises: body.completedExercises,
        feedback: body.feedback,
      });

      return {
        workoutLog: {
          id: result.workoutLog.id,
          trainingPlanId: result.workoutLog.trainingPlanId,
          workoutDayIndex: result.workoutLog.workoutDayIndex,
          durationMinutes: result.workoutLog.durationMinutes,
          completedExercises: result.workoutLog.completedExercises,
          feedback: result.workoutLog.feedback,
          date: result.workoutLog.date,
          createdAt: result.workoutLog.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('summary')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getSummary(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetProgressSummaryQueryDto,
    @Body() _body: GetProgressSummaryBodyDto,
  ): Promise<GetProgressSummaryResponseDto> {
    try {
      const result = await this.getProgressSummaryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        period: query.period,
      });

      return {
        summary: {
          period: result.summary.period,
          workoutsCompleted: result.summary.workoutsCompleted,
          totalDurationMinutes: result.summary.totalDurationMinutes,
          averageDurationMinutes: result.summary.averageDurationMinutes,
          lastWorkoutDate: result.summary.lastWorkoutDate,
          currentStreak: result.summary.currentStreak,
        },
      };
    } catch (error) {
      this.handleGetProgressSummaryError(error);
    }
  }

  @Get('workout-logs')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getWorkoutHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetWorkoutHistoryQueryDto,
    @Body() _body: GetWorkoutHistoryBodyDto,
  ): Promise<GetWorkoutHistoryResponseDto> {
    try {
      const result = await this.getWorkoutHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        workoutLogs: result.workoutLogs,
      };
    } catch (error) {
      this.handleGetWorkoutHistoryError(error);
    }
  }

  @Get('daily-check-ins')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getDailyCheckInHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetDailyCheckInHistoryQueryDto,
    @Body() _body: GetDailyCheckInHistoryBodyDto,
  ): Promise<GetDailyCheckInHistoryResponseDto> {
    try {
      const result = await this.getDailyCheckInHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        dailyCheckIns: result.dailyCheckIns,
      };
    } catch (error) {
      this.handleGetDailyCheckInHistoryError(error);
    }
  }

  private handleCreateDailyCheckInError(error: unknown): never {
    if (!(error instanceof CreateDailyCheckInError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof LogWorkoutError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case LOG_WORKOUT_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_WORKOUT_ERROR_CODES.ALREADY_EXISTS:
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_WORKOUT_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case LOG_WORKOUT_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case LOG_WORKOUT_ERROR_CODES.TRAINING_PLAN_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_WORKOUT_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case LOG_WORKOUT_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: LOG_WORKOUT_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetProgressSummaryError(error: unknown): never {
    if (!(error instanceof GetProgressSummaryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_PROGRESS_SUMMARY_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_PROGRESS_SUMMARY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GET_PROGRESS_SUMMARY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_PROGRESS_SUMMARY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_PROGRESS_SUMMARY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_PROGRESS_SUMMARY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetWorkoutHistoryError(error: unknown): never {
    if (!(error instanceof GetWorkoutHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_WORKOUT_HISTORY_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_WORKOUT_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GET_WORKOUT_HISTORY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_WORKOUT_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_WORKOUT_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_WORKOUT_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetDailyCheckInHistoryError(error: unknown): never {
    if (!(error instanceof GetDailyCheckInHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}
