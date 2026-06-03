import { BuildUserHealthContextService } from '../../../../ai/application/services/context-builder/build-user-health-context.service';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
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
    dashboardAdaptiveSignalsService = new DashboardAdaptiveSignalsService();

    useCase = new GetHomeDashboardDebugUseCase(
      userProfileRepository,
      dailyCheckInRepository,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      getCurrentGoalUseCase as unknown as GetCurrentGoalUseCase,
      getGoalMilestonesUseCase as unknown as GetGoalMilestonesUseCase,
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
});
