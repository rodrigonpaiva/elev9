import {
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
  CREATE_TRAINING_PLAN_ERROR_CODES,
  CreateTrainingPlanError,
} from "../../application/use-cases/create-training-plan/create-training-plan.errors";
import { CreateTrainingPlanUseCase } from "../../application/use-cases/create-training-plan/create-training-plan.use-case";
import { CreateTrainingPlanRequestDto } from "./dto/create-training-plan.request.dto";
import { CreateTrainingPlanResponseDto } from "./dto/create-training-plan.response.dto";

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller("training")
export class TrainingController {
  constructor(
    private readonly createTrainingPlanUseCase: CreateTrainingPlanUseCase,
  ) {}

  @Post("plans")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Req() request: RequestWithAuthUser,
    @Body() body: CreateTrainingPlanRequestDto,
  ): Promise<CreateTrainingPlanResponseDto> {
    try {
      const result = await this.createTrainingPlanUseCase.execute({
        authUserId: request.authUser?.id ?? "",
        fitnessProfileId: body.fitnessProfileId,
      });

      return {
        trainingPlan: {
          id: result.trainingPlan.id,
          fitnessProfileId: result.trainingPlan.fitnessProfileId,
          goal: result.trainingPlan.goal,
          activityLevel: result.trainingPlan.activityLevel,
          weeklySchedule: result.trainingPlan.weeklySchedule,
          status: result.trainingPlan.status,
          createdAt: result.trainingPlan.createdAt.toISOString(),
        },
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (!(error instanceof CreateTrainingPlanError)) {
      throw new InternalServerErrorException("An unexpected error occurred.");
    }

    switch (error.code) {
      case CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_TRAINING_PLAN_ERROR_CODES.ALREADY_EXISTS:
        throw new ConflictException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_TRAINING_PLAN_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_TRAINING_PLAN_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_TRAINING_PLAN_ERROR_CODES.INTERNAL_ERROR,
          message: "An unexpected error occurred.",
        });
    }
  }
}
