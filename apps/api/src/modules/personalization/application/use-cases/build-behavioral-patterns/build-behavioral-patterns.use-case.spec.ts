import { BuildBehavioralPatternsError } from './build-behavioral-patterns.errors';
import { BuildBehavioralPatternsUseCase } from './build-behavioral-patterns.use-case';

describe('BuildBehavioralPatternsUseCase', () => {
  let useCase: BuildBehavioralPatternsUseCase;

  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let personalizationSnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let behavioralPatternRepository: {
    replaceManyByUserProfileId: jest.Mock;
  };
  let personalizationCalculatorService: {
    calculate: jest.Mock;
    averageScore: jest.Mock;
    resolveLevel: jest.Mock;
  };
  let platformDateService: {
    getTodayDateString: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T12:00:00.000Z'));

    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    personalizationSnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    behavioralPatternRepository = {
      replaceManyByUserProfileId: jest.fn(),
    };
    personalizationCalculatorService = {
      calculate: jest.fn(),
      averageScore: jest.fn((values: number[]) => {
        if (!values.length) {
          return 50;
        }

        return Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        );
      }),
      resolveLevel: jest.fn((score: number) => {
        if (score < 40) {
          return 'low';
        }

        if (score < 70) {
          return 'medium';
        }

        return 'high';
      }),
    };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-06-03'),
    };

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    behavioralPatternRepository.replaceManyByUserProfileId.mockImplementation(
      async (_userProfileId: string, patterns: unknown[]) => patterns,
    );
    personalizationCalculatorService.calculate.mockReturnValue({
      behavioralPatterns: [],
      formulaVersion: 'personalization-engine-v1',
    });

    useCase = new BuildBehavioralPatternsUseCase(
      userProfileRepository as never,
      personalizationSnapshotRepository as never,
      behavioralPatternRepository as never,
      personalizationCalculatorService as never,
      platformDateService as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates persisted patterns from the latest snapshot', async () => {
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      {
        generatedAt: '2026-06-02T09:30:00.000Z',
        sourceContext: {
          formulaVersion: 'personalization-engine-v1',
          generatedAt: '2026-06-02T09:30:00.000Z',
          engagementScore: 80,
          notificationDismissalRate: 75,
          notificationCompletionRate: 80,
          consistencyScore: 85,
          habitTrend: 'improving',
          habitRiskLevel: 'low',
          goalTrend: 'stable',
          goalMilestoneReached: true,
          goalAchievementReached: false,
          recoveryTrend: 'stable',
          recoveryAlertEngagement: 80,
          coachDecisionPriorityHistory: ['recovery'],
          activityHourDistribution: {
            morning: 3,
            afternoon: 1,
            evening: 0,
          },
          previousSnapshotScore: 70,
        },
      },
    );
    personalizationCalculatorService.calculate.mockReturnValue({
      behavioralPatterns: [
        'responds_to_streaks',
        'responds_to_goals',
        'responds_to_recovery_guidance',
        'responds_to_notifications',
        'ignores_low_priority_reminders',
        'morning_engagement',
        'high_dismissal_behavior',
        'consistent_check_in_behavior',
      ],
      formulaVersion: 'personalization-engine-v1',
    });

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(personalizationCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementScore: 80,
        notificationDismissalRate: 75,
        notificationCompletionRate: 80,
        consistencyScore: 85,
        habitTrend: 'improving',
        habitRiskLevel: 'low',
        goalTrend: 'stable',
        goalMilestoneReached: true,
        goalAchievementReached: false,
        recoveryTrend: 'stable',
        recoveryAlertEngagement: 80,
        coachDecisionPriorityHistory: ['recovery'],
        activityHourDistribution: {
          morning: 3,
          afternoon: 1,
          evening: 0,
        },
        previousSnapshotScore: 70,
      }),
    );
    expect(
      behavioralPatternRepository.replaceManyByUserProfileId,
    ).toHaveBeenCalledWith('profile_123', [
      {
        userProfileId: 'profile_123',
        type: 'responds_to_streaks',
        confidence: 'high',
        evidenceCount: 2,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
      {
        userProfileId: 'profile_123',
        type: 'responds_to_goals',
        confidence: 'high',
        evidenceCount: 1,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
      {
        userProfileId: 'profile_123',
        type: 'responds_to_recovery_guidance',
        confidence: 'high',
        evidenceCount: 1,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
      {
        userProfileId: 'profile_123',
        type: 'responds_to_notifications',
        confidence: 'high',
        evidenceCount: 2,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
      {
        userProfileId: 'profile_123',
        type: 'ignores_low_priority_reminders',
        confidence: 'high',
        evidenceCount: 1,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
      {
        userProfileId: 'profile_123',
        type: 'morning_engagement',
        confidence: 'high',
        evidenceCount: 1,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
      {
        userProfileId: 'profile_123',
        type: 'high_dismissal_behavior',
        confidence: 'high',
        evidenceCount: 1,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
      {
        userProfileId: 'profile_123',
        type: 'consistent_check_in_behavior',
        confidence: 'high',
        evidenceCount: 1,
        lastObservedAt: new Date('2026-06-02T09:30:00.000Z'),
        formulaVersion: 'personalization-engine-v1',
      },
    ]);
    expect(result.behavioralPatterns).toHaveLength(8);
    expect(result.behavioralPatterns[0].type).toBe('responds_to_streaks');
  });

  it('falls back safely when there is no latest snapshot and no patterns', async () => {
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    personalizationCalculatorService.calculate.mockReturnValue({
      behavioralPatterns: [],
      formulaVersion: 'personalization-engine-v1',
    });

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(personalizationCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementScore: 50,
        notificationDismissalRate: 0,
        notificationCompletionRate: 0,
        consistencyScore: 50,
        habitTrend: 'stable',
        habitRiskLevel: 'low',
        goalTrend: 'stable',
        goalMilestoneReached: false,
        goalAchievementReached: false,
        recoveryTrend: 'stable',
        recoveryAlertEngagement: 50,
        coachDecisionPriorityHistory: [],
        activityHourDistribution: {
          morning: 0,
          afternoon: 0,
          evening: 0,
        },
        previousSnapshotScore: 50,
      }),
    );
    expect(
      behavioralPatternRepository.replaceManyByUserProfileId,
    ).toHaveBeenCalledWith('profile_123', []);
    expect(result.behavioralPatterns).toEqual([]);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });
});
