import { NotificationDecision } from '../../../domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../domain/value-objects/notification-influence.value-object';
import { BuildNotificationDecisionUseCase } from '../build-notification-decision/build-notification-decision.use-case';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { NotificationDecisionRepository } from '../../../domain/repositories/notification-decision.repository';
import { GET_CURRENT_NOTIFICATION_ERROR_CODES } from './get-current-notification.errors';
import { GetCurrentNotificationUseCase } from './get-current-notification.use-case';

describe('GetCurrentNotificationUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let notificationDecisionRepository: jest.Mocked<NotificationDecisionRepository>;
  let buildNotificationDecisionUseCase: jest.Mocked<BuildNotificationDecisionUseCase>;
  let useCase: GetCurrentNotificationUseCase;

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
    buildNotificationDecisionUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildNotificationDecisionUseCase>;

    useCase = new GetCurrentNotificationUseCase(
      userProfileRepository,
      notificationDecisionRepository,
      buildNotificationDecisionUseCase,
    );
  });

  it('returns the latest notification when available', async () => {
    arrangeUserProfile();
    notificationDecisionRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDecision('notification_123'),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.id).toBe('notification_123');
    expect(buildNotificationDecisionUseCase.execute).not.toHaveBeenCalled();
  });

  it('builds the current notification when missing', async () => {
    arrangeUserProfile();
    notificationDecisionRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    buildNotificationDecisionUseCase.execute.mockResolvedValue({
      notificationDecision: buildDecision('notification_123'),
    } as never);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(buildNotificationDecisionUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.notificationDecision.id).toBe('notification_123');
  });

  it('throws when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_CURRENT_NOTIFICATION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  function arrangeUserProfile() {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Alex',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  }
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
