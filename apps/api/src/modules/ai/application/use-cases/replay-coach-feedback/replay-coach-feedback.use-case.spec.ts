import { CoachFeedback } from '../../../domain/entities/coach-feedback.entity';
import { CoachFeedbackRepository } from '../../../domain/repositories/coach-feedback.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import {
  COACH_FEEDBACK_GENERATOR_VERSION,
  CoachFeedbackGenerator,
} from '../../services/coach-feedback/coach-feedback-generator.service';
import { REPLAY_COACH_FEEDBACK_ERROR_CODES } from './replay-coach-feedback.errors';
import { ReplayCoachFeedbackUseCase } from './replay-coach-feedback.use-case';

describe('ReplayCoachFeedbackUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachFeedbackRepository: jest.Mocked<CoachFeedbackRepository>;
  let coachFeedbackGenerator: CoachFeedbackGenerator;
  let useCase: ReplayCoachFeedbackUseCase;

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
    coachFeedbackGenerator = new CoachFeedbackGenerator();

    useCase = new ReplayCoachFeedbackUseCase(
      userProfileRepository,
      coachFeedbackRepository,
      coachFeedbackGenerator,
    );
  });

  it('replays feedback with a valid snapshot', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findById.mockResolvedValue(buildCoachFeedback());

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      feedbackId: 'feedback_123',
    });

    expect(result.feedbackId).toBe('feedback_123');
    expect(result.generatorVersion).toBe(COACH_FEEDBACK_GENERATOR_VERSION);
    expect(result.replayed.message).toBe(result.persisted.message);
  });

  it('fails when contextSnapshot is missing', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findById.mockResolvedValue(
      buildCoachFeedback({ contextSnapshot: undefined }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        feedbackId: 'feedback_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_FEEDBACK_ERROR_CODES.CONTEXT_MISSING,
    });
  });

  it('fails when generatorVersion is unsupported', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findById.mockResolvedValue(
      buildCoachFeedback({ generatorVersion: 'heuristic-v0' }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        feedbackId: 'feedback_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_FEEDBACK_ERROR_CODES.GENERATOR_VERSION_UNSUPPORTED,
    });
  });

  it('respects user isolation', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findById.mockResolvedValue(
      buildCoachFeedback({ userProfileId: 'another_profile' }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        feedbackId: 'feedback_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_FEEDBACK_ERROR_CODES.COACH_FEEDBACK_NOT_FOUND,
    });
  });

  it('returns match flags correctly', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findById.mockResolvedValue(
      buildCoachFeedback({
        recommendations: ['Different persisted recommendation'],
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      feedbackId: 'feedback_123',
    });

    expect(result.matches.message).toBe(true);
    expect(result.matches.insights).toBe(true);
    expect(result.matches.recommendations).toBe(false);
    expect(result.matches.influences).toBe(true);
  });

  it('does not alter the persisted document', async () => {
    mockUserProfile(userProfileRepository);
    coachFeedbackRepository.findById.mockResolvedValue(buildCoachFeedback());

    await useCase.execute({
      authUserId: 'auth_user_123',
      feedbackId: 'feedback_123',
    });

    expect(coachFeedbackRepository.create).not.toHaveBeenCalled();
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
  overrides: Partial<CoachFeedback> = {},
): CoachFeedback {
  const hasContextSnapshotOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    'contextSnapshot',
  );
  const hasGeneratorVersionOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    'generatorVersion',
  );

  return new CoachFeedback({
    id: overrides.id ?? 'feedback_123',
    userProfileId: overrides.userProfileId ?? 'profile_123',
    message:
      overrides.message ??
      'Good start this week. You already logged your first workouts and can build consistency from here.',
    insights: overrides.insights ?? [
      'You completed 2 workouts in the last 7 days',
      'You already started building a weekly training rhythm',
      'Your current workload looks balanced overall',
    ],
    recommendations: overrides.recommendations ?? [
      'Repeat this rhythm for one more session this week',
      'Focus on finishing your planned workout window',
      'Keep your current plan and monitor recovery between sessions',
    ],
    influences: overrides.influences ?? ['training:low_consistency'],
    generatorVersion: hasGeneratorVersionOverride
      ? overrides.generatorVersion
      : COACH_FEEDBACK_GENERATOR_VERSION,
    contextSnapshot: hasContextSnapshotOverride
      ? overrides.contextSnapshot
      : {
          goal: 'gain_muscle',
          activityLevel: 'medium',
          hasTrainingPlan: true,
          fatigueLevel: 'MODERATE',
          recoveryTrend: 'stable',
          weeklyFrequency: 4,
          currentStreak: 2,
          averageWorkoutDuration: 42,
          recentWorkoutLogs: [
            {
              date: '2026-05-02',
              durationMinutes: 40,
              createdAt: '2026-05-02T08:00:00.000Z',
            },
            {
              date: '2026-05-04',
              durationMinutes: 44,
              createdAt: '2026-05-04T08:00:00.000Z',
            },
          ],
        },
    createdAt: overrides.createdAt ?? new Date('2026-05-18T10:00:00.000Z'),
  });
}
