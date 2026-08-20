import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Param,
  NotFoundException,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { InternalEndpoint } from '../../../../common/decorators/internal-endpoint.decorator';
import {
  GET_CURRENT_COACH_DECISION_ERROR_CODES,
  GetCurrentCoachDecisionError,
} from '../../application/use-cases/get-current-coach-decision/get-current-coach-decision.errors';
import { GetCurrentCoachDecisionUseCase } from '../../application/use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import {
  GET_COACH_DECISION_HISTORY_ERROR_CODES,
  GetCoachDecisionHistoryError,
} from '../../application/use-cases/get-coach-decision-history/get-coach-decision-history.errors';
import { GetCoachDecisionHistoryUseCase } from '../../application/use-cases/get-coach-decision-history/get-coach-decision-history.use-case';
import {
  GET_TODAY_COACH_DECISION_ERROR_CODES,
  GetTodayCoachDecisionError,
} from '../../application/use-cases/get-today-coach-decision/get-today-coach-decision.errors';
import { GetTodayCoachDecisionUseCase } from '../../application/use-cases/get-today-coach-decision/get-today-coach-decision.use-case';
import {
  REPLAY_COACH_DECISION_ERROR_CODES,
  ReplayCoachDecisionError,
} from '../../application/use-cases/replay-coach-decision/replay-coach-decision.errors';
import { CoachDecisionRecalculatedResult } from '../../application/use-cases/replay-coach-decision/replay-coach-decision.output';
import { ReplayCoachDecisionUseCase } from '../../application/use-cases/replay-coach-decision/replay-coach-decision.use-case';
import { GetCoachDecisionHistoryQueryDto } from './dto/get-coach-decision-history.query.dto';
import { GetCoachDecisionHistoryResponseDto } from './dto/get-coach-decision-history.response.dto';
import { GetCurrentCoachDecisionResponseDto } from './dto/get-current-coach-decision.response.dto';
import { GetTodayCoachDecisionResponseDto } from './dto/get-today-coach-decision.response.dto';
import {
  CoachDecisionRecalculatedResultResponse,
  CoachDecisionResponse,
} from './dto/coach-decision-response.type';
import { ReplayCoachDecisionResponseDto } from './dto/replay-coach-decision.response.dto';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('ai/coach-decision')
export class CoachDecisionController {
  constructor(
    private readonly getTodayCoachDecisionUseCase: GetTodayCoachDecisionUseCase,
    private readonly getCurrentCoachDecisionUseCase: GetCurrentCoachDecisionUseCase,
    private readonly getCoachDecisionHistoryUseCase: GetCoachDecisionHistoryUseCase,
    private readonly replayCoachDecisionUseCase: ReplayCoachDecisionUseCase,
  ) {}

  @Get('today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getTodayCoachDecision(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayCoachDecisionResponseDto> {
    try {
      const result = await this.getTodayCoachDecisionUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        coachDecision: mapCoachDecision(result.coachDecision),
      };
    } catch (error) {
      this.handleTodayError(error);
    }
  }

  @Get('current')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentCoachDecision(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetCurrentCoachDecisionResponseDto> {
    try {
      const result = await this.getCurrentCoachDecisionUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        coachDecision: mapCoachDecision(result.coachDecision),
      };
    } catch (error) {
      this.handleCurrentError(error);
    }
  }

  @Get('history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCoachDecisionHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetCoachDecisionHistoryQueryDto,
  ): Promise<GetCoachDecisionHistoryResponseDto> {
    try {
      const result = await this.getCoachDecisionHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        coachDecisions: result.coachDecisions.map(mapCoachDecision),
      };
    } catch (error) {
      this.handleHistoryError(error);
    }
  }

  @Get('debug/:id/replay')
  @InternalEndpoint()
  @HttpCode(HttpStatus.OK)
  async replayCoachDecision(
    @Req() request: RequestWithAuthUser,
    @Param('id') coachDecisionId: string,
  ): Promise<ReplayCoachDecisionResponseDto> {
    try {
      const result = await this.replayCoachDecisionUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        coachDecisionId,
      });

      return {
        persisted: mapCoachDecision(result.persisted),
        recalculated: mapRecalculatedCoachDecision(result.recalculated),
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

  private handleTodayError(error: unknown): never {
    if (!(error instanceof GetTodayCoachDecisionError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_TODAY_COACH_DECISION_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_TODAY_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_TODAY_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleCurrentError(error: unknown): never {
    if (!(error instanceof GetCurrentCoachDecisionError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_CURRENT_COACH_DECISION_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_CURRENT_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_CURRENT_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleHistoryError(error: unknown): never {
    if (!(error instanceof GetCoachDecisionHistoryError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GET_COACH_DECISION_HISTORY_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_DECISION_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_DECISION_HISTORY_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case GET_COACH_DECISION_HISTORY_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: GET_COACH_DECISION_HISTORY_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }

  private handleReplayError(error: unknown): never {
    if (!(error instanceof ReplayCoachDecisionError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case REPLAY_COACH_DECISION_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REPLAY_COACH_DECISION_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REPLAY_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case REPLAY_COACH_DECISION_ERROR_CODES.COACH_DECISION_NOT_FOUND:
        throw new NotFoundException({
          code: error.code,
          message: error.message,
          details: error.details,
        });
      case REPLAY_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException({
          code: REPLAY_COACH_DECISION_ERROR_CODES.INTERNAL_ERROR,
          message: 'An unexpected error occurred.',
        });
    }
  }
}

function mapRecalculatedCoachDecision(
  coachDecision: CoachDecisionRecalculatedResult,
): CoachDecisionRecalculatedResultResponse {
  const influences = coachDecision.influences.map((influence) => ({
    code: influence.code as CoachDecisionRecalculatedResultResponse['influences'][number]['code'],
    label: influence.label,
    impact: influence.impact,
    source: influence.source,
    weight: influence.weight,
    value: influence.value,
  })) as CoachDecisionRecalculatedResultResponse['influences'];

  return {
    priority: coachDecision.priority,
    headline: coachDecision.headline,
    summary: coachDecision.summary,
    actionItems: [...coachDecision.actionItems],
    influences,
    formulaVersion: coachDecision.formulaVersion,
  } as CoachDecisionRecalculatedResultResponse;
}

function mapCoachDecision(coachDecision: {
  id: string;
  userProfileId: string;
  date: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  adaptiveTrainingRecommendationId?: string;
  priority:
    | 'recovery'
    | 'nutrition'
    | 'training'
    | 'consistency'
    | 'motivation';
  headline: string;
  summary: string;
  actionItems: string[];
  influences: Array<{
    code: string;
    label: string;
    impact: 'positive' | 'negative' | 'neutral';
    source:
      | 'recovery'
      | 'nutrition'
      | 'training'
      | 'progress'
      | 'memory'
      | 'notification'
      | 'habit'
      | 'personalization';
    weight?: number;
    value?: number;
  }>;
  sourceContext: Record<string, unknown>;
  formulaVersion: string;
  generatedBy: 'deterministic' | 'llm_assisted';
  llmMetadata?: {
    provider?: string;
    model?: string;
    used: boolean;
    failed?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}): CoachDecisionResponse {
  return {
    id: coachDecision.id,
    userProfileId: coachDecision.userProfileId,
    date: coachDecision.date,
    recoverySnapshotId: coachDecision.recoverySnapshotId,
    nutritionRecommendationId: coachDecision.nutritionRecommendationId,
    adaptiveTrainingRecommendationId:
      coachDecision.adaptiveTrainingRecommendationId,
    priority: coachDecision.priority,
    headline: coachDecision.headline,
    summary: coachDecision.summary,
    actionItems: [...coachDecision.actionItems],
    influences: coachDecision.influences.map((influence) => ({
      code: influence.code as CoachDecisionResponse['influences'][number]['code'],
      label: influence.label,
      impact: influence.impact,
      source: influence.source,
      weight: influence.weight,
      value: influence.value,
    })),
    sourceContext: coachDecision.sourceContext,
    formulaVersion: coachDecision.formulaVersion,
    generatedBy: coachDecision.generatedBy,
    llmMetadata: coachDecision.llmMetadata
      ? {
          provider: coachDecision.llmMetadata.provider,
          model: coachDecision.llmMetadata.model,
          used: coachDecision.llmMetadata.used,
          failed: coachDecision.llmMetadata.failed,
        }
      : undefined,
    createdAt: coachDecision.createdAt.toISOString(),
    updatedAt: coachDecision.updatedAt.toISOString(),
  };
}
