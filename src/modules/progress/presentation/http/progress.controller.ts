import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { AuthSessionGuard } from "../../../users/presentation/http/guards/auth-session.guard";
import {
  LOG_WORKOUT_ERROR_CODES,
  LogWorkoutError,
} from "../../application/use-cases/log-workout/log-workout.errors";
import { LogWorkoutUseCase } from "../../application/use-cases/log-workout/log-workout.use-case";
import { LogWorkoutRequestDto } from "./dto/log-workout.request.dto";
import { LogWorkoutResponseDto } from "./dto/log-workout.response.dto";

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller("progress")
export class ProgressController {
  constructor(private readonly logWorkoutUseCase: LogWorkoutUseCase) {}

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
}
