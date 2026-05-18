import {
  BadRequestException,
  Body,
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
  GET_COACH_FEEDBACK_HISTORY_ERROR_CODES,
  GetCoachFeedbackHistoryError,
} from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.errors";
import { GetCoachFeedbackHistoryUseCase } from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case";
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.errors";
import { GenerateCoachFeedbackUseCase } from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case";
import {
  BuildUserHealthContextService,
  UserHealthContextNutritionProfile,
} from "../../application/services/context-builder/build-user-health-context.service";
import { GetCoachFeedbackHistoryQueryDto } from "./dto/get-coach-feedback-history.query.dto";
import { GetCoachFeedbackHistoryResponseDto } from "./dto/get-coach-feedback-history.response.dto";
import { GenerateCoachFeedbackResponseDto } from "./dto/generate-coach-feedback.response.dto";

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller("ai")
export class AiController {
  constructor(
    private readonly generateCoachFeedbackUseCase: GenerateCoachFeedbackUseCase,
    private readonly getCoachFeedbackHistoryUseCase: GetCoachFeedbackHistoryUseCase,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
  ) {}

  @Post("coach-feedback")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async generateCoachFeedback(
    @Req() request: RequestWithAuthUser,
    @Body() body?: Record<string, unknown>,
  ): Promise<GenerateCoachFeedbackResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_INPUT,
        message: "Invalid input.",
      });
    }

    try {
      return await this.generateCoachFeedbackUseCase.execute({
        authUserId: request.authUser?.id ?? "",
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get("coach-feedback")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachFeedbackHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetCoachFeedbackHistoryQueryDto,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachFeedbackHistoryResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_INPUT,
        message: "Invalid coach feedback history input.",
      });
    }

    try {
      return await this.getCoachFeedbackHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? "",
        limit: query.limit,
      });
    } catch (error) {
      this.handleGetHistoryError(error);
    }
  }

  @Get("context")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getAiContext(@Req() request: RequestWithAuthUser): Promise<{
    userId: string;
    userProfileId?: string;
    userName?: string;
    goal?: string;
    activityLevel?: string;
    weeklyFrequency?: number;
    adherenceScore: number;
    currentStreak: number;
    averageWorkoutDuration: number;
    fatigueLevel: "LOW" | "MODERATE" | "HIGH";
    availableEquipment: string[];
    limitations: Array<{
      type: string;
      description?: string;
      severity: "low" | "medium" | "high";
    }>;
    todayWorkout: {
      dayIndex: number;
      title: string;
      focus: string;
      format: string;
      intensity: "low" | "moderate" | "high";
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      }>;
    } | null;
    activeTrainingPlanId?: string;
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
      createdAt: string;
    };
    nutritionProfile?: UserHealthContextNutritionProfile;
    recentWorkoutLogs: Array<{
      id: string;
      trainingPlanId: string;
      workoutDayIndex: number;
      durationMinutes: number;
      completedExercises: Array<{
        name: string;
        setsDone: number;
        repsDone: number;
      }>;
      feedback?: {
        difficulty: "easy" | "medium" | "hard";
        notes?: string;
      };
      date: string;
      createdAt: string;
      updatedAt: string;
    }>;
    generatedAt: string;
  }> {
    const context = await this.buildUserHealthContextService.build({
      authUserId: request.authUser?.id ?? "",
    });

    return {
      userId: context.authUserId,
      userProfileId: context.userProfileId,
      userName: context.userName,
      goal: context.goal,
      activityLevel: context.activityLevel,
      weeklyFrequency: context.weeklyFrequency,
      adherenceScore: context.adherenceScore,
      currentStreak: context.currentStreak,
      averageWorkoutDuration: context.averageWorkoutDuration,
      fatigueLevel: context.fatigueLevel,
      availableEquipment: context.availableEquipment,
      limitations: context.limitations,
      todayWorkout: context.todayWorkout,
      activeTrainingPlanId: context.activeTrainingPlanId,
      latestCheckIn: context.latestCheckIn
        ? {
            energyLevel: context.latestCheckIn.energyLevel,
            sleepQuality: context.latestCheckIn.sleepQuality,
            muscleSoreness: context.latestCheckIn.muscleSoreness,
            motivationLevel: context.latestCheckIn.motivationLevel,
            createdAt: context.latestCheckIn.createdAt.toISOString(),
          }
        : undefined,
      nutritionProfile: context.nutritionProfile,
      recentWorkoutLogs: context.recentWorkoutLogs.map((workoutLog) => ({
        id: workoutLog.id,
        trainingPlanId: workoutLog.trainingPlanId,
        workoutDayIndex: workoutLog.workoutDayIndex,
        durationMinutes: workoutLog.durationMinutes,
        completedExercises: workoutLog.completedExercises,
        feedback: workoutLog.feedback,
        date: workoutLog.date,
        createdAt: workoutLog.createdAt.toISOString(),
        updatedAt: workoutLog.updatedAt.toISOString(),
      })),
      generatedAt: context.generatedAt.toISOString(),
    };
  }

  private handleError(error: unknown): never {
    if (!(error instanceof GenerateCoachFeedbackError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
    }

    switch (error.code) {
      case GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GENERATE_COACH_FEEDBACK_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
          message: "An unexpected error occurred.",
        });
    }
  }

  private handleGetHistoryError(error: unknown): never {
    if (!(error instanceof GetCoachFeedbackHistoryError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
    }

    switch (error.code) {
      case GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: "An unexpected error occurred.",
        });
    }
  }
}
