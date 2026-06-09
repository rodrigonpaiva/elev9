import { BuildPersonalizationSnapshotError } from './build-personalization-snapshot.errors';
import { BuildPersonalizationSnapshotUseCase } from './build-personalization-snapshot.use-case';

describe('BuildPersonalizationSnapshotUseCase', () => {
  let useCase: BuildPersonalizationSnapshotUseCase;

  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let notificationDecisionRepository: {
    findManyByUserProfileId: jest.Mock;
  };
  let habitSnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let consistencySummaryRepository: {
    findByUserProfileId: jest.Mock;
  };
  let habitRiskSignalRepository: {
    findManyByUserProfileId: jest.Mock;
  };
  let goalRepository: {
    findActiveByUserProfileId: jest.Mock;
  };
  let goalProgressSnapshotRepository: {
    findLatestByGoalId: jest.Mock;
  };
  let goalMilestoneRepository: {
    findManyByGoalId: jest.Mock;
  };
  let goalAchievementRepository: {
    findManyByUserProfileId: jest.Mock;
  };
  let recoverySnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let coachDecisionRepository: {
    findRecentByUserProfileId: jest.Mock;
  };
  let getEngagementSummaryUseCase: {
    execute: jest.Mock;
  };
  let personalizationSnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
    upsertDailySnapshot: jest.Mock;
  };
  let personalizationCalculatorService: {
    calculate: jest.Mock;
  };
  let platformDateService: {
    getTodayDateString: jest.Mock;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-03T12:00:00.000Z'));

    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    notificationDecisionRepository = {
      findManyByUserProfileId: jest.fn(),
    };
    habitSnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    consistencySummaryRepository = {
      findByUserProfileId: jest.fn(),
    };
    habitRiskSignalRepository = {
      findManyByUserProfileId: jest.fn(),
    };
    goalRepository = {
      findActiveByUserProfileId: jest.fn(),
    };
    goalProgressSnapshotRepository = {
      findLatestByGoalId: jest.fn(),
    };
    goalMilestoneRepository = {
      findManyByGoalId: jest.fn(),
    };
    goalAchievementRepository = {
      findManyByUserProfileId: jest.fn(),
    };
    recoverySnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    coachDecisionRepository = {
      findRecentByUserProfileId: jest.fn(),
    };
    getEngagementSummaryUseCase = {
      execute: jest.fn(),
    };
    personalizationSnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    };
    personalizationCalculatorService = {
      calculate: jest.fn(),
    };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-06-03'),
    };

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    habitSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(null);
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue(null);
    habitRiskSignalRepository.findManyByUserProfileId.mockResolvedValue([]);
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(null);
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([]);
    goalAchievementRepository.findManyByUserProfileId.mockResolvedValue([]);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(null);
    coachDecisionRepository.findRecentByUserProfileId.mockResolvedValue([]);
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        engagementScore: 50,
        fatigueLevel: 'low',
        openedCount: 0,
        clickedCount: 0,
        dismissedCount: 0,
        completedCount: 0,
        recentEventsCount: 0,
      },
    });
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    personalizationSnapshotRepository.upsertDailySnapshot.mockResolvedValue({
      id: 'snapshot_123',
      userProfileId: 'profile_123',
      date: '2026-06-03',
      preferredCoachingStyle: { value: 'balanced' },
      engagementProfile: { value: 'medium' },
      notificationResponsiveness: { value: 'medium' },
      goalResponsiveness: { value: 'medium' },
      recoveryResponsiveness: { value: 'medium' },
      habitResponsiveness: { value: 'medium' },
      riskOfDisengagement: { value: 'medium' },
      trend: { value: 'stable' },
      sourceContext: {
        formulaVersion: 'personalization-engine-v1',
        generatedAt: '2026-06-03T12:00:00.000Z',
      },
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-06-03T12:00:00.000Z',
    });
    personalizationCalculatorService.calculate.mockReturnValue({
      preferredCoachingStyle: 'balanced',
      engagementProfile: 'medium',
      notificationResponsiveness: 'medium',
      goalResponsiveness: 'medium',
      recoveryResponsiveness: 'medium',
      habitResponsiveness: 'medium',
      riskOfDisengagement: 'medium',
      behavioralPatterns: [],
      trend: 'stable',
      compositeScore: 50,
      formulaVersion: 'personalization-engine-v1',
    });

    useCase = new BuildPersonalizationSnapshotUseCase(
      userProfileRepository as never,
      notificationDecisionRepository as never,
      habitSnapshotRepository as never,
      consistencySummaryRepository as never,
      habitRiskSignalRepository as never,
      goalRepository as never,
      goalProgressSnapshotRepository as never,
      goalMilestoneRepository as never,
      goalAchievementRepository as never,
      recoverySnapshotRepository as never,
      coachDecisionRepository as never,
      getEngagementSummaryUseCase as never,
      personalizationSnapshotRepository as never,
      personalizationCalculatorService as never,
      platformDateService as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a snapshot from the full signal set', async () => {
    habitSnapshotRepository.findLatestByUserProfileId.mockResolvedValue({
      consistencyScore: 78,
      trend: { value: 'improving' },
      sourceContext: {
        formulaVersion: 'habit-engine-v1',
        generatedAt: '2026-06-02T12:00:00.000Z',
        consistencyScore: 78,
        habitTrend: 'improving',
        habitRiskLevel: 'medium',
      },
    });
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue({
      score: 80,
      trend: { value: 'improving' },
      riskLevel: { value: 'medium' },
    });
    habitRiskSignalRepository.findManyByUserProfileId.mockResolvedValue([
      { level: { value: 'medium' } },
      { level: { value: 'high' } },
    ]);
    goalRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'goal_123',
      status: { value: 'active' },
    });
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue({
      trend: { value: 'declining' },
      progressPercentage: 88,
    });
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([
      { achieved: true },
      { achieved: false },
    ]);
    goalAchievementRepository.findManyByUserProfileId.mockResolvedValue([
      { achievedAt: '2026-06-02T00:00:00.000Z' },
    ]);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue({
      recoveryTrend: 'improving',
      sourceContext: {
        adherenceScore: 75,
      },
    });
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue([
      { createdAt: new Date('2026-06-03T08:15:00.000Z') },
      { createdAt: new Date('2026-06-03T14:30:00.000Z') },
      { createdAt: new Date('2026-06-03T20:45:00.000Z') },
    ]);
    coachDecisionRepository.findRecentByUserProfileId.mockResolvedValue([
      { priority: { value: 'recovery' } },
      { priority: { value: 'consistency' } },
      { priority: { value: 'motivation' } },
    ]);
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      {
        sourceContext: {
          engagementScore: 70,
          notificationDismissalRate: 10,
          notificationCompletionRate: 40,
          consistencyScore: 70,
          habitTrend: 'stable',
          habitRiskLevel: 'low',
          goalTrend: 'stable',
          goalMilestoneReached: false,
          goalAchievementReached: false,
          recoveryTrend: 'stable',
          recoveryAlertEngagement: 50,
          coachDecisionPriorityHistory: [],
          activityHourDistribution: { morning: 0, afternoon: 0, evening: 0 },
          previousSnapshotScore: 50,
          formulaVersion: 'personalization-engine-v1',
          generatedAt: '2026-06-02T12:00:00.000Z',
        },
      },
    );
    personalizationCalculatorService.calculate
      .mockReturnValueOnce({
        compositeScore: 66,
        preferredCoachingStyle: 'balanced',
        engagementProfile: 'medium',
        notificationResponsiveness: 'medium',
        goalResponsiveness: 'medium',
        recoveryResponsiveness: 'medium',
        habitResponsiveness: 'medium',
        riskOfDisengagement: 'medium',
        behavioralPatterns: [],
        trend: 'stable',
        formulaVersion: 'personalization-engine-v1',
      })
      .mockReturnValue({
        preferredCoachingStyle: 'motivational',
        engagementProfile: 'high',
        notificationResponsiveness: 'high',
        goalResponsiveness: 'medium',
        recoveryResponsiveness: 'high',
        habitResponsiveness: 'medium',
        riskOfDisengagement: 'low',
        behavioralPatterns: [],
        trend: 'improving',
        compositeScore: 82,
        formulaVersion: 'personalization-engine-v1',
      });
    personalizationSnapshotRepository.upsertDailySnapshot.mockResolvedValue({
      id: 'snapshot_123',
      userProfileId: 'profile_123',
      date: '2026-06-03',
      preferredCoachingStyle: { value: 'motivational' },
      engagementProfile: { value: 'high' },
      notificationResponsiveness: { value: 'high' },
      goalResponsiveness: { value: 'medium' },
      recoveryResponsiveness: { value: 'high' },
      habitResponsiveness: { value: 'medium' },
      riskOfDisengagement: { value: 'low' },
      trend: { value: 'improving' },
      sourceContext: {
        formulaVersion: 'personalization-engine-v1',
        generatedAt: '2026-06-03T12:00:00.000Z',
      },
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-06-03T12:00:00.000Z',
    });

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(getEngagementSummaryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(personalizationCalculatorService.calculate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        engagementScore: 70,
        notificationDismissalRate: 10,
        notificationCompletionRate: 40,
        consistencyScore: 70,
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
    expect(personalizationCalculatorService.calculate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        engagementScore: 50,
        notificationDismissalRate: 0,
        notificationCompletionRate: 0,
        consistencyScore: 78,
        habitTrend: 'improving',
        habitRiskLevel: 'medium',
        goalTrend: 'declining',
        goalMilestoneReached: true,
        goalAchievementReached: true,
        recoveryTrend: 'improving',
        recoveryAlertEngagement: 75,
        coachDecisionPriorityHistory: ['recovery', 'consistency', 'motivation'],
        activityHourDistribution: {
          morning: 1,
          afternoon: 1,
          evening: 1,
        },
        previousSnapshotScore: 66,
      }),
    );

    expect(personalizationSnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        date: '2026-06-03',
        preferredCoachingStyle: 'motivational',
        engagementProfile: 'high',
        notificationResponsiveness: 'high',
        goalResponsiveness: 'medium',
        recoveryResponsiveness: 'high',
        habitResponsiveness: 'medium',
        riskOfDisengagement: 'low',
        trend: 'improving',
        formulaVersion: 'personalization-engine-v1',
        generatedAt: '2026-06-03T12:00:00.000Z',
        sourceContext: expect.objectContaining({
          engagementScore: 50,
          notificationDismissalRate: 0,
          notificationCompletionRate: 0,
          consistencyScore: 78,
          habitTrend: 'improving',
          habitRiskLevel: 'medium',
          goalTrend: 'declining',
          goalMilestoneReached: true,
          goalAchievementReached: true,
          recoveryTrend: 'improving',
          recoveryAlertEngagement: 75,
          coachDecisionPriorityHistory: ['recovery', 'consistency', 'motivation'],
          activityHourDistribution: {
            morning: 1,
            afternoon: 1,
            evening: 1,
          },
          previousSnapshotScore: 66,
          formulaVersion: 'personalization-engine-v1',
          generatedAt: '2026-06-03T12:00:00.000Z',
        }),
      }),
    );
    expect(result.personalizationSnapshot.id).toBe('snapshot_123');
    expect(Object.keys(result.personalizationSnapshot.sourceContext)).not.toEqual(
      expect.arrayContaining(['goal', 'habitSnapshot', 'recoverySnapshot', 'coachDecision', 'notificationHistory']),
    );
  });

  it('builds a snapshot with neutral fallbacks', async () => {
    const calculatorResult = {
      preferredCoachingStyle: 'balanced',
      engagementProfile: 'medium',
      notificationResponsiveness: 'medium',
      goalResponsiveness: 'medium',
      recoveryResponsiveness: 'medium',
      habitResponsiveness: 'medium',
      riskOfDisengagement: 'medium',
      behavioralPatterns: [],
      trend: 'stable',
      compositeScore: 50,
      formulaVersion: 'personalization-engine-v1',
    };
    personalizationCalculatorService.calculate.mockReturnValue(calculatorResult);

    const result = await useCase.execute({ authUserId: 'auth_123' });

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
      personalizationSnapshotRepository.upsertDailySnapshot.mock.calls[0][0].sourceContext,
    ).toMatchObject({
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
      formulaVersion: 'personalization-engine-v1',
    });
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });

  it('uses PlatformDateService', async () => {
    await useCase.execute({ authUserId: 'auth_123' });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
  });

  it('does not leak raw upstream context into persisted sourceContext', async () => {
    await useCase.execute({ authUserId: 'auth_123' });

    const sourceContext =
      personalizationSnapshotRepository.upsertDailySnapshot.mock.calls[0][0]
        .sourceContext;

    expect(sourceContext).not.toHaveProperty('notificationHistory');
    expect(sourceContext).not.toHaveProperty('habitSnapshot');
    expect(sourceContext).not.toHaveProperty('goal');
    expect(sourceContext).not.toHaveProperty('recoverySnapshot');
    expect(sourceContext).not.toHaveProperty('coachDecision');
    expect(sourceContext).not.toHaveProperty('rawEngagementEvents');
  });
});
