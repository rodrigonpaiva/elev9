import {
  BadRequestException,
  Body,
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
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.errors";
import { GenerateCoachFeedbackUseCase } from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case";
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
}
