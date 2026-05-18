import { CoachFeedback } from '../../../domain/entities/coach-feedback.entity';
import { CoachFeedbackRepository } from '../../../domain/repositories/coach-feedback.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GET_COACH_FEEDBACK_HISTORY_ERROR_CODES } from './get-coach-feedback-history.errors';
import { GetCoachFeedbackHistoryUseCase } from './get-coach-feedback-history.use-case';

describe('GetCoachFeedbackHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachFeedbackRepository: jest.Mocked<CoachFeedbackRepository>;
  let useCase: GetCoachFeedbackHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    coachFeedbackRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserProfileId: jest.fn(),
    };

    useCase = new GetCoachFeedbackHistoryUseCase(
      userProfileRepository,
      coachFeedbackRepository,
    );
  });

  it('returns empty history', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual({ feedbacks: [] });
  });

  it('applies default limit', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(coachFeedbackRepository.findByUserProfileId).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      limit: 20,
    });
  });

  it('applies explicit limit=1', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([
      buildCoachFeedback('feedback_002', '2026-05-04T10:00:00.000Z'),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 1,
    });

    expect(coachFeedbackRepository.findByUserProfileId).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      limit: 1,
    });
    expect(result.feedbacks).toHaveLength(1);
  });

  it('returns multiple feedbacks serialized', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([
      buildCoachFeedback('feedback_002', '2026-05-04T10:00:00.000Z'),
      buildCoachFeedback('feedback_001', '2026-05-02T10:00:00.000Z'),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 10,
    });

    expect(result.feedbacks).toEqual([
      {
        id: 'feedback_002',
        message: 'Great consistency this week.',
        insights: ['You trained 4 times this week'],
        recommendations: ['Keep your current rhythm'],
        createdAt: '2026-05-04T10:00:00.000Z',
      },
      {
        id: 'feedback_001',
        message: 'Great consistency this week.',
        insights: ['You trained 4 times this week'],
        recommendations: ['Keep your current rhythm'],
        createdAt: '2026-05-02T10:00:00.000Z',
      },
    ]);
  });

  it('keeps public history payload unchanged even when influences exist internally', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([
      buildCoachFeedback('feedback_003', '2026-05-05T10:00:00.000Z', [
        'fatigue:high',
        'nutrition:fat_loss',
      ]),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 10,
    });

    expect(result.feedbacks[0]).toEqual({
      id: 'feedback_003',
      message: 'Great consistency this week.',
      insights: ['You trained 4 times this week'],
      recommendations: ['Keep your current rhythm'],
      createdAt: '2026-05-05T10:00:00.000Z',
    });
    expect(result.feedbacks[0]).not.toHaveProperty('influences');
  });

  it('returns USER_PROFILE_NOT_FOUND when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('returns invalid input when limit is not positive', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        limit: 0,
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_INPUT,
    });
  });

  it('returns invalid input when limit is greater than 50', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        limit: 51,
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_INPUT,
    });
  });

  it('returns invalid session when authUserId is blank', async () => {
    await expect(
      useCase.execute({
        authUserId: ' ',
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('maps unexpected failures to internal error', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockRejectedValue(
      new Error('database unavailable'),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INTERNAL_ERROR,
    });
  });
});

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
  userProfileRepository.findByAuthUserId.mockResolvedValue(
    new UserProfile({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo Paiva',
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

function buildCoachFeedback(
  id: string,
  createdAt: string,
  influences?: string[],
): CoachFeedback {
  return new CoachFeedback({
    id,
    userProfileId: 'profile_123',
    message: 'Great consistency this week.',
    insights: ['You trained 4 times this week'],
    recommendations: ['Keep your current rhythm'],
    influences,
    createdAt: new Date(createdAt),
  });
}
