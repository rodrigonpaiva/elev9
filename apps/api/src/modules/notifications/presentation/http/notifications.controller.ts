import {
  BadRequestException,
  Body,
  Controller,
  Param,
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
import { InternalEndpoint } from '../../../../common/decorators/internal-endpoint.decorator';
import { GetCurrentNotificationUseCase } from '../../application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetNotificationHistoryUseCase } from '../../application/use-cases/get-notification-history/get-notification-history.use-case';
import { GetTodayNotificationUseCase } from '../../application/use-cases/get-today-notification/get-today-notification.use-case';
import { ReplayNotificationDecisionUseCase } from '../../application/use-cases/replay-notification-decision/replay-notification-decision.use-case';
import { RecordEngagementEventUseCase } from '../../application/use-cases/record-engagement-event/record-engagement-event.use-case';
import {
  REPLAY_NOTIFICATION_DECISION_ERROR_CODES,
  ReplayNotificationDecisionError,
} from '../../application/use-cases/replay-notification-decision/replay-notification-decision.errors';
import {
  NotificationReadError,
  NOTIFICATION_READ_ERROR_CODES,
} from '../../application/services/notification-read.errors';
import {
  RECORD_ENGAGEMENT_EVENT_ERROR_CODES,
  RecordEngagementEventError,
} from '../../application/use-cases/record-engagement-event/record-engagement-event.errors';
import type { NotificationDecisionJSON } from '../../domain/entities/notification-decision.entity';
import { GetCurrentNotificationResponseDto } from './dto/get-current-notification.response.dto';
import { GetEngagementSummaryResponseDto } from './dto/get-engagement-summary.response.dto';
import { GetNotificationHistoryQueryDto } from './dto/get-notification-history.query.dto';
import { GetNotificationHistoryResponseDto } from './dto/get-notification-history.response.dto';
import { GetTodayNotificationResponseDto } from './dto/get-today-notification.response.dto';
import { ReplayNotificationDecisionResponseDto } from './dto/replay-notification-decision.response.dto';
import { RecordEngagementEventRequestDto } from './dto/record-engagement-event.request.dto';
import { RecordEngagementEventResponseDto } from './dto/record-engagement-event.response.dto';
import { NotificationEngagementSummaryResponse } from './dto/notification-response.type';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly getTodayNotificationUseCase: GetTodayNotificationUseCase,
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getNotificationHistoryUseCase: GetNotificationHistoryUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly replayNotificationDecisionUseCase: ReplayNotificationDecisionUseCase,
    private readonly recordEngagementEventUseCase: RecordEngagementEventUseCase,
  ) {}

  @Get('today')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getTodayNotification(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetTodayNotificationResponseDto> {
    try {
      const result = await this.getTodayNotificationUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        notificationDecision: mapNotificationDecision(
          result.notificationDecision,
        ),
      };
    } catch (error) {
      this.handleReadError(error);
    }
  }

  @Get('current')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentNotification(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetCurrentNotificationResponseDto> {
    try {
      const result = await this.getCurrentNotificationUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        notificationDecision: mapNotificationDecision(
          result.notificationDecision,
        ),
      };
    } catch (error) {
      this.handleReadError(error);
    }
  }

  @Get('history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getNotificationHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetNotificationHistoryQueryDto,
  ): Promise<GetNotificationHistoryResponseDto> {
    try {
      const result = await this.getNotificationHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        notificationDecisions: result.notificationDecisions.map(
          mapNotificationDecision,
        ),
        limit: result.limit,
      };
    } catch (error) {
      this.handleReadError(error);
    }
  }

  @Get('engagement-summary')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getEngagementSummary(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetEngagementSummaryResponseDto> {
    try {
      const result = await this.getEngagementSummaryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        engagementSummary: mapEngagementSummary(result.engagementSummary),
      };
    } catch (error) {
      this.handleReadError(error);
    }
  }

  @Post(':id/events')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async recordEngagementEvent(
    @Req() request: RequestWithAuthUser,
    @Param('id') notificationId: string,
    @Body() body: RecordEngagementEventRequestDto,
  ): Promise<RecordEngagementEventResponseDto> {
    try {
      const result = await this.recordEngagementEventUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        notificationId,
        type: body.type,
        metadata: body.metadata,
      });

      return {
        engagementEvent: mapEngagementEvent(result.engagementEvent),
        notificationDecision: mapNotificationDecision(
          result.notificationDecision,
        ),
        historyEntry: result.historyEntry
          ? mapNotificationHistoryEntry(result.historyEntry)
          : undefined,
      };
    } catch (error) {
      this.handleRecordEngagementEventError(error);
    }
  }

  @Get('debug/:id/replay')
  @InternalEndpoint()
  @HttpCode(HttpStatus.OK)
  async replayNotificationDecision(
    @Req() request: RequestWithAuthUser,
    @Param('id') notificationId: string,
  ): Promise<ReplayNotificationDecisionResponseDto> {
    try {
      const result = await this.replayNotificationDecisionUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        notificationId,
      });

      return {
        persisted: mapNotificationDecision(result.persisted),
        recalculated: mapReplayRecalculated(result.recalculated),
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

  private handleReadError(error: unknown): never {
    if (!(error instanceof NotificationReadError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case NOTIFICATION_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case NOTIFICATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case NOTIFICATION_READ_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case NOTIFICATION_READ_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleRecordEngagementEventError(error: unknown): never {
    if (!(error instanceof RecordEngagementEventError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case RECORD_ENGAGEMENT_EVENT_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case RECORD_ENGAGEMENT_EVENT_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case RECORD_ENGAGEMENT_EVENT_ERROR_CODES.NOTIFICATION_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case RECORD_ENGAGEMENT_EVENT_ERROR_CODES.INVALID_INPUT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case RECORD_ENGAGEMENT_EVENT_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleReplayError(error: unknown): never {
    if (!(error instanceof ReplayNotificationDecisionError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case REPLAY_NOTIFICATION_DECISION_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case REPLAY_NOTIFICATION_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case REPLAY_NOTIFICATION_DECISION_ERROR_CODES.NOTIFICATION_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case REPLAY_NOTIFICATION_DECISION_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private buildErrorPayload(error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }): {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
}

function mapNotificationDecision(decision: {
  toJSON(): NotificationDecisionJSON;
}): NotificationDecisionJSON {
  return decision.toJSON();
}

function mapEngagementSummary(
  summary: NotificationEngagementSummaryResponse,
): NotificationEngagementSummaryResponse {
  return {
    engagementScore: summary.engagementScore,
    fatigueLevel: summary.fatigueLevel,
    openedCount: summary.openedCount,
    clickedCount: summary.clickedCount,
    dismissedCount: summary.dismissedCount,
    completedCount: summary.completedCount,
    recentEventsCount: summary.recentEventsCount,
  };
}

function mapReplayRecalculated(
  recalculated: ReplayNotificationDecisionResponseDto['recalculated'],
): ReplayNotificationDecisionResponseDto['recalculated'] {
  return {
    type: recalculated.type,
    priority: recalculated.priority,
    channel: recalculated.channel,
    status: recalculated.status,
    title: recalculated.title,
    message: recalculated.message,
    actionLabel: recalculated.actionLabel,
    actionTarget: recalculated.actionTarget,
    influences: recalculated.influences,
    formulaVersion: recalculated.formulaVersion,
    generatedBy: recalculated.generatedBy,
  };
}

function mapEngagementEvent(event: {
  id: string;
  userProfileId: string;
  notificationDecisionId?: string;
  type: 'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed';
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}): RecordEngagementEventResponseDto['engagementEvent'] {
  return {
    id: event.id,
    userProfileId: event.userProfileId,
    notificationDecisionId: event.notificationDecisionId,
    type: event.type,
    occurredAt: event.occurredAt.toISOString(),
    metadata: event.metadata,
  };
}

function mapNotificationHistoryEntry(historyEntry: {
  id: string;
  userProfileId: string;
  notificationDecisionId: string;
  previousStatus?:
    | 'planned'
    | 'sent'
    | 'opened'
    | 'dismissed'
    | 'completed'
    | 'skipped';
  nextStatus:
    | 'planned'
    | 'sent'
    | 'opened'
    | 'dismissed'
    | 'completed'
    | 'skipped';
  reason?: string;
  occurredAt: Date;
  metadata?: Record<string, unknown>;
}): RecordEngagementEventResponseDto['historyEntry'] {
  return {
    id: historyEntry.id,
    userProfileId: historyEntry.userProfileId,
    notificationDecisionId: historyEntry.notificationDecisionId,
    previousStatus: historyEntry.previousStatus,
    nextStatus: historyEntry.nextStatus,
    reason: historyEntry.reason,
    occurredAt: historyEntry.occurredAt.toISOString(),
    metadata: historyEntry.metadata,
  };
}
