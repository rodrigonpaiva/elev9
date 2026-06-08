import { BuildUserHealthContextService } from '../../../../ai/application/services/context-builder/build-user-health-context.service';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { DailyCheckIn } from '../../../../progress/domain/entities/daily-check-in.entity';
import { DailyCheckInRepository } from '../../../../progress/domain/repositories/daily-check-in.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { DashboardAdaptiveSignalsService } from '../../services/dashboard-adaptive-signals/dashboard-adaptive-signals.service';
import { GetHomeDashboardDebugUseCase } from './get-home-dashboard-debug.use-case';

describe('GetHomeDashboardDebugUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService['build']>;
  };
  let getCurrentGoalUseCase: {
    execute: jest.MockedFunction<GetCurrentGoalUseCase['execute']>;
  };
  let getGoalMilestonesUseCase: {
    execute: jest.MockedFunction<GetGoalMilestonesUseCase['execute']>;
  };
  let getCurrentNotificationUseCase: {
    execute: jest.MockedFunction<GetCurrentNotificationUseCase['execute']>;
  };
  let getEngagementSummaryUseCase: {
    execute: jest.MockedFunction<GetEngagementSummaryUseCase['execute']>;
  };
  let getCurrentHabitsUseCase: {
    execute: jest.MockedFunction<GetCurrentHabitsUseCase['execute']>;
  };
  let getConsistencySummaryUseCase: {
    execute: jest.MockedFunction<GetConsistencySummaryUseCase['execute']>;
  };
  let getHabitRiskSignalsUseCase: {
    execute: jest.MockedFunction<GetHabitRiskSignalsUseCase['execute']>;
  };
  let dashboardAdaptiveSignalsService: DashboardAdaptiveSignalsService;
  let useCase: GetHomeDashboardDebugUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    dailyCheckInRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn().mockResolvedValue([]),
    };
    buildUserHealthContextService = {
      build: jest.fn().mockResolvedValue({
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        userName: 'Rodrigo Paiva',
        goal: 'gain_muscle',
        activityLevel: 'high',
        weeklyFrequency: 4,
        adherenceScore: 0,
        currentStreak: 0,
        averageWorkoutDuration: 0,
        fatigueLevel: 'HIGH',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        recentWorkoutLogs: [],
        generatedAt: new Date('2026-04-30T10:00:00.000Z'),
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 3,
          createdAt: new Date('2026-04-30T09:00:00.000Z'),
        },
      }),
    };
    getCurrentGoalUseCase = {
      execute: jest.fn(),
    };
    getGoalMilestonesUseCase = {
      execute: jest.fn(),
    };
    getCurrentNotificationUseCase = {
      execute: jest.fn().mockResolvedValue({
        notificationDecision: undefined,
      }),
    };
    getEngagementSummaryUseCase = {
      execute: jest.fn().mockResolvedValue({
        engagementSummary: undefined,
      }),
    };
    getCurrentHabitsUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    };
    getConsistencySummaryUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    };
    getHabitRiskSignalsUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    };
    dashboardAdaptiveSignalsService = new DashboardAdaptiveSignalsService();

    useCase = new GetHomeDashboardDebugUseCase(
      userProfileRepository,
      dailyCheckInRepository,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      getCurrentGoalUseCase as unknown as GetCurrentGoalUseCase,
      getGoalMilestonesUseCase as unknown as GetGoalMilestonesUseCase,
      getCurrentNotificationUseCase as unknown as GetCurrentNotificationUseCase,
      getEngagementSummaryUseCase as unknown as GetEngagementSummaryUseCase,
      getCurrentHabitsUseCase as unknown as GetCurrentHabitsUseCase,
      getConsistencySummaryUseCase as unknown as GetConsistencySummaryUseCase,
      getHabitRiskSignalsUseCase as unknown as GetHabitRiskSignalsUseCase,
      dashboardAdaptiveSignalsService,
    );
  });

  function mockUserProfile(): void {
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

  function mockDailyCheckInHistory(): void {
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([
      new DailyCheckIn({
        id: 'check_in_1',
        userProfileId: 'profile_123',
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: new Date('2026-04-30T09:00:00.000Z'),
        updatedAt: new Date('2026-04-30T09:00:00.000Z'),
      }),
      new DailyCheckIn({
        id: 'check_in_2',
        userProfileId: 'profile_123',
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: new Date('2026-04-29T09:00:00.000Z'),
        updatedAt: new Date('2026-04-29T09:00:00.000Z'),
      }),
      new DailyCheckIn({
        id: 'check_in_3',
        userProfileId: 'profile_123',
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 2,
        createdAt: new Date('2026-04-28T09:00:00.000Z'),
        updatedAt: new Date('2026-04-28T09:00:00.000Z'),
      }),
    ]);
  }

  it('returns the adaptive debug snapshot', async () => {
    mockUserProfile();
    mockDailyCheckInHistory();
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      userName: 'Rodrigo Paiva',
      goal: 'gain_muscle',
      activityLevel: 'high',
      weeklyFrequency: 4,
      adherenceScore: 0,
      currentStreak: 0,
      averageWorkoutDuration: 0,
      fatigueLevel: 'HIGH',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: new Date('2026-04-30T09:00:00.000Z'),
      },
      adaptiveTrainingRecommendation: {
        recommendationType: 'decrease_intensity',
        recommendedIntensity: 'light',
        volumeAction: 'decrease',
        reasoning: 'Dial back intensity while recovery is low.',
        influences: [
          {
            code: 'HIGH_FATIGUE',
            label: 'Fatigue is elevated.',
            impact: 'negative',
          },
        ],
      },
    } as never);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).resolves.toEqual({
      generatedAt: '2026-04-30T10:00:00.000Z',
      recovery: {
        fatigueLevel: 'HIGH',
        recoveryTrend: 'improving',
        recoverySignals: [
          'high_fatigue',
          'poor_sleep',
          'high_soreness',
          'improving_recovery',
        ],
        readinessScore: undefined,
        fatigueScore: undefined,
        recoveryInfluences: undefined,
      },
      adaptiveTrainingRecommendation: {
        recommendationType: 'decrease_intensity',
        recommendedIntensity: 'light',
        volumeAction: 'decrease',
        reasoning: 'Dial back intensity while recovery is low.',
        influences: [
          {
            code: 'HIGH_FATIGUE',
            label: 'Fatigue is elevated.',
            impact: 'negative',
          },
        ],
      },
      nutrition: {
        priority: 'recovery',
        signals: ['high_fatigue', 'poor_sleep', 'high_soreness'],
      },
    });
  });

  it('includes habit debug payload when habit reads are available', async () => {
    mockUserProfile();
    mockDailyCheckInHistory();
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: {
        userProfileId: 'profile_123',
        date: '2026-04-30',
        consistencyScore: 78,
        streakDays: 5,
        adherenceScore: 82,
        trend: 'improving',
        sourceContext: {
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-04-30T10:00:00.000Z',
        },
        formulaVersion: 'habit-engine-v1',
        generatedAt: '2026-04-30T10:00:00.000Z',
      } as never,
    });
    getConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: {
        userProfileId: 'profile_123',
        score: 78,
        trend: 'improving',
        currentStreak: 5,
        longestStreak: 7,
        adherenceRate: 82,
        riskLevel: 'low',
        updatedAt: '2026-04-30T10:00:00.000Z',
        formulaVersion: 'habit-engine-v1',
      } as never,
    });
    getHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [
        {
          userProfileId: 'profile_123',
          type: 'streak_at_risk',
          level: 'medium',
          title: 'Streak at risk',
          description: 'Consistency is still healthy, but watch the rhythm.',
          generatedAt: '2026-04-30T10:00:00.000Z',
          formulaVersion: 'habit-engine-v1',
        } as never,
      ],
    });

    const snapshot = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(snapshot.habits).toEqual(
      expect.objectContaining({
        current: expect.objectContaining({
          consistencyScore: 78,
        }),
        summary: expect.objectContaining({
          score: 78,
        }),
        riskSignals: expect.arrayContaining([
          expect.objectContaining({
            type: 'streak_at_risk',
          }),
        ]),
      }),
    );
  });
});
