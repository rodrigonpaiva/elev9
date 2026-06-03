import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachDecisionRepository } from '../../../domain/repositories/coach-decision.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { CoachDecisionCalculatorService } from '../../services/coach-decision-calculator.service';
import { REPLAY_COACH_DECISION_ERROR_CODES } from './replay-coach-decision.errors';
import { ReplayCoachDecisionUseCase } from './replay-coach-decision.use-case';

describe('ReplayCoachDecisionUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachDecisionRepository: jest.Mocked<CoachDecisionRepository>;
  let coachDecisionCalculatorService: jest.Mocked<CoachDecisionCalculatorService>;
  let useCase: ReplayCoachDecisionUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    coachDecisionRepository = {
      findById: jest.fn(),
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      upsertDailyDecision: jest.fn(),
    };
    coachDecisionCalculatorService = {
      calculate: jest.fn(),
    } as unknown as jest.Mocked<CoachDecisionCalculatorService>;

    useCase = new ReplayCoachDecisionUseCase(
      userProfileRepository,
      coachDecisionRepository,
      coachDecisionCalculatorService,
    );
  });

  it('replays a decision without differences', async () => {
    mockUserProfile(userProfileRepository);
    coachDecisionRepository.findById.mockResolvedValue(buildCoachDecision());
    coachDecisionCalculatorService.calculate.mockReturnValue({
      priority: 'motivation',
      headline: 'Keep building momentum',
      summary: 'Signals are stable.',
      actionItems: ['Continue the current plan', 'Stay consistent'],
      influences: [],
      formulaVersion: 'coach-decision-v1',
    });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      coachDecisionId: 'decision_123',
    });

    expect(result.comparison.matches).toBe(true);
    expect(result.comparison.differences).toHaveLength(0);
    expect(coachDecisionCalculatorService.calculate).toHaveBeenCalledWith({
      readinessScore: 50,
      fatigueScore: 50,
      nutritionAdherence: undefined,
      adaptiveRecommendationType: undefined,
      adaptiveIntensity: undefined,
      currentStreak: undefined,
      missedWorkouts: undefined,
      goalProgressPercentage: undefined,
      goalTrend: undefined,
      goalForecastConfidence: undefined,
      goalMilestoneClose: undefined,
      goalAchievementReached: undefined,
    });
  });

  it('replays a decision with goal context', async () => {
    mockUserProfile(userProfileRepository);
    coachDecisionRepository.findById.mockResolvedValue(
      buildCoachDecision({
        sourceContext: {
          readinessScore: 50,
          fatigueScore: 50,
          goalProgressPercentage: 48,
          goalTrend: 'declining',
          goalForecastConfidence: 'low',
          goalMilestoneClose: false,
          goalAchievementReached: false,
          generatedAt: '2026-06-02T06:00:00.000Z',
        },
      }),
    );
    coachDecisionCalculatorService.calculate.mockReturnValue({
      priority: 'consistency',
      headline: 'Focus on consistency',
      summary: 'Goal progress is slowing.',
      actionItems: ['Complete today\'s session', 'Avoid skipping workouts'],
      influences: [
        {
          code: 'GOAL_PROGRESS_DECLINING',
          label: 'Goal progress is declining.',
          impact: 'negative',
          source: 'progress',
          weight: 0.22,
          value: 48,
        },
      ],
      formulaVersion: 'coach-decision-v1',
    });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      coachDecisionId: 'decision_123',
    });

    expect(result.comparison.matches).toBe(false);
    expect(coachDecisionCalculatorService.calculate).toHaveBeenCalledWith({
      readinessScore: 50,
      fatigueScore: 50,
      nutritionAdherence: undefined,
      adaptiveRecommendationType: undefined,
      adaptiveIntensity: undefined,
      currentStreak: undefined,
      missedWorkouts: undefined,
      goalProgressPercentage: 48,
      goalTrend: 'declining',
      goalForecastConfidence: 'low',
      goalMilestoneClose: false,
      goalAchievementReached: false,
    });
  });

  it('detects a priority difference', async () => {
    mockUserProfile(userProfileRepository);
    coachDecisionRepository.findById.mockResolvedValue(buildCoachDecision());
    coachDecisionCalculatorService.calculate.mockReturnValue({
      priority: 'recovery',
      headline: 'Recovery should be your focus today',
      summary: 'Recovery is the main priority because readiness is low.',
      actionItems: ['Reduce training intensity today'],
      influences: [],
      formulaVersion: 'coach-decision-v1',
    });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      coachDecisionId: 'decision_123',
    });

    expect(result.comparison.matches).toBe(false);
    expect(result.comparison.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'priority',
          persisted: 'motivation',
          recalculated: 'recovery',
        }),
      ]),
    );
  });

  it('detects differences in headline, summary, action items, influences and formulaVersion', async () => {
    mockUserProfile(userProfileRepository);
    coachDecisionRepository.findById.mockResolvedValue(buildCoachDecision());
    coachDecisionCalculatorService.calculate.mockReturnValue({
      priority: 'motivation',
      headline: 'A different headline',
      summary: 'A different summary',
      actionItems: ['Different action'],
      influences: [
        {
          code: 'GOOD_CONSISTENCY',
          label: 'Consistency has been strong recently.',
          impact: 'positive',
          source: 'progress',
          weight: 0.18,
          value: 3,
        },
      ],
      formulaVersion: 'coach-decision-v2',
    });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      coachDecisionId: 'decision_123',
    });

    expect(result.comparison.differences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'headline' }),
        expect.objectContaining({ field: 'summary' }),
        expect.objectContaining({ field: 'actionItems' }),
        expect.objectContaining({ field: 'influences' }),
        expect.objectContaining({ field: 'formulaVersion' }),
      ]),
    );
  });

  it('fails without a user profile', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        coachDecisionId: 'decision_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('fails when the decision does not exist', async () => {
    mockUserProfile(userProfileRepository);
    coachDecisionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        coachDecisionId: 'decision_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_DECISION_ERROR_CODES.COACH_DECISION_NOT_FOUND,
    });
  });

  it('fails when the decision belongs to another user', async () => {
    mockUserProfile(userProfileRepository);
    coachDecisionRepository.findById.mockResolvedValue(
      buildCoachDecision({ userProfileId: 'another_profile' }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        coachDecisionId: 'decision_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_DECISION_ERROR_CODES.COACH_DECISION_NOT_FOUND,
    });
  });

  it('does not call build use cases or mutate the persisted decision', async () => {
    mockUserProfile(userProfileRepository);
    const persisted = buildCoachDecision();
    coachDecisionRepository.findById.mockResolvedValue(persisted);
    coachDecisionCalculatorService.calculate.mockReturnValue({
      priority: 'motivation',
      headline: 'Keep building momentum',
      summary: 'Signals are stable.',
      actionItems: ['Continue the current plan', 'Stay consistent'],
      influences: [],
      formulaVersion: 'coach-decision-v1',
    });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      coachDecisionId: 'decision_123',
    });

    expect(result.persisted).toBe(persisted);
    expect(coachDecisionRepository.upsertDailyDecision).not.toHaveBeenCalled();
  });

  it('rejects invalid sessions and ids', async () => {
    await expect(
      useCase.execute({
        authUserId: '',
        coachDecisionId: 'decision_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_DECISION_ERROR_CODES.INVALID_SESSION,
    });

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        coachDecisionId: ' ',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_COACH_DECISION_ERROR_CODES.INVALID_INPUT,
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

function buildCoachDecision(
  overrides: Partial<CoachDecision> = {},
): CoachDecision {
  return new CoachDecision({
    id: overrides.id ?? 'decision_123',
    userProfileId: overrides.userProfileId ?? 'profile_123',
    date: overrides.date ?? '2026-06-02',
    priority: overrides.priority ?? 'motivation',
    headline: overrides.headline ?? 'Keep building momentum',
    summary: overrides.summary ?? 'Signals are stable.',
    actionItems:
      overrides.actionItems ?? ['Continue the current plan', 'Stay consistent'],
    influences:
      overrides.influences ?? [],
    sourceContext:
      overrides.sourceContext ?? {
        readinessScore: 50,
        fatigueScore: 50,
        generatedAt: '2026-06-02T06:00:00.000Z',
      },
    formulaVersion: overrides.formulaVersion ?? 'coach-decision-v1',
    generatedBy: overrides.generatedBy ?? 'deterministic',
    llmMetadata: overrides.llmMetadata ?? { used: false },
    createdAt: overrides.createdAt ?? new Date('2026-06-02T06:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-06-02T06:00:00.000Z'),
  });
}
