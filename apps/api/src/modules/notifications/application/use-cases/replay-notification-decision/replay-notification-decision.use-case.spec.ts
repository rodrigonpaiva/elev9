import { NotificationDecision } from '../../../domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../domain/value-objects/notification-influence.value-object';
import type { NotificationDecisionCalculatorOutput } from '../../services/notification-decision-calculator.service';
import { ReplayNotificationDecisionUseCase } from './replay-notification-decision.use-case';
import {
  REPLAY_NOTIFICATION_DECISION_ERROR_CODES,
  ReplayNotificationDecisionError,
} from './replay-notification-decision.errors';

describe('ReplayNotificationDecisionUseCase', () => {
  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let notificationDecisionRepository: {
    findById: jest.Mock;
  };
  let notificationDecisionCalculatorService: {
    calculate: jest.Mock;
  };
  let useCase: ReplayNotificationDecisionUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    notificationDecisionRepository = {
      findById: jest.fn(),
    };
    notificationDecisionCalculatorService = {
      calculate: jest.fn(),
    };

    useCase = new ReplayNotificationDecisionUseCase(
      userProfileRepository as never,
      notificationDecisionRepository as never,
      notificationDecisionCalculatorService as never,
    );
  });

  it('returns a matching replay result when persisted data matches the recalculated decision', async () => {
    const calculatorOutput = buildCalculatorOutput();
    const persisted = buildDecision({
      id: 'notification_123',
      title: calculatorOutput.title,
      message: calculatorOutput.message,
      type: calculatorOutput.type,
      priority: calculatorOutput.priority,
      channel: calculatorOutput.channel,
      status: calculatorOutput.status,
      actionLabel: calculatorOutput.actionLabel,
      actionTarget: calculatorOutput.actionTarget,
      influences: calculatorOutput.influences,
      formulaVersion: calculatorOutput.formulaVersion,
      generatedBy: calculatorOutput.generatedBy,
      sourceContext: calculatorOutput.sourceContext,
    });

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    notificationDecisionRepository.findById.mockResolvedValue(persisted);
    notificationDecisionCalculatorService.calculate.mockReturnValue(calculatorOutput);

    const before = persisted.toJSON();
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
    });
    const after = persisted.toJSON();

    expect(result.comparison.matches).toBe(true);
    expect(result.comparison.differences).toHaveLength(0);
    expect(result.persisted.id).toBe('notification_123');
    expect(result.recalculated.type).toBe(calculatorOutput.type);
    expect(result.replayedAt).toBeTruthy();
    expect(notificationDecisionCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        coachDecisionPriority: calculatorOutput.sourceContext.coachDecisionPriority,
        coachDecisionHeadline: calculatorOutput.sourceContext.coachDecisionHeadline,
        readinessScore: calculatorOutput.sourceContext.readinessScore,
        fatigueScore: calculatorOutput.sourceContext.fatigueScore,
        fatigueLevel: calculatorOutput.sourceContext.fatigueLevel,
        adaptiveRecommendationType:
          calculatorOutput.sourceContext.adaptiveRecommendationType,
        goalProgressTrend: calculatorOutput.sourceContext.goalProgressTrend,
        goalMilestoneClose: calculatorOutput.sourceContext.goalMilestoneClose,
        goalAchievementReached:
          calculatorOutput.sourceContext.goalAchievementReached,
        nutritionAdherence: calculatorOutput.sourceContext.nutritionAdherence,
        missedWorkouts: calculatorOutput.sourceContext.missedWorkouts,
        noRecentActivity: calculatorOutput.sourceContext.noRecentActivity,
      }),
    );
    expect(before).toEqual(after);
  });

  it.each([
    ['type', { type: 'goal_achievement' }],
    ['priority', { priority: 'high' }],
    ['title', { title: 'Different title' }],
    ['message', { message: 'Different message' }],
    ['influences', { influences: [new NotificationInfluence({
      code: 'LOW_ENGAGEMENT',
      label: 'Different influence',
      impact: 'neutral',
      source: 'coach',
    })] }],
    ['formulaVersion', { formulaVersion: 'notification-engine-v2' }],
  ] as const)(
    'detects %s drift',
    async (
      field,
      override,
    ) => {
      const calculatorOutput = buildCalculatorOutput();
      const persisted = buildDecision({
        id: 'notification_123',
        ...calculatorOutput,
        ...override,
      });

      userProfileRepository.findByAuthUserId.mockResolvedValue({
        id: 'profile_123',
      });
      notificationDecisionRepository.findById.mockResolvedValue(persisted);
      notificationDecisionCalculatorService.calculate.mockReturnValue(
        calculatorOutput,
      );

      const result = await useCase.execute({
        authUserId: 'auth_user_123',
        notificationId: 'notification_123',
      });

      expect(result.comparison.matches).toBe(false);
      expect(result.comparison.differences.map((difference) => difference.field)).toContain(
        field,
      );
    },
  );

  it('rejects missing user profiles', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        notificationId: 'notification_123',
      }),
    ).rejects.toBeInstanceOf(ReplayNotificationDecisionError);
  });

  it('rejects missing notifications', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    notificationDecisionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        notificationId: 'notification_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_NOTIFICATION_DECISION_ERROR_CODES.NOTIFICATION_NOT_FOUND,
    });
  });

  it('rejects cross-user notifications as not found', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_999',
    });
    notificationDecisionRepository.findById.mockResolvedValue(
      buildDecision({
        id: 'notification_123',
        userProfileId: 'profile_123',
      }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        notificationId: 'notification_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_NOTIFICATION_DECISION_ERROR_CODES.NOTIFICATION_NOT_FOUND,
    });
  });

  it('rejects invalid session input', async () => {
    await expect(
      useCase.execute({
        authUserId: ' ',
        notificationId: 'notification_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_NOTIFICATION_DECISION_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('does not mutate the persisted notification', async () => {
    const calculatorOutput = buildCalculatorOutput();
    const persisted = buildDecision({
      id: 'notification_123',
      ...calculatorOutput,
    });

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    notificationDecisionRepository.findById.mockResolvedValue(persisted);
    notificationDecisionCalculatorService.calculate.mockReturnValue(calculatorOutput);

    const before = persisted.toJSON();
    await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
    });
    const after = persisted.toJSON();

    expect(after).toEqual(before);
  });

  it('uses persisted source context only', async () => {
    const calculatorOutput = buildCalculatorOutput({
      sourceContext: {
        ...buildCalculatorOutput().sourceContext,
        coachDecisionPriority: 'consistency',
        generatedAt: '2026-06-03T11:00:00.000Z',
      },
    });
    const persisted = buildDecision({
      id: 'notification_123',
      ...calculatorOutput,
    });

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    notificationDecisionRepository.findById.mockResolvedValue(persisted);
    notificationDecisionCalculatorService.calculate.mockReturnValue(calculatorOutput);

    await useCase.execute({
      authUserId: 'auth_user_123',
      notificationId: 'notification_123',
    });

    expect(notificationDecisionCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        coachDecisionPriority: calculatorOutput.sourceContext.coachDecisionPriority,
        coachDecisionHeadline: calculatorOutput.sourceContext.coachDecisionHeadline,
        readinessScore: calculatorOutput.sourceContext.readinessScore,
        fatigueScore: calculatorOutput.sourceContext.fatigueScore,
        fatigueLevel: calculatorOutput.sourceContext.fatigueLevel,
        adaptiveRecommendationType:
          calculatorOutput.sourceContext.adaptiveRecommendationType,
        goalProgressTrend: calculatorOutput.sourceContext.goalProgressTrend,
        goalMilestoneClose: calculatorOutput.sourceContext.goalMilestoneClose,
        goalAchievementReached:
          calculatorOutput.sourceContext.goalAchievementReached,
        nutritionAdherence: calculatorOutput.sourceContext.nutritionAdherence,
        missedWorkouts: calculatorOutput.sourceContext.missedWorkouts,
        noRecentActivity: calculatorOutput.sourceContext.noRecentActivity,
      }),
    );
  });
});

function buildCalculatorOutput(
  overrides: Partial<NotificationDecisionCalculatorOutput> = {},
): NotificationDecisionCalculatorOutput {
  return {
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
      coachDecisionPriority: 'consistency',
      coachDecisionHeadline: 'Keep going',
      readinessScore: 62,
      fatigueScore: 38,
      fatigueLevel: 'low',
      adaptiveRecommendationType: 'train',
      goalProgressTrend: 'stable',
      goalMilestoneClose: false,
      goalAchievementReached: false,
      nutritionAdherence: 67,
      missedWorkouts: 0,
      noRecentActivity: false,
      formulaVersion: 'notification-engine-v1',
      generatedAt: '2026-06-03T10:00:00.000Z',
    },
    formulaVersion: 'notification-engine-v1',
    generatedBy: 'deterministic',
    ...overrides,
  };
}

function buildDecision(
  overrides: Partial<{
    id: string;
    userProfileId: string;
    date: string;
    type: NotificationDecisionCalculatorOutput['type'];
    priority: NotificationDecisionCalculatorOutput['priority'];
    channel: NotificationDecisionCalculatorOutput['channel'];
    status: NotificationDecisionCalculatorOutput['status'];
    title: string;
    message: string;
    actionLabel?: string;
    actionTarget?: string;
    influences: NotificationDecisionCalculatorOutput['influences'];
    sourceContext: NotificationDecisionCalculatorOutput['sourceContext'];
    formulaVersion: string;
    generatedBy: 'deterministic';
  }> = {},
) {
  const calculatorOutput = buildCalculatorOutput();

  return new NotificationDecision({
    id: overrides.id ?? 'notification_123',
    userProfileId: overrides.userProfileId ?? 'profile_123',
    date: overrides.date ?? '2026-06-03',
    type: overrides.type ?? calculatorOutput.type,
    priority: overrides.priority ?? calculatorOutput.priority,
    channel: overrides.channel ?? calculatorOutput.channel,
    status: overrides.status ?? calculatorOutput.status,
    title: overrides.title ?? calculatorOutput.title,
    message: overrides.message ?? calculatorOutput.message,
    actionLabel: overrides.actionLabel ?? calculatorOutput.actionLabel,
    actionTarget: overrides.actionTarget ?? calculatorOutput.actionTarget,
    influences: overrides.influences ?? calculatorOutput.influences,
    sourceContext: overrides.sourceContext ?? calculatorOutput.sourceContext,
    formulaVersion: overrides.formulaVersion ?? calculatorOutput.formulaVersion,
    generatedBy: overrides.generatedBy ?? calculatorOutput.generatedBy,
    createdAt: new Date('2026-06-03T10:00:00.000Z'),
    updatedAt: new Date('2026-06-03T10:00:00.000Z'),
  });
}
