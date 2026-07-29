import { CoachIntelligenceFreshnessPolicy } from './coach-intelligence.policy';
import { CoachIntelligenceSourceAdaptersService } from './coach-intelligence.source-adapters.service';

describe('CoachIntelligenceSourceAdaptersService', () => {
  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let buildUserHealthContextService: { build: jest.Mock };
  let getCurrentCoachDecisionUseCase: { execute: jest.Mock };
  let getMyTrainingPlanUseCase: { execute: jest.Mock };
  let getCurrentAdaptiveTrainingUseCase: { execute: jest.Mock };
  let getCurrentNutritionPlanUseCase: { execute: jest.Mock };
  let getTodayNutritionUseCase: { execute: jest.Mock };
  let getNutritionRecommendationsUseCase: { execute: jest.Mock };
  let nutritionLogRepository: { findByUserProfileIdAndDate: jest.Mock };
  let getCurrentRecoveryUseCase: { execute: jest.Mock };
  let getRecoveryHistoryUseCase: { execute: jest.Mock };
  let getCurrentGoalUseCase: { execute: jest.Mock };
  let getGoalHistoryUseCase: { execute: jest.Mock };
  let getGoalMilestonesUseCase: { execute: jest.Mock };
  let getGoalAchievementHistoryUseCase: { execute: jest.Mock };
  let getCurrentHabitsUseCase: { execute: jest.Mock };
  let getHabitHistoryUseCase: { execute: jest.Mock };
  let getConsistencySummaryUseCase: { execute: jest.Mock };
  let getHabitRiskSignalsUseCase: { execute: jest.Mock };
  let getCurrentPersonalizationUseCase: { execute: jest.Mock };
  let getUserBehaviorProfileUseCase: { execute: jest.Mock };
  let getBehavioralPatternsUseCase: { execute: jest.Mock };
  let getCurrentNotificationUseCase: { execute: jest.Mock };
  let getEngagementSummaryUseCase: { execute: jest.Mock };
  let getProgressSummaryUseCase: { execute: jest.Mock };
  let getDailyCheckInHistoryUseCase: { execute: jest.Mock };
  let getWorkoutHistoryUseCase: { execute: jest.Mock };
  let platformDateService: { getTodayDateString: jest.Mock };
  let service: CoachIntelligenceSourceAdaptersService;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    buildUserHealthContextService = {
      build: jest.fn(),
    };
    getCurrentCoachDecisionUseCase = {
      execute: jest.fn(),
    };
    getMyTrainingPlanUseCase = {
      execute: jest.fn(),
    };
    getCurrentAdaptiveTrainingUseCase = {
      execute: jest.fn(),
    };
    getCurrentNutritionPlanUseCase = {
      execute: jest.fn(),
    };
    getTodayNutritionUseCase = {
      execute: jest.fn(),
    };
    const nutritionContextPort = {
      execute: jest.fn().mockResolvedValue({
        todayNutrition: null,
        availability: 'not_available',
      }),
    };
    getNutritionRecommendationsUseCase = {
      execute: jest.fn(),
    };
    nutritionLogRepository = {
      findByUserProfileIdAndDate: jest.fn(),
    };
    getCurrentRecoveryUseCase = {
      execute: jest.fn(),
    };
    getRecoveryHistoryUseCase = {
      execute: jest.fn(),
    };
    getCurrentGoalUseCase = {
      execute: jest.fn(),
    };
    getGoalHistoryUseCase = {
      execute: jest.fn(),
    };
    getGoalMilestonesUseCase = {
      execute: jest.fn(),
    };
    getGoalAchievementHistoryUseCase = {
      execute: jest.fn(),
    };
    getCurrentHabitsUseCase = {
      execute: jest.fn(),
    };
    getHabitHistoryUseCase = {
      execute: jest.fn(),
    };
    getConsistencySummaryUseCase = {
      execute: jest.fn(),
    };
    getHabitRiskSignalsUseCase = {
      execute: jest.fn(),
    };
    getCurrentPersonalizationUseCase = {
      execute: jest.fn(),
    };
    getUserBehaviorProfileUseCase = {
      execute: jest.fn(),
    };
    getBehavioralPatternsUseCase = {
      execute: jest.fn(),
    };
    getCurrentNotificationUseCase = {
      execute: jest.fn(),
    };
    getEngagementSummaryUseCase = {
      execute: jest.fn(),
    };
    getProgressSummaryUseCase = {
      execute: jest.fn(),
    };
    getDailyCheckInHistoryUseCase = {
      execute: jest.fn(),
    };
    getWorkoutHistoryUseCase = {
      execute: jest.fn(),
    };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-07-13'),
    };

    service = new CoachIntelligenceSourceAdaptersService(
      userProfileRepository as never,
      buildUserHealthContextService as never,
      getCurrentCoachDecisionUseCase as never,
      getMyTrainingPlanUseCase as never,
      getCurrentAdaptiveTrainingUseCase as never,
      nutritionContextPort as never,
      getCurrentRecoveryUseCase as never,
      getRecoveryHistoryUseCase as never,
      getCurrentGoalUseCase as never,
      getGoalHistoryUseCase as never,
      getGoalMilestonesUseCase as never,
      getGoalAchievementHistoryUseCase as never,
      getCurrentHabitsUseCase as never,
      getHabitHistoryUseCase as never,
      getConsistencySummaryUseCase as never,
      getHabitRiskSignalsUseCase as never,
      getCurrentPersonalizationUseCase as never,
      getUserBehaviorProfileUseCase as never,
      getBehavioralPatternsUseCase as never,
      getCurrentNotificationUseCase as never,
      getEngagementSummaryUseCase as never,
      getProgressSummaryUseCase as never,
      getDailyCheckInHistoryUseCase as never,
      getWorkoutHistoryUseCase as never,
      new CoachIntelligenceFreshnessPolicy(),
      platformDateService as never,
    );
  });

  it('resolves the authenticated user profile deterministically', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
      name: 'Ada',
    });

    await expect(
      service.resolveUserProfile({
        authUserId: 'auth_123',
      }),
    ).resolves.toEqual({
      id: 'profile_123',
      name: 'Ada',
    });
  });

  it('rejects a mismatched explicit user profile identifier', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });

    await expect(
      service.resolveUserProfile({
        authUserId: 'auth_123',
        userProfileId: 'profile_999',
      }),
    ).rejects.toMatchObject({
      code: 'COACH_INTELLIGENCE_INVALID_SESSION',
    });
  });

  it('loads aggregate source context and preserves section availability', async () => {
    mockSourceDependencies();
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
      name: 'Ada',
    });
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext(),
    );

    const result = await service.load({
      authUserId: 'auth_123',
      generatedAt: '2026-07-13T00:00:00.000Z',
      userProfile: {
        id: 'profile_123',
        name: 'Ada',
      },
    });

    expect(result.userProfileId).toBe('profile_123');
    expect(result.sections.training.availability.status).toBe('available');
    expect(result.sections.progress.availability.status).toBe('available');
    expect(result.selectedDomains).toEqual([
      'training',
      'nutrition',
      'recovery',
      'goals',
      'habits',
      'progress',
      'personalization',
      'notifications',
    ]);
    expect(result.expertContext).toEqual(
      expect.objectContaining({
        userProfileId: 'profile_123',
        habit: expect.any(Object),
        goalContext: expect.any(Object),
        progress: expect.any(Object),
      }),
    );
    expect(
      getMyTrainingPlanUseCase.execute,
    ).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
  });

  function mockSourceDependencies(): void {
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: undefined,
    });
    getMyTrainingPlanUseCase.execute.mockResolvedValue({
      trainingPlan: {
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: {
        createdAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getCurrentNutritionPlanUseCase.execute.mockResolvedValue({
      nutritionPlan: {
        createdAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getTodayNutritionUseCase.execute.mockResolvedValue({
      todayNutrition: {
        date: '2026-07-13',
      },
    });
    getNutritionRecommendationsUseCase.execute.mockResolvedValue({
      recommendations: [
        {
          createdAt: '2026-07-13T00:00:00.000Z',
          updatedAt: '2026-07-13T00:00:00.000Z',
        },
      ],
    });
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([]);
    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: {
        createdAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getRecoveryHistoryUseCase.execute.mockResolvedValue({
      recoverySnapshots: [
        {
          createdAt: '2026-07-12T00:00:00.000Z',
        },
      ],
    });
    getCurrentGoalUseCase.execute.mockResolvedValue({
      goal: {
        createdAt: '2026-07-10T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
      progressSnapshot: {
        formulaVersion: 'goal-v1',
      },
      forecast: {
        generatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getGoalHistoryUseCase.execute.mockResolvedValue({
      goalProgressSnapshots: [],
    });
    getGoalMilestonesUseCase.execute.mockResolvedValue({
      goalMilestones: [],
    });
    getGoalAchievementHistoryUseCase.execute.mockResolvedValue({
      goalAchievements: [],
    });
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: {
        generatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getHabitHistoryUseCase.execute.mockResolvedValue({
      habitSnapshots: [],
    });
    getConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: {
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [],
    });
    getCurrentPersonalizationUseCase.execute.mockResolvedValue({
      personalizationSnapshot: {
        generatedAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getUserBehaviorProfileUseCase.execute.mockResolvedValue({
      userBehaviorProfile: {
        createdAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getBehavioralPatternsUseCase.execute.mockResolvedValue({
      behavioralPatterns: [],
    });
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: {
        createdAt: '2026-07-13T00:00:00.000Z',
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        updatedAt: '2026-07-13T00:00:00.000Z',
      },
    });
    getProgressSummaryUseCase.execute.mockResolvedValue({
      summary: {
        lastWorkoutDate: '2026-07-12',
      },
    });
    getDailyCheckInHistoryUseCase.execute.mockResolvedValue({
      dailyCheckIns: [
        {
          createdAt: '2026-07-13T00:00:00.000Z',
          energyLevel: 3,
          sleepQuality: 3,
          muscleSoreness: 1,
          motivationLevel: 4,
        },
      ],
    });
    getWorkoutHistoryUseCase.execute.mockResolvedValue({
      workoutLogs: [],
    });
  }
});

function buildHealthContext(): Record<string, unknown> {
  return {
    generatedAt: '2026-07-13T00:00:00.000Z',
    goal: 'fat_loss',
    activityLevel: 'moderate',
    weeklyFrequency: 4,
    adherenceScore: 82,
    currentStreak: 6,
    averageWorkoutDuration: 45,
    fatigueLevel: 'medium',
    availableEquipment: [],
    limitations: [],
    todayWorkout: undefined,
    activeTrainingPlanId: 'plan_123',
    latestCheckIn: {
      createdAt: '2026-07-13T00:00:00.000Z',
    },
    recoverySnapshot: {
      createdAt: '2026-07-13T00:00:00.000Z',
    },
    adaptiveTrainingRecommendation: {
      createdAt: '2026-07-13T00:00:00.000Z',
    },
    adaptiveRecommendationType: 'build',
    adaptiveRecommendedIntensity: 'moderate',
    adaptiveVolumeAction: 'maintain',
    adaptiveTrainingInfluences: [],
    adaptiveTrainingReasoning: [],
    readinessScore: 72,
    fatigueScore: 28,
    recoveryInfluences: [],
    recoveryTrend: 'stable',
    recommendedIntensity: 'moderate',
    nutritionProfile: {
      createdAt: '2026-07-13T00:00:00.000Z',
    },
    recentWorkoutLogs: [],
  };
}
