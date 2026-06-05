import { NotificationDecision } from '../../../domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../domain/value-objects/notification-influence.value-object';
import { NotificationDecisionRepository } from '../../../domain/repositories/notification-decision.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GET_NOTIFICATION_HISTORY_ERROR_CODES } from './get-notification-history.errors';
import { GetNotificationHistoryUseCase } from './get-notification-history.use-case';

describe('GetNotificationHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let notificationDecisionRepository: jest.Mocked<NotificationDecisionRepository>;
  let useCase: GetNotificationHistoryUseCase;

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

    useCase = new GetNotificationHistoryUseCase(
      userProfileRepository,
      notificationDecisionRepository,
    );
  });

  it('returns the default limit of 14', async () => {
    arrangeUserProfile();
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue([
      buildDecision('notification_123'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(notificationDecisionRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
    expect(result.limit).toBe(14);
  });

  it('uses the provided limit up to the maximum', async () => {
    arrangeUserProfile();
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue([
      buildDecision('notification_123'),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 90,
    });

    expect(notificationDecisionRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 90 },
    );
    expect(result.limit).toBe(90);
  });

  it('rejects invalid limits', async () => {
    arrangeUserProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123', limit: 0 }),
    ).rejects.toMatchObject({
      code: GET_NOTIFICATION_HISTORY_ERROR_CODES.INVALID_LIMIT,
    });
  });

  it('isolates history by user profile', async () => {
    arrangeUserProfile();
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue([
      buildDecision('notification_123'),
    ]);

    await useCase.execute({ authUserId: 'auth_user_123', limit: 14 });

    expect(notificationDecisionRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
    expect(notificationDecisionRepository.findManyByUserProfileId).not.toHaveBeenCalledWith(
      'auth_user_123',
      expect.anything(),
    );
  });

  it('errors when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_NOTIFICATION_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
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
