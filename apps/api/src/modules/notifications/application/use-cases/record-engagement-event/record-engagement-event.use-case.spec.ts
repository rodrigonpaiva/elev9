import { NotificationDecision } from '../../../domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../domain/value-objects/notification-influence.value-object';
import { RecordEngagementEventError } from './record-engagement-event.errors';
import { RECORD_ENGAGEMENT_EVENT_ERROR_CODES } from './record-engagement-event.errors';
import { RecordEngagementEventUseCase } from './record-engagement-event.use-case';
import type { EngagementEventRepository } from '../../../domain/repositories/engagement-event.repository';
import type { NotificationDecisionRepository } from '../../../domain/repositories/notification-decision.repository';
import type { NotificationHistoryRepository } from '../../../domain/repositories/notification-history.repository';
import type { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('RecordEngagementEventUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let notificationDecisionRepository: jest.Mocked<NotificationDecisionRepository>;
  let notificationHistoryRepository: jest.Mocked<NotificationHistoryRepository>;
  let engagementEventRepository: jest.Mocked<EngagementEventRepository>;
  let useCase: RecordEngagementEventUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    notificationDecisionRepository = {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      upsertDailyDecision: jest.fn(),
    } as unknown as jest.Mocked<NotificationDecisionRepository>;
    notificationHistoryRepository = {
      create: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findManyByNotificationDecisionId: jest.fn(),
    } as unknown as jest.Mocked<NotificationHistoryRepository>;
    engagementEventRepository = {
      create: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findManyByNotificationDecisionId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<EngagementEventRepository>;

    userProfileRepository.findByAuthUserId.mockResolvedValue(buildUserProfile());
    notificationDecisionRepository.findById.mockResolvedValue(
      buildDecision('notification_123', 'planned'),
    );
    notificationDecisionRepository.updateStatus.mockImplementation(
      async (_notificationDecisionId, status) =>
        buildDecision('notification_123', status),
    );
    engagementEventRepository.create.mockImplementation(async (input) => ({
      id: 'engagement_123',
      userProfileId: input.userProfileId,
      notificationDecisionId: input.notificationDecisionId,
      type: input.type,
      occurredAt: input.occurredAt,
      metadata: input.metadata,
    }));
    notificationHistoryRepository.create.mockImplementation(async (input) => ({
      id: 'history_123',
      userProfileId: input.userProfileId,
      notificationDecisionId: input.notificationDecisionId,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      reason: input.reason,
      occurredAt: input.occurredAt,
      metadata: input.metadata,
    }));

    useCase = new RecordEngagementEventUseCase(
      userProfileRepository,
      notificationDecisionRepository,
      notificationHistoryRepository,
      engagementEventRepository,
    );
  });

  it('records an impression and marks the notification as sent', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'impression',
    });

    expect(engagementEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        notificationDecisionId: 'notification_123',
        type: 'impression',
      }),
    );
    expect(notificationDecisionRepository.updateStatus).toHaveBeenCalledWith(
      'notification_123',
      'sent',
    );
    expect(notificationHistoryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        previousStatus: 'planned',
        nextStatus: 'sent',
        reason: 'impression',
      }),
    );
    expect(result.notificationDecision.status.value).toBe('sent');
    expect(result.engagementEvent.id).toBe('engagement_123');
  });

  it('records opened and sets the status to opened', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'opened',
    });

    expect(notificationDecisionRepository.updateStatus).toHaveBeenCalledWith(
      'notification_123',
      'opened',
    );
    expect(result.notificationDecision.status.value).toBe('opened');
  });

  it('records clicked and sets the status to opened', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'clicked',
    });

    expect(notificationDecisionRepository.updateStatus).toHaveBeenCalledWith(
      'notification_123',
      'opened',
    );
    expect(result.notificationDecision.status.value).toBe('opened');
  });

  it('records dismissed and sets the status to dismissed', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'dismissed',
    });

    expect(notificationDecisionRepository.updateStatus).toHaveBeenCalledWith(
      'notification_123',
      'dismissed',
    );
    expect(result.notificationDecision.status.value).toBe('dismissed');
  });

  it('records completed and sets the status to completed', async () => {
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'completed',
    });

    expect(notificationDecisionRepository.updateStatus).toHaveBeenCalledWith(
      'notification_123',
      'completed',
    );
    expect(result.notificationDecision.status.value).toBe('completed');
  });

  it('does not create a history entry when the status does not change', async () => {
    notificationDecisionRepository.findById.mockResolvedValue(
      buildDecision('notification_123', 'opened'),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'opened',
    });

    expect(notificationHistoryRepository.create).not.toHaveBeenCalled();
    expect(result.historyEntry).toBeUndefined();
  });

  it('returns not found when the notification is missing', async () => {
    notificationDecisionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        notificationId: 'notification_123',
        type: 'opened',
      }),
    ).rejects.toMatchObject({
      code: RECORD_ENGAGEMENT_EVENT_ERROR_CODES.NOTIFICATION_NOT_FOUND,
    });
  });

  it('returns not found when the notification belongs to another user', async () => {
    notificationDecisionRepository.findById.mockResolvedValue(
      buildDecision('notification_123', 'planned', 'profile_other'),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        notificationId: 'notification_123',
        type: 'opened',
      }),
    ).rejects.toMatchObject({
      code: RECORD_ENGAGEMENT_EVENT_ERROR_CODES.NOTIFICATION_NOT_FOUND,
    });
  });

  it('sanitizes metadata before persistence', async () => {
    await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
      type: 'opened',
      metadata: {
        safe: 'value',
        authorization: 'Bearer secret',
        nested: {
          token: 'hidden',
          safeNested: true,
        },
      },
    });

    expect(engagementEventRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          safe: 'value',
          nested: {
            safeNested: true,
          },
        },
      }),
    );
  });

  it('errors when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        notificationId: 'notification_123',
        type: 'opened',
      }),
    ).rejects.toMatchObject({
      code: RECORD_ENGAGEMENT_EVENT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('errors when the auth user is missing', async () => {
    await expect(
      useCase.execute({
        authUserId: '',
        notificationId: 'notification_123',
        type: 'opened',
      }),
    ).rejects.toMatchObject({
      code: RECORD_ENGAGEMENT_EVENT_ERROR_CODES.INVALID_INPUT,
    });
  });
});

function buildUserProfile() {
  return {
    id: 'profile_123',
    authUserId: 'auth_user_123',
    name: 'Alex',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never;
}

function buildDecision(
  id: string,
  status: 'planned' | 'sent' | 'opened' | 'dismissed' | 'completed' | 'skipped',
  userProfileId = 'profile_123',
) {
  return new NotificationDecision({
    id,
    userProfileId,
    date: '2026-06-03',
    type: 'weekly_summary',
    priority: 'low',
    channel: 'in_app',
    status,
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
