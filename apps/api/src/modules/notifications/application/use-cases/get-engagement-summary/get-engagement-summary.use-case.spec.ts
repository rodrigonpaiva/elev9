import { EngagementEventRepository } from '../../../domain/repositories/engagement-event.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GET_ENGAGEMENT_SUMMARY_ERROR_CODES } from './get-engagement-summary.errors';
import { GetEngagementSummaryUseCase } from './get-engagement-summary.use-case';

describe('GetEngagementSummaryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let engagementEventRepository: jest.Mocked<EngagementEventRepository>;
  let useCase: GetEngagementSummaryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    engagementEventRepository = {
      create: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findManyByNotificationDecisionId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<EngagementEventRepository>;

    useCase = new GetEngagementSummaryUseCase(
      userProfileRepository,
      engagementEventRepository,
    );
  });

  it('returns neutral score and low fatigue when there are no events', async () => {
    arrangeUserProfile();
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.engagementSummary).toEqual({
      engagementScore: 50,
      fatigueLevel: 'low',
      openedCount: 0,
      clickedCount: 0,
      dismissedCount: 0,
      completedCount: 0,
      recentEventsCount: 0,
    });
    expect(engagementEventRepository.findRecentByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 20 },
    );
  });

  it('raises the score with positive engagement events', async () => {
    arrangeUserProfile();
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([
      buildEvent('opened'),
      buildEvent('clicked'),
      buildEvent('completed'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.engagementSummary.engagementScore).toBe(95);
    expect(result.engagementSummary.fatigueLevel).toBe('low');
  });

  it('decreases the score with dismissed events', async () => {
    arrangeUserProfile();
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([
      buildEvent('dismissed'),
      buildEvent('dismissed'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.engagementSummary.engagementScore).toBe(20);
  });

  it('clamps the score at zero', async () => {
    arrangeUserProfile();
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([
      buildEvent('dismissed'),
      buildEvent('dismissed'),
      buildEvent('dismissed'),
      buildEvent('dismissed'),
      buildEvent('dismissed'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.engagementSummary.engagementScore).toBe(0);
  });

  it('clamps the score at one hundred', async () => {
    arrangeUserProfile();
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([
      buildEvent('opened'),
      buildEvent('opened'),
      buildEvent('opened'),
      buildEvent('opened'),
      buildEvent('opened'),
      buildEvent('clicked'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.engagementSummary.engagementScore).toBe(100);
  });

  it('classifies medium and high fatigue', async () => {
    arrangeUserProfile();
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([
      buildEvent('opened'),
      buildEvent('dismissed'),
      buildEvent('dismissed'),
      buildEvent('dismissed'),
      buildEvent('dismissed'),
      buildEvent('opened'),
      buildEvent('clicked'),
      buildEvent('completed'),
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.engagementSummary.fatigueLevel).toBe('high');
    expect(result.engagementSummary.recentEventsCount).toBe(8);
  });

  it('errors when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_ENGAGEMENT_SUMMARY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
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

function buildEvent(type: 'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed') {
  return {
    id: `${type}_123`,
    userProfileId: 'profile_123',
    notificationDecisionId: 'notification_123',
    type,
    occurredAt: new Date('2026-06-03T10:00:00.000Z'),
    metadata: {},
  };
}
