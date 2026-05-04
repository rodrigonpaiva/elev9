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
