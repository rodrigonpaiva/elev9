import { CoachFeedback } from '../../../domain/entities/coach-feedback.entity';
import { CoachFeedbackRepository } from '../../../domain/repositories/coach-feedback.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES } from './get-coach-feedback-debug-history.errors';
import { GetCoachFeedbackDebugHistoryUseCase } from './get-coach-feedback-debug-history.use-case';

describe('GetCoachFeedbackDebugHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachFeedbackRepository: jest.Mocked<CoachFeedbackRepository>;
  let useCase: GetCoachFeedbackDebugHistoryUseCase;

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

    useCase = new GetCoachFeedbackDebugHistoryUseCase(
      userProfileRepository,
      coachFeedbackRepository,
    );
  });

  it('returns debug history with influences', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([
      buildCoachFeedback('feedback_002', '2026-05-04T10:00:00.000Z', [
        'fatigue:high',
        'nutrition:muscle_gain',
      ]),
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
        influences: ['fatigue:high', 'nutrition:muscle_gain'],
        generatorVersion: 'heuristic-v1',
        contextSnapshot: {
          fatigueLevel: 'HIGH',
          recoveryTrend: 'needs_recovery',
          weeklyFrequency: 4,
          currentStreak: 6,
          averageWorkoutDuration: 82,
          latestCheckIn: {
            energyLevel: 2,
            sleepQuality: 2,
            muscleSoreness: 4,
            motivationLevel: 3,
          },
          nutritionProfile: {
            goal: 'muscle_gain',
            mealsPerDay: 4,
          },
        },
        createdAt: '2026-05-04T10:00:00.000Z',
      },
    ]);
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

  it('applies explicit limit', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 100,
    });

    expect(coachFeedbackRepository.findByUserProfileId).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      limit: 100,
    });
  });

  it('returns [] when there is no feedback', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual({ feedbacks: [] });
  });

  it('maintains user isolation', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 5,
    });

    expect(coachFeedbackRepository.findByUserProfileId).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      limit: 5,
    });
  });

  it('returns [] influences for legacy documents', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findByUserProfileId.mockResolvedValue([
      buildCoachFeedback('feedback_legacy', '2026-05-03T10:00:00.000Z'),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 10,
    });

    expect(result.feedbacks[0].influences).toEqual([]);
    expect(result.feedbacks[0].generatorVersion).toBeUndefined();
    expect(result.feedbacks[0].contextSnapshot).toBeUndefined();
  });

  it('returns USER_PROFILE_NOT_FOUND when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('returns invalid input when limit is greater than 100', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        limit: 101,
      }),
    ).rejects.toMatchObject({
      code: GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT,
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
    generatorVersion: influences ? 'heuristic-v1' : undefined,
    contextSnapshot: influences
      ? {
          fatigueLevel: 'HIGH',
          recoveryTrend: 'needs_recovery',
          weeklyFrequency: 4,
          currentStreak: 6,
          averageWorkoutDuration: 82,
          latestCheckIn: {
            energyLevel: 2,
            sleepQuality: 2,
            muscleSoreness: 4,
            motivationLevel: 3,
          },
          nutritionProfile: {
            goal: 'muscle_gain',
            mealsPerDay: 4,
          },
        }
      : undefined,
    createdAt: new Date(createdAt),
  });
}
