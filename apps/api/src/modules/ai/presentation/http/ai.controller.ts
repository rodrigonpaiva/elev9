import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import {
  CREATE_COACH_CHAT_ERROR_CODES,
  CreateCoachChatError,
} from '../../application/use-cases/create-coach-chat/create-coach-chat.errors';
import { CreateCoachChatUseCase } from '../../application/use-cases/create-coach-chat/create-coach-chat.use-case';
import {
  GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES,
  GetCoachFeedbackDebugHistoryError,
} from '../../application/use-cases/get-coach-feedback-debug-history/get-coach-feedback-debug-history.errors';
import { GetCoachFeedbackDebugHistoryUseCase } from '../../application/use-cases/get-coach-feedback-debug-history/get-coach-feedback-debug-history.use-case';
import {
  REPLAY_COACH_FEEDBACK_ERROR_CODES,
  ReplayCoachFeedbackError,
} from '../../application/use-cases/replay-coach-feedback/replay-coach-feedback.errors';
import { ReplayCoachFeedbackUseCase } from '../../application/use-cases/replay-coach-feedback/replay-coach-feedback.use-case';
import {
  GET_COACH_FEEDBACK_HISTORY_ERROR_CODES,
  GetCoachFeedbackHistoryError,
} from '../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.errors';
import { GetCoachFeedbackHistoryUseCase } from '../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case';
import {
  GET_COACH_CHAT_HISTORY_ERROR_CODES,
  GetCoachChatHistoryError,
} from '../../application/use-cases/get-coach-chat-history/get-coach-chat-history.errors';
import { GetCoachChatHistoryUseCase } from '../../application/use-cases/get-coach-chat-history/get-coach-chat-history.use-case';
import {
  GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES,
  GetCoachChatDebugHistoryError,
} from '../../application/use-cases/get-coach-chat-debug-history/get-coach-chat-debug-history.errors';
import { GetCoachChatDebugHistoryUseCase } from '../../application/use-cases/get-coach-chat-debug-history/get-coach-chat-debug-history.use-case';
import {
  GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES,
  GetCoachChatMemoryDebugError,
} from '../../application/use-cases/get-coach-chat-memory-debug/get-coach-chat-memory-debug.errors';
import { GetCoachChatMemoryDebugUseCase } from '../../application/use-cases/get-coach-chat-memory-debug/get-coach-chat-memory-debug.use-case';
import {
  GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES,
  GetCoachChatPromptDebugError,
} from '../../application/use-cases/get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.errors';
import { GetCoachChatPromptDebugUseCase } from '../../application/use-cases/get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.use-case';
import {
  GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES,
  GetCoachChatReplyPathDebugError,
} from '../../application/use-cases/get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.errors';
import { GetCoachChatReplyPathDebugUseCase } from '../../application/use-cases/get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.use-case';
import {
  GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES,
  GetCoachChatDebugIndexError,
} from '../../application/use-cases/get-coach-chat-debug-index/get-coach-chat-debug-index.errors';
import { GetCoachChatDebugIndexUseCase } from '../../application/use-cases/get-coach-chat-debug-index/get-coach-chat-debug-index.use-case';
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from '../../application/use-cases/generate-coach-feedback/generate-coach-feedback.errors';
import { GenerateCoachFeedbackUseCase } from '../../application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case';
import {
  BuildUserHealthContextService,
  UserHealthContextNutritionProfile,
} from '../../application/services/context-builder/build-user-health-context.service';
import { GetCoachFeedbackDebugHistoryQueryDto } from './dto/get-coach-feedback-debug-history.query.dto';
import { GetCoachFeedbackDebugHistoryResponseDto } from './dto/get-coach-feedback-debug-history.response.dto';
import { GetCoachFeedbackHistoryQueryDto } from './dto/get-coach-feedback-history.query.dto';
import { GetCoachFeedbackHistoryResponseDto } from './dto/get-coach-feedback-history.response.dto';
import { CreateCoachChatRequestDto } from './dto/create-coach-chat.request.dto';
import { CreateCoachChatResponseDto } from './dto/create-coach-chat.response.dto';
import { GetCoachChatHistoryQueryDto } from './dto/get-coach-chat-history.query.dto';
import { GetCoachChatHistoryResponseDto } from './dto/get-coach-chat-history.response.dto';
import { GetCoachChatDebugHistoryQueryDto } from './dto/get-coach-chat-debug-history.query.dto';
import { GetCoachChatDebugHistoryResponseDto } from './dto/get-coach-chat-debug-history.response.dto';
import { GetCoachChatMemoryDebugResponseDto } from './dto/get-coach-chat-memory-debug.response.dto';
import { GetCoachChatPromptDebugResponseDto } from './dto/get-coach-chat-prompt-debug.response.dto';
import { GetCoachChatReplyPathDebugResponseDto } from './dto/get-coach-chat-reply-path-debug.response.dto';
import { GetCoachChatDebugIndexResponseDto } from './dto/get-coach-chat-debug-index.response.dto';
import { GenerateCoachFeedbackResponseDto } from './dto/generate-coach-feedback.response.dto';
import { ReplayCoachFeedbackResponseDto } from './dto/replay-coach-feedback.response.dto';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('ai')
export class AiController {
  constructor(
    private readonly generateCoachFeedbackUseCase: GenerateCoachFeedbackUseCase,
    private readonly createCoachChatUseCase: CreateCoachChatUseCase,
    private readonly getCoachChatHistoryUseCase: GetCoachChatHistoryUseCase,
    private readonly getCoachChatDebugHistoryUseCase: GetCoachChatDebugHistoryUseCase,
    private readonly getCoachChatMemoryDebugUseCase: GetCoachChatMemoryDebugUseCase,
    private readonly getCoachChatPromptDebugUseCase: GetCoachChatPromptDebugUseCase,
    private readonly getCoachChatReplyPathDebugUseCase: GetCoachChatReplyPathDebugUseCase,
    private readonly getCoachChatDebugIndexUseCase: GetCoachChatDebugIndexUseCase,
    private readonly getCoachFeedbackDebugHistoryUseCase: GetCoachFeedbackDebugHistoryUseCase,
    private readonly replayCoachFeedbackUseCase: ReplayCoachFeedbackUseCase,
    private readonly getCoachFeedbackHistoryUseCase: GetCoachFeedbackHistoryUseCase,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
  ) {}

  @Post('chat')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async createCoachChat(
    @Req() request: RequestWithAuthUser,
    @Body() body?: CreateCoachChatRequestDto | Record<string, unknown>,
  ): Promise<CreateCoachChatResponseDto> {
    const message = (body as { message?: unknown } | undefined)?.message;
    const normalizedMessage = typeof message === 'string' ? message : '';

    if (
      !body ||
      typeof body !== 'object' ||
      typeof message !== 'string' ||
      Object.keys(body).some((key) => key !== 'message')
    ) {
      throw new BadRequestException({
        code: CREATE_COACH_CHAT_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid chat message input.',
      });
    }

    try {
      return await this.createCoachChatUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        message: normalizedMessage,
      });
    } catch (error) {
      this.handleChatError(error);
    }
  }

  @Get('chat/history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachChatHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetCoachChatHistoryQueryDto,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachChatHistoryResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_CHAT_HISTORY_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid chat history input.',
      });
    }

    try {
      return await this.getCoachChatHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });
    } catch (error) {
      this.handleChatHistoryError(error);
    }
  }

  @Get('chat/debug/history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachChatDebugHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetCoachChatDebugHistoryQueryDto,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachChatDebugHistoryResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid chat debug history input.',
      });
    }

    try {
      return await this.getCoachChatDebugHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });
    } catch (error) {
      this.handleChatDebugHistoryError(error);
    }
  }

  @Get('chat/debug/memory')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachChatMemoryDebug(
    @Req() request: RequestWithAuthUser,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachChatMemoryDebugResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid chat memory debug input.',
      });
    }

    try {
      return await this.getCoachChatMemoryDebugUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });
    } catch (error) {
      this.handleChatMemoryDebugError(error);
    }
  }

  @Get('chat/debug/prompt')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachChatPromptDebug(
    @Req() request: RequestWithAuthUser,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachChatPromptDebugResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid chat prompt debug input.',
      });
    }

    try {
      return await this.getCoachChatPromptDebugUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });
    } catch (error) {
      this.handleChatPromptDebugError(error);
    }
  }

  @Get('chat/debug/reply-path')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachChatReplyPathDebug(
    @Req() request: RequestWithAuthUser,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachChatReplyPathDebugResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid chat reply path debug input.',
      });
    }

    try {
      return await this.getCoachChatReplyPathDebugUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });
    } catch (error) {
      this.handleChatReplyPathDebugError(error);
    }
  }

  @Get('chat/debug')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachChatDebugIndex(
    @Req() request: RequestWithAuthUser,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachChatDebugIndexResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid chat debug input.',
      });
    }

    try {
      return await this.getCoachChatDebugIndexUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });
    } catch (error) {
      this.handleChatDebugIndexError(error);
    }
  }

  @Post('coach-feedback')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async generateCoachFeedback(
    @Req() request: RequestWithAuthUser,
    @Body() body?: Record<string, unknown>,
  ): Promise<GenerateCoachFeedbackResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid input.',
      });
    }

    try {
      return await this.generateCoachFeedbackUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get('coach-feedback')
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
        message: 'Invalid coach feedback history input.',
      });
    }

    try {
      return await this.getCoachFeedbackHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });
    } catch (error) {
      this.handleGetHistoryError(error);
    }
  }

  @Get('debug/coach-feedback')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachFeedbackDebugHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetCoachFeedbackDebugHistoryQueryDto,
    @Body() body?: Record<string, unknown>,
  ): Promise<GetCoachFeedbackDebugHistoryResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid coach feedback debug history input.',
      });
    }

    try {
      return await this.getCoachFeedbackDebugHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });
    } catch (error) {
      this.handleGetDebugHistoryError(error);
    }
  }

  @Get('debug/coach-feedback/:id/replay')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async replayCoachFeedback(
    @Req() request: RequestWithAuthUser,
    @Param('id') feedbackId: string,
    @Body() body?: Record<string, unknown>,
  ): Promise<ReplayCoachFeedbackResponseDto> {
    if (body && Object.keys(body).length > 0) {
      throw new BadRequestException({
        code: REPLAY_COACH_FEEDBACK_ERROR_CODES.INVALID_INPUT,
        message: 'Invalid coach feedback replay input.',
      });
    }

    try {
      return await this.replayCoachFeedbackUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        feedbackId,
      });
    } catch (error) {
      this.handleReplayError(error);
    }
  }

  @Get('context')
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
    fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH';
    availableEquipment: string[];
    limitations: Array<{
      type: string;
      description?: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    todayWorkout: {
      dayIndex: number;
      title: string;
      focus: string;
      format: string;
      intensity: 'low' | 'moderate' | 'high';
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
        difficulty: 'easy' | 'medium' | 'hard';
        notes?: string;
      };
      date: string;
      createdAt: string;
      updatedAt: string;
    }>;
    generatedAt: string;
  }> {
    const context = await this.buildUserHealthContextService.build({
      authUserId: request.authUser?.id ?? '',
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
      throw new InternalServerErrorException('An unexpected error occurred.');
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
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetHistoryError(error: unknown): never {
    if (!(error instanceof GetCoachFeedbackHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
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
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleChatError(error: unknown): never {
    if (!(error instanceof CreateCoachChatError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case CREATE_COACH_CHAT_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_COACH_CHAT_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_COACH_CHAT_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case CREATE_COACH_CHAT_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: CREATE_COACH_CHAT_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleChatHistoryError(error: unknown): never {
    if (!(error instanceof GetCoachChatHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_CHAT_HISTORY_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_CHAT_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleChatDebugHistoryError(error: unknown): never {
    if (!(error instanceof GetCoachChatDebugHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleChatMemoryDebugError(error: unknown): never {
    if (!(error instanceof GetCoachChatMemoryDebugError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleChatPromptDebugError(error: unknown): never {
    if (!(error instanceof GetCoachChatPromptDebugError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleChatReplyPathDebugError(error: unknown): never {
    if (!(error instanceof GetCoachChatReplyPathDebugError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleChatDebugIndexError(error: unknown): never {
    if (error instanceof GetCoachChatDebugHistoryError) {
      return this.handleChatDebugHistoryError(error);
    }

    if (error instanceof GetCoachChatPromptDebugError) {
      return this.handleChatPromptDebugError(error);
    }

    if (error instanceof GetCoachChatReplyPathDebugError) {
      return this.handleChatReplyPathDebugError(error);
    }

    if (!(error instanceof GetCoachChatDebugIndexError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleGetDebugHistoryError(error: unknown): never {
    if (!(error instanceof GetCoachFeedbackDebugHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleReplayError(error: unknown): never {
    if (!(error instanceof ReplayCoachFeedbackError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case REPLAY_COACH_FEEDBACK_ERROR_CODES.INVALID_INPUT:
      case REPLAY_COACH_FEEDBACK_ERROR_CODES.CONTEXT_MISSING:
      case REPLAY_COACH_FEEDBACK_ERROR_CODES.GENERATOR_VERSION_UNSUPPORTED:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REPLAY_COACH_FEEDBACK_ERROR_CODES.COACH_FEEDBACK_NOT_FOUND:
      case REPLAY_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REPLAY_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REPLAY_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: REPLAY_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}
