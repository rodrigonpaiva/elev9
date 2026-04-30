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
} from "@nestjs/common";

import { AuthSessionGuard } from "../../../users/presentation/http/guards/auth-session.guard";
import {
  GET_PROGRESS_SUMMARY_ERROR_CODES,
  GetProgressSummaryError,
} from "../../application/use-cases/get-progress-summary/get-progress-summary.errors";
import { GetProgressSummaryUseCase } from "../../application/use-cases/get-progress-summary/get-progress-summary.use-case";
import {
  LOG_WORKOUT_ERROR_CODES,
  LogWorkoutError,
} from "../../application/use-cases/log-workout/log-workout.errors";
import { LogWorkoutUseCase } from "../../application/use-cases/log-workout/log-workout.use-case";
import { GetProgressSummaryQueryDto } from "./dto/get-progress-summary.query.dto";
import { GetProgressSummaryResponseDto } from "./dto/get-progress-summary.response.dto";
import { LogWorkoutRequestDto } from "./dto/log-workout.request.dto";
import { LogWorkoutResponseDto } from "./dto/log-workout.response.dto";

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

class GetProgressSummaryBodyDto {}

@Controller("progress")
export class ProgressController {
  constructor(
    private readonly logWorkoutUseCase: LogWorkoutUseCase,
    private readonly getProgressSummaryUseCase: GetProgressSummaryUseCase,
  ) {}

  @Post("workout-logs")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async logWorkout(
    @Req() request: RequestWithAuthUser,
    @Body() body: LogWorkoutRequestDto,
  ): Promise<LogWorkoutResponseDto> {
    try {
      const result = await this.logWorkoutUseCase.execute({
        authUserId: request.authUser?.id ?? "",
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

  @Get("summary")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getSummary(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetProgressSummaryQueryDto,
    @Body() _body: GetProgressSummaryBodyDto,
  ): Promise<GetProgressSummaryResponseDto> {
    try {
      const result = await this.getProgressSummaryUseCase.execute({
        authUserId: request.authUser?.id ?? "",
        period: query.period,
      });

      return {
        summary: {
          period: result.summary.period,
          workoutsCompleted: result.summary.workoutsCompleted,
          totalDurationMinutes: result.summary.totalDurationMinutes,
          averageDurationMinutes: result.summary.averageDurationMinutes,
          lastWorkoutDate: result.summary.lastWorkoutDate,
        },
      };
    } catch (error) {
      this.handleGetProgressSummaryError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof LogWorkoutError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
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
          message: "An unexpected error occurred.",
        });
    }
  }

  private handleGetProgressSummaryError(error: unknown): never {
    if (!(error instanceof GetProgressSummaryError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
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
          message: "An unexpected error occurred.",
        });
    }
  }
}
