import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { NotificationDecision } from '../../domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../domain/value-objects/notification-influence.value-object';
import { GetCurrentNotificationUseCase } from '../../application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetNotificationHistoryUseCase } from '../../application/use-cases/get-notification-history/get-notification-history.use-case';
import { GetNotificationHistoryError } from '../../application/use-cases/get-notification-history/get-notification-history.errors';
import { GET_NOTIFICATION_HISTORY_ERROR_CODES } from '../../application/use-cases/get-notification-history/get-notification-history.errors';
import { GetTodayNotificationUseCase } from '../../application/use-cases/get-today-notification/get-today-notification.use-case';
import { GetTodayNotificationError } from '../../application/use-cases/get-today-notification/get-today-notification.errors';
import { GET_TODAY_NOTIFICATION_ERROR_CODES } from '../../application/use-cases/get-today-notification/get-today-notification.errors';
import { ReplayNotificationDecisionUseCase } from '../../application/use-cases/replay-notification-decision/replay-notification-decision.use-case';
import { ReplayNotificationDecisionError } from '../../application/use-cases/replay-notification-decision/replay-notification-decision.errors';
import { REPLAY_NOTIFICATION_DECISION_ERROR_CODES } from '../../application/use-cases/replay-notification-decision/replay-notification-decision.errors';
import { RecordEngagementEventUseCase } from '../../application/use-cases/record-engagement-event/record-engagement-event.use-case';
import { RecordEngagementEventError } from '../../application/use-cases/record-engagement-event/record-engagement-event.errors';
import { RECORD_ENGAGEMENT_EVENT_ERROR_CODES } from '../../application/use-cases/record-engagement-event/record-engagement-event.errors';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  let getTodayNotificationUseCase: jest.Mocked<GetTodayNotificationUseCase>;
  let getCurrentNotificationUseCase: jest.Mocked<GetCurrentNotificationUseCase>;
  let getNotificationHistoryUseCase: jest.Mocked<GetNotificationHistoryUseCase>;
  let getEngagementSummaryUseCase: jest.Mocked<GetEngagementSummaryUseCase>;
  let replayNotificationDecisionUseCase: jest.Mocked<ReplayNotificationDecisionUseCase>;
  let recordEngagementEventUseCase: jest.Mocked<RecordEngagementEventUseCase>;
  let controller: NotificationsController;

  beforeEach(() => {
    getTodayNotificationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTodayNotificationUseCase>;
    getCurrentNotificationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentNotificationUseCase>;
    getNotificationHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetNotificationHistoryUseCase>;
    getEngagementSummaryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetEngagementSummaryUseCase>;
    replayNotificationDecisionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReplayNotificationDecisionUseCase>;
    recordEngagementEventUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RecordEngagementEventUseCase>;

    controller = new NotificationsController(
      getTodayNotificationUseCase,
      getCurrentNotificationUseCase,
      getNotificationHistoryUseCase,
      getEngagementSummaryUseCase,
      replayNotificationDecisionUseCase,
      recordEngagementEventUseCase,
    );
  });

  it('returns the today notification for the authenticated user', async () => {
    getTodayNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: buildDecision('notification_123'),
    } as never);

    const result = await controller.getTodayNotification({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
      userProfileId: 'ignored',
    } as never);

    expect(getTodayNotificationUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.notificationDecision.id).toBe('notification_123');
  });

  it('returns the current notification for the authenticated user', async () => {
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: buildDecision('notification_123'),
    } as never);

    const result = await controller.getCurrentNotification({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    } as never);

    expect(getCurrentNotificationUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.notificationDecision.id).toBe('notification_123');
  });

  it('returns the notification history with the provided limit', async () => {
    getNotificationHistoryUseCase.execute.mockResolvedValue({
      notificationDecisions: [buildDecision('notification_123')],
      limit: 14,
    } as never);

    const result = await controller.getNotificationHistory(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never,
      {
        limit: 14,
      } as never,
    );

    expect(getNotificationHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 14,
    });
    expect(result.notificationDecisions).toHaveLength(1);
  });

  it('returns the engagement summary for the authenticated user', async () => {
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        engagementScore: 72,
        fatigueLevel: 'medium',
        openedCount: 2,
        clickedCount: 1,
        dismissedCount: 1,
        completedCount: 0,
        recentEventsCount: 4,
      },
    } as never);

    const result = await controller.getEngagementSummary({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    } as never);

    expect(getEngagementSummaryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.engagementSummary.engagementScore).toBe(72);
  });

  it('records an engagement event for the authenticated user', async () => {
    recordEngagementEventUseCase.execute.mockResolvedValue({
      engagementEvent: {
        id: 'event_123',
        userProfileId: 'profile_123',
        notificationDecisionId: 'notification_123',
        type: 'opened',
        occurredAt: new Date('2026-06-03T10:00:00.000Z'),
        metadata: {
          source: 'dashboard',
        },
      },
      notificationDecision: buildDecision('notification_123'),
      historyEntry: {
        id: 'history_123',
        userProfileId: 'profile_123',
        notificationDecisionId: 'notification_123',
        previousStatus: 'planned',
        nextStatus: 'opened',
        reason: 'opened',
        occurredAt: new Date('2026-06-03T10:00:00.000Z'),
        metadata: {
          engagementEventId: 'event_123',
        },
      },
    } as never);

    const result = await controller.recordEngagementEvent(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never,
      'notification_123',
      {
        type: 'opened',
        metadata: {
          source: 'dashboard',
          userProfileId: 'ignored',
        },
      } as never,
    );

    expect(recordEngagementEventUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'opened',
      metadata: {
        source: 'dashboard',
        userProfileId: 'ignored',
      },
    });
    expect(result.notificationDecision.id).toBe('notification_123');
    expect(result.engagementEvent.id).toBe('event_123');
    expect(result.historyEntry?.id).toBe('history_123');
  });

  it('replays a notification decision for the authenticated user', async () => {
    replayNotificationDecisionUseCase.execute.mockResolvedValue({
      persisted: buildDecision('notification_123'),
      recalculated: {
        type: 'weekly_summary',
        priority: 'low',
        channel: 'in_app',
        status: 'planned',
        title: 'Your weekly summary is ready',
        message: 'Review the week and keep the next step simple.',
        actionLabel: 'Review week',
        actionTarget: 'dashboard.weekly-summary',
        influences: [
          {
            code: 'LOW_ENGAGEMENT',
            label: 'Weekly summary prompt',
            impact: 'neutral',
            source: 'coach',
          },
        ],
        formulaVersion: 'notification-engine-v1',
        generatedBy: 'deterministic',
      },
      comparison: {
        matches: true,
        differences: [],
      },
      replayedAt: '2026-06-03T11:00:00.000Z',
    } as never);

    const result = await controller.replayNotificationDecision(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never,
      'notification_123',
    );

    expect(replayNotificationDecisionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
    });
    expect(result.persisted.id).toBe('notification_123');
    expect(result.comparison.matches).toBe(true);
    expect(result.replayedAt).toBe('2026-06-03T11:00:00.000Z');
  });

  it('maps invalid limits to 400', async () => {
    getNotificationHistoryUseCase.execute.mockRejectedValue(
      new GetNotificationHistoryError(
        GET_NOTIFICATION_HISTORY_ERROR_CODES.INVALID_LIMIT,
        'Limit must be between 1 and 90.',
      ),
    );

    await expect(
      controller.getNotificationHistory(
        {
          authUser: { id: 'auth_user_123', email: 'user@email.com' },
        } as never,
        { limit: 0 } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps missing user profiles to 404', async () => {
    getTodayNotificationUseCase.execute.mockRejectedValue(
      new GetTodayNotificationError(
        GET_TODAY_NOTIFICATION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      ),
    );

    await expect(
      controller.getTodayNotification({
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps missing notifications to 404', async () => {
    recordEngagementEventUseCase.execute.mockRejectedValue(
      new RecordEngagementEventError(
        RECORD_ENGAGEMENT_EVENT_ERROR_CODES.NOTIFICATION_NOT_FOUND,
        'Notification decision not found.',
      ),
    );

    await expect(
      controller.recordEngagementEvent(
        {
          authUser: { id: 'auth_user_123', email: 'user@email.com' },
        } as never,
        'notification_123',
        { type: 'opened' } as never,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps replay missing notifications to 404', async () => {
    replayNotificationDecisionUseCase.execute.mockRejectedValue(
      new ReplayNotificationDecisionError(
        REPLAY_NOTIFICATION_DECISION_ERROR_CODES.NOTIFICATION_NOT_FOUND,
        'Notification decision not found.',
      ),
    );

    await expect(
      controller.replayNotificationDecision(
        {
          authUser: { id: 'auth_user_123', email: 'user@email.com' },
        } as never,
        'notification_123',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('uses auth guard on all routes', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        NotificationsController.prototype.getTodayNotification,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        NotificationsController.prototype.getCurrentNotification,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        NotificationsController.prototype.getNotificationHistory,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        NotificationsController.prototype.getEngagementSummary,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        NotificationsController.prototype.recordEngagementEvent,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        NotificationsController.prototype.replayNotificationDecision,
      ),
    ).toContain(AuthSessionGuard);
  });
});

function buildDecision(id: string) {
  return new NotificationDecision({
    id,
    userProfileId: 'profile_123',
    date: '2026-06-03',
    type: 'weekly_summary',
    priority: 'low',
    channel: 'in_app',
    status: 'planned',
    title: 'Your weekly summary is ready',
    message: 'Review the week and keep the next step simple.',
    actionLabel: 'Review week',
    actionTarget: 'dashboard.weekly-summary',
    influences: [
      new NotificationInfluence({
        code: 'LOW_ENGAGEMENT',
        label: 'Weekly summary prompt',
        impact: 'neutral',
        source: 'coach',
      }),
    ],
    sourceContext: {
      formulaVersion: 'notification-engine-v1',
      generatedAt: '2026-06-03T10:00:00.000Z',
    },
    formulaVersion: 'notification-engine-v1',
    generatedBy: 'deterministic',
    createdAt: new Date('2026-06-03T10:00:00.000Z'),
    updatedAt: new Date('2026-06-03T10:00:00.000Z'),
  });
}
