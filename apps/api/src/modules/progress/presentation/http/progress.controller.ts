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
  Param,
  Post,
  Optional,
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
  GET_TODAY_DAILY_CHECK_IN_ERROR_CODES,
  GetTodayDailyCheckInError,
} from '../../application/use-cases/get-today-daily-check-in/get-today-daily-check-in.errors';
import { GetTodayDailyCheckInUseCase } from '../../application/use-cases/get-today-daily-check-in/get-today-daily-check-in.use-case';
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
import {
  START_WORKOUT_ERROR_CODES,
  StartWorkoutError,
} from '../../application/use-cases/start-workout/start-workout.errors';
import { StartWorkoutUseCase } from '../../application/use-cases/start-workout/start-workout.use-case';
import {
  COMPLETE_WORKOUT_ERROR_CODES,
  CompleteWorkoutError,
} from '../../application/use-cases/complete-workout/complete-workout.errors';
import { CompleteWorkoutUseCase } from '../../application/use-cases/complete-workout/complete-workout.use-case';
import { CreateDailyCheckInRequestDto } from './dto/create-daily-check-in.request.dto';
import { CreateDailyCheckInResponseDto } from './dto/create-daily-check-in.response.dto';
import { GetDailyCheckInHistoryQueryDto } from './dto/get-daily-check-in-history.query.dto';
import { GetDailyCheckInHistoryResponseDto } from './dto/get-daily-check-in-history.response.dto';
import { GetTodayDailyCheckInResponseDto } from './dto/get-today-daily-check-in.response.dto';
import { GetProgressSummaryQueryDto } from './dto/get-progress-summary.query.dto';
import { GetProgressSummaryResponseDto } from './dto/get-progress-summary.response.dto';
import { GetWorkoutHistoryQueryDto } from './dto/get-workout-history.query.dto';
import { GetWorkoutHistoryResponseDto } from './dto/get-workout-history.response.dto';
import { LogWorkoutRequestDto } from './dto/log-workout.request.dto';
import { LogWorkoutResponseDto } from './dto/log-workout.response.dto';
import { StartWorkoutRequestDto } from './dto/start-workout.request.dto';
import { StartWorkoutResponseDto } from './dto/start-workout.response.dto';
import { CompleteWorkoutParamsDto } from './dto/complete-workout.params.dto';
import { ReplaceWorkoutExerciseRequestDto } from './dto/replace-workout-exercise.request.dto';
import { ReplaceWorkoutExerciseUseCase } from '../../application/use-cases/replace-workout-exercise/replace-workout-exercise.use-case';
import {
  ReplaceWorkoutExerciseError,
  REPLACE_WORKOUT_EXERCISE_ERROR_CODES,
} from '../../application/use-cases/replace-workout-exercise/replace-workout-exercise.errors';

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
    @Optional()
    private readonly getTodayDailyCheckInUseCase?: GetTodayDailyCheckInUseCase,
    @Optional()
    private readonly startWorkoutUseCase?: StartWorkoutUseCase,
    @Optional()
    private readonly completeWorkoutUseCase?: CompleteWorkoutUseCase,
    @Optional()
    private readonly replaceWorkoutExerciseUseCase?: ReplaceWorkoutExerciseUseCase,
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
          localDate:
            result.dailyCheckIn.localDate ??
            result.dailyCheckIn.createdAt.toISOString().slice(0, 10),
          timezone: result.dailyCheckIn.timezone ?? 'UTC',
          createdAt: result.dailyCheckIn.createdAt.toISOString(),
          updatedAt: (
            result.dailyCheckIn.updatedAt ?? result.dailyCheckIn.createdAt
          ).toISOString(),
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
        recoveryPending: result.recoveryPending,
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

  @Post('workout-sessions/start')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async startWorkout(
    @Req() request: RequestWithAuthUser,
    @Body() body: StartWorkoutRequestDto,
  ): Promise<StartWorkoutResponseDto> {
    if (!this.startWorkoutUseCase) {
      throw new InternalServerErrorException('Workout start is unavailable.');
    }

    try {
      const result = await this.startWorkoutUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        trainingPlanId: body.trainingPlanId,
        workoutDayIndex: body.workoutDayIndex,
      });

      return {
        workoutSession: {
          id: result.workoutSession.id,
          userProfileId: result.workoutSession.userProfileId,
          trainingPlanId: result.workoutSession.trainingPlanId,
          workoutDayIndex: result.workoutSession.workoutDayIndex,
          date: result.workoutSession.date,
          status: result.workoutSession.status,
          startedAt: result.workoutSession.startedAt.toISOString(),
          updatedAt: result.workoutSession.updatedAt.toISOString(),
          ...(result.workoutSession.completedAt
            ? { completedAt: result.workoutSession.completedAt.toISOString() }
            : {}),
          replacements: result.workoutSession.replacements.map((item) => ({
            ...item,
            replacedAt: item.replacedAt.toISOString(),
          })),
        },
      };
    } catch (error) {
      this.handleStartWorkoutError(error);
    }
  }

  @Post('workout-sessions/:sessionId/complete')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async completeWorkout(
    @Req() request: RequestWithAuthUser,
    @Param() params: CompleteWorkoutParamsDto,
  ): Promise<StartWorkoutResponseDto> {
    if (!this.completeWorkoutUseCase) {
      throw new InternalServerErrorException(
        'Workout completion is unavailable.',
      );
    }

    try {
      const result = await this.completeWorkoutUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        sessionId: params.sessionId,
      });
      return this.toWorkoutSessionResponse(result.workoutSession);
    } catch (error) {
      this.handleCompleteWorkoutError(error);
    }
  }

  @Post('workout-sessions/:sessionId/replacements')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async replaceWorkoutExercise(
    @Req() request: RequestWithAuthUser,
    @Param() params: CompleteWorkoutParamsDto,
    @Body() body: ReplaceWorkoutExerciseRequestDto,
  ): Promise<StartWorkoutResponseDto> {
    if (!this.replaceWorkoutExerciseUseCase) {
      throw new InternalServerErrorException(
        'Workout replacement is unavailable.',
      );
    }
    try {
      const result = await this.replaceWorkoutExerciseUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        sessionId: params.sessionId,
        exerciseIndex: body.exerciseIndex,
        currentExerciseName: body.currentExerciseName,
        replacementExercise: body.replacementExercise,
        reason: body.reason,
        idempotencyKey: body.idempotencyKey,
      });
      return this.toWorkoutSessionResponse(result.workoutSession);
    } catch (error) {
      this.handleReplaceWorkoutExerciseError(error);
    }
  }

  @Get('workout-sessions/:sessionId')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getWorkoutSession(
    @Req() request: RequestWithAuthUser,
    @Param() params: CompleteWorkoutParamsDto,
  ): Promise<StartWorkoutResponseDto> {
    if (!this.completeWorkoutUseCase) {
      throw new InternalServerErrorException(
        'Workout session lookup is unavailable.',
      );
    }

    try {
      const result = await this.completeWorkoutUseCase.get({
        authUserId: request.authUser?.id ?? '',
        sessionId: params.sessionId,
      });
      return this.toWorkoutSessionResponse(result.workoutSession);
    } catch (error) {
      this.handleCompleteWorkoutError(error);
    }
  }

  private toWorkoutSessionResponse(session: {
    id: string;
    userProfileId: string;
    trainingPlanId: string;
    workoutDayIndex: number;
    date: string;
    status: 'active' | 'completed';
    startedAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    replacements: Array<{
      exerciseIndex: number;
      originalExercise: {
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      };
      replacementExercise: {
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      };
      reason: string;
      idempotencyKey: string;
      replacedAt: Date;
    }>;
  }): StartWorkoutResponseDto {
    return {
      workoutSession: {
        id: session.id,
        userProfileId: session.userProfileId,
        trainingPlanId: session.trainingPlanId,
        workoutDayIndex: session.workoutDayIndex,
        date: session.date,
        status: session.status,
        startedAt: session.startedAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        ...(session.completedAt
          ? { completedAt: session.completedAt.toISOString() }
          : {}),
        replacements: session.replacements.map((item) => ({
          ...item,
          replacedAt: item.replacedAt.toISOString(),
        })),
      },
    };
  }

  private handleReplaceWorkoutExerciseError(error: unknown): never {
    if (!(error instanceof ReplaceWorkoutExerciseError)) throw error;
    const status =
      error.code === REPLACE_WORKOUT_EXERCISE_ERROR_CODES.SESSION_NOT_FOUND
        ? HttpStatus.NOT_FOUND
        : error.code ===
              REPLACE_WORKOUT_EXERCISE_ERROR_CODES.SESSION_COMPLETED ||
            error.code === REPLACE_WORKOUT_EXERCISE_ERROR_CODES.CONFLICT
          ? HttpStatus.CONFLICT
          : error.code === REPLACE_WORKOUT_EXERCISE_ERROR_CODES.INVALID_SESSION
            ? HttpStatus.UNAUTHORIZED
            : HttpStatus.BAD_REQUEST;
    const exception = new BadRequestException(error.message);
    exception.message = error.message;
    if (status === HttpStatus.NOT_FOUND)
      throw new NotFoundException(error.message);
    if (status === HttpStatus.CONFLICT)
      throw new ConflictException(error.message);
    if (status === HttpStatus.UNAUTHORIZED)
      throw new UnauthorizedException(error.message);
    throw exception;
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

  @Get('daily-check-in/today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getTodayDailyCheckIn(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayDailyCheckInResponseDto> {
    if (!this.getTodayDailyCheckInUseCase) {
      throw new InternalServerErrorException(
        'Daily check-in today is unavailable.',
      );
    }

    try {
      const result = await this.getTodayDailyCheckInUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        completedToday: result.completedToday,
        dailyCheckIn: result.dailyCheckIn
          ? {
              id: result.dailyCheckIn.id,
              energyLevel: result.dailyCheckIn.energyLevel,
              sleepQuality: result.dailyCheckIn.sleepQuality,
              muscleSoreness: result.dailyCheckIn.muscleSoreness,
              motivationLevel: result.dailyCheckIn.motivationLevel,
              localDate: result.dailyCheckIn.localDate,
              timezone: result.dailyCheckIn.timezone,
              createdAt: result.dailyCheckIn.createdAt.toISOString(),
              updatedAt: result.dailyCheckIn.updatedAt.toISOString(),
            }
          : null,
      };
    } catch (error) {
      this.handleGetTodayDailyCheckInError(error);
    }
  }

  private handleCreateDailyCheckInError(error: unknown): never {
    if (!(error instanceof CreateDailyCheckInError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_INPUT:
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.INVALID_TIMEZONE:
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
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.RECOVERY_RECALCULATION_FAILED:
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      case CREATE_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetTodayDailyCheckInError(error: unknown): never {
    if (!(error instanceof GetTodayDailyCheckInError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_TODAY_DAILY_CHECK_IN_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
        });
      case GET_TODAY_DAILY_CHECK_IN_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
        });
      case GET_TODAY_DAILY_CHECK_IN_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: error.code,
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
      case LOG_WORKOUT_ERROR_CODES.RECOVERY_RECALCULATION_FAILED:
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

  private handleStartWorkoutError(error: unknown): never {
    if (!(error instanceof StartWorkoutError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case START_WORKOUT_ERROR_CODES.INVALID_INPUT:
      case START_WORKOUT_ERROR_CODES.WORKOUT_NOT_AVAILABLE:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
        });
      case START_WORKOUT_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case START_WORKOUT_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case START_WORKOUT_ERROR_CODES.TRAINING_PLAN_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
        });
      case START_WORKOUT_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
        });
      case START_WORKOUT_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: error.code,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleCompleteWorkoutError(error: unknown): never {
    if (!(error instanceof CompleteWorkoutError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case COMPLETE_WORKOUT_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
        });
      case COMPLETE_WORKOUT_ERROR_CODES.SESSION_NOT_FOUND:
      case COMPLETE_WORKOUT_ERROR_CODES.SESSION_EXPIRED:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
        });
      case COMPLETE_WORKOUT_ERROR_CODES.WORKOUT_LOG_REQUIRED:
        throw new ConflictException({
          code: error.code,
          message: error.message,
        });
      case COMPLETE_WORKOUT_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
        });
      case COMPLETE_WORKOUT_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: error.code,
          message: error.message,
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
