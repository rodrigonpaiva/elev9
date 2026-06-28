import { HabitConsistencyCalculatorService } from '../../services/habit-consistency-calculator.service';
import { BuildHabitSnapshotError } from './build-habit-snapshot.errors';
import { BuildHabitSnapshotUseCase } from './build-habit-snapshot.use-case';

describe('BuildHabitSnapshotUseCase', () => {
  let useCase: BuildHabitSnapshotUseCase;

  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let fitnessProfileRepository: {
    findActiveByUserProfileId: jest.Mock;
  };
  let trainingPlanRepository: {
    findActiveByFitnessProfileId: jest.Mock;
  };
  let workoutLogRepository: {
    findByTrainingPlanIdsAndDateRange: jest.Mock;
  };
  let dailyCheckInRepository: {
    findManyByUserProfileId: jest.Mock;
  };
  let recoverySnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let goalRepository: {
    findActiveByUserProfileId: jest.Mock;
  };
  let goalProgressSnapshotRepository: {
    findLatestByGoalId: jest.Mock;
  };
  let notificationDecisionRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let getEngagementSummaryUseCase: {
    execute: jest.Mock;
  };
  let habitSnapshotRepository: {
    findManyByUserProfileId: jest.Mock;
    upsertDailySnapshot: jest.Mock;
  };
  let habitConsistencyCalculatorService: {
    calculate: jest.Mock;
  };
  let platformDateService: {
    getTodayDateString: jest.Mock;
    getDateString: jest.Mock;
  };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    fitnessProfileRepository = {
      findActiveByUserProfileId: jest.fn(),
    };
    trainingPlanRepository = {
      findActiveByFitnessProfileId: jest.fn(),
    };
    workoutLogRepository = {
      findByTrainingPlanIdsAndDateRange: jest.fn(),
    };
    dailyCheckInRepository = {
      findManyByUserProfileId: jest.fn(),
    };
    recoverySnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    goalRepository = {
      findActiveByUserProfileId: jest.fn(),
    };
    goalProgressSnapshotRepository = {
      findLatestByGoalId: jest.fn(),
    };
    notificationDecisionRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    getEngagementSummaryUseCase = {
      execute: jest.fn(),
    };
    habitSnapshotRepository = {
      findManyByUserProfileId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    };
    habitConsistencyCalculatorService = {
      calculate: jest.fn(),
    };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-06-03'),
      getDateString: jest.fn((date: Date) => date.toISOString().slice(0, 10)),
    };
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([]);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(null);
    notificationDecisionRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
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
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);

    useCase = new BuildHabitSnapshotUseCase(
      userProfileRepository as never,
      fitnessProfileRepository as never,
      trainingPlanRepository as never,
      workoutLogRepository as never,
      dailyCheckInRepository as never,
      recoverySnapshotRepository as never,
      goalRepository as never,
      goalProgressSnapshotRepository as never,
      notificationDecisionRepository as never,
      getEngagementSummaryUseCase as never,
      habitSnapshotRepository as never,
      habitConsistencyCalculatorService as never,
      platformDateService as never,
    );
  });

  it('builds a snapshot from the full signal set', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
      name: 'Avery',
    });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'fitness_profile_123',
    });
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue({
      id: 'training_plan_123',
      weeklySchedule: [1, 2, 3, 4],
    });
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      { date: '2026-06-02' },
      { date: '2026-06-03' },
    ]);
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([
      { createdAt: new Date('2026-06-02T08:00:00.000Z') },
      { createdAt: new Date('2026-06-03T08:00:00.000Z') },
    ]);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue({
      date: '2026-06-02',
      readinessScore: 72,
      fatigueScore: 28,
    });
    goalRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'goal_123',
    });
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue({
      date: '2026-06-02',
      progressPercentage: 80,
    });
    notificationDecisionRepository.findLatestByUserProfileId.mockResolvedValue({
      date: '2026-06-02',
    });
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        engagementScore: 81,
        fatigueLevel: 'medium',
        openedCount: 2,
        clickedCount: 1,
        dismissedCount: 0,
        completedCount: 0,
        recentEventsCount: 3,
      },
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([
      {
        date: '2026-06-03',
        consistencyScore: 78,
        streakDays: 3,
      },
      {
        date: '2026-06-02',
        consistencyScore: 65,
        streakDays: 2,
      },
    ]);
    habitConsistencyCalculatorService.calculate.mockReturnValue({
      consistencyScore: 84,
      trend: 'improving',
      streakDays: 2,
      longestStreak: 3,
      adherenceRate: 79,
      riskLevel: 'low',
      riskSignals: [],
      summary: {
        userProfileId: 'user_profile_123',
        score: 84,
        trend: 'improving',
        currentStreak: 2,
        longestStreak: 3,
        adherenceRate: 79,
        riskLevel: 'low',
        updatedAt: '2026-06-03T00:00:00.000Z',
        formulaVersion: 'habit-engine-v1',
      },
      formulaVersion: 'habit-engine-v1',
    });
    habitSnapshotRepository.upsertDailySnapshot.mockResolvedValue({
      id: 'habit_snapshot_123',
      userProfileId: 'user_profile_123',
      date: '2026-06-03',
      consistencyScore: 84,
      streakDays: 2,
      adherenceScore: 79,
      trend: { value: 'improving' },
      sourceContext: {
        formulaVersion: 'habit-engine-v1',
        generatedAt: '2026-06-03T12:00:00.000Z',
      },
      formulaVersion: 'habit-engine-v1',
      generatedAt: new Date('2026-06-03T12:00:00.000Z'),
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(
      workoutLogRepository.findByTrainingPlanIdsAndDateRange,
    ).toHaveBeenCalledWith({
      trainingPlanIds: ['training_plan_123'],
      startDate: '2026-05-28',
      endDate: '2026-06-03',
    });
    expect(getEngagementSummaryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(habitConsistencyCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'user_profile_123',
        workoutCompletionRate: 50,
        checkInCompletionRate: 29,
        recoveryAdherence: 72,
        goalProgressScore: 80,
        notificationEngagementScore: 81,
        consecutiveSuccessfulDays: 2,
        previousScore: 65,
      }),
    );
    expect(habitSnapshotRepository.upsertDailySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'user_profile_123',
        date: '2026-06-03',
        consistencyScore: 84,
        streakDays: 2,
        adherenceScore: 79,
        trend: 'improving',
        formulaVersion: 'habit-engine-v1',
        sourceContext: expect.objectContaining({
          workoutCompletionRate: 50,
          checkInCompletionRate: 29,
          recoveryAdherence: 72,
          goalProgressScore: 80,
          notificationEngagementScore: 81,
          recentWorkoutLogsCount: 2,
          recentCheckInsCount: 2,
          latestRecoverySnapshotDate: '2026-06-02',
          latestGoalSnapshotDate: '2026-06-02',
          latestNotificationDate: '2026-06-02',
          formulaVersion: 'habit-engine-v1',
        }),
      }),
    );
    expect(result.habitSnapshot.id).toBe('habit_snapshot_123');
  });

  it('falls back to neutral signals when upstream data is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(null);
    notificationDecisionRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
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
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);
    habitConsistencyCalculatorService.calculate.mockReturnValue({
      consistencyScore: 50,
      trend: 'stable',
      streakDays: 0,
      longestStreak: 0,
      adherenceRate: 50,
      riskLevel: 'medium',
      riskSignals: [],
      summary: {
        userProfileId: 'user_profile_123',
        score: 50,
        trend: 'stable',
        currentStreak: 0,
        longestStreak: 0,
        adherenceRate: 50,
        riskLevel: 'medium',
        updatedAt: '2026-06-03T00:00:00.000Z',
        formulaVersion: 'habit-engine-v1',
      },
      formulaVersion: 'habit-engine-v1',
    });
    habitSnapshotRepository.upsertDailySnapshot.mockResolvedValue({
      id: 'habit_snapshot_123',
      userProfileId: 'user_profile_123',
    });

    await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(habitConsistencyCalculatorService.calculate).toHaveBeenCalledWith(
      expect.objectContaining({
        workoutCompletionRate: 50,
        checkInCompletionRate: 50,
        recoveryAdherence: 50,
        goalProgressScore: 50,
        notificationEngagementScore: 50,
        consecutiveSuccessfulDays: 0,
        previousScore: undefined,
      }),
    );
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });

  it('uses the platform date service and preserves reduced source context only', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(null);
    notificationDecisionRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
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
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);
    habitConsistencyCalculatorService.calculate.mockReturnValue({
      consistencyScore: 50,
      trend: 'stable',
      streakDays: 0,
      longestStreak: 0,
      adherenceRate: 50,
      riskLevel: 'medium',
      riskSignals: [],
      summary: {
        userProfileId: 'user_profile_123',
        score: 50,
        trend: 'stable',
        currentStreak: 0,
        longestStreak: 0,
        adherenceRate: 50,
        riskLevel: 'medium',
        updatedAt: '2026-06-03T00:00:00.000Z',
        formulaVersion: 'habit-engine-v1',
      },
      formulaVersion: 'habit-engine-v1',
    });

    await useCase.execute({
      authUserId: 'auth_123',
    });

    const sourceContext =
      habitSnapshotRepository.upsertDailySnapshot.mock.calls[0][0]
        .sourceContext;

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(sourceContext).toMatchObject({
      workoutCompletionRate: 50,
      checkInCompletionRate: 50,
      recoveryAdherence: 50,
      goalProgressScore: 50,
      notificationEngagementScore: 50,
      recentWorkoutLogsCount: 0,
      recentCheckInsCount: 0,
      formulaVersion: 'habit-engine-v1',
    });
    expect(sourceContext).not.toHaveProperty('rawWorkoutLogs');
    expect(sourceContext).not.toHaveProperty('rawCheckIns');
    expect(sourceContext).not.toHaveProperty('rawNotificationHistory');
    expect(sourceContext).not.toHaveProperty('authUserId');
  });
});
