import { CreateCoachChatError } from '../../use-cases/create-coach-chat/create-coach-chat.errors';
import { CoachChatContextLoaderService } from './coach-chat-context-loader.service';
import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-history/get-goal-history.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetGoalAchievementHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-achievement-history/get-goal-achievement-history.use-case';
import { GetCurrentCoachDecisionUseCase } from '../../use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetRecoveryHistoryUseCase } from '../../../../recovery/application/use-cases/get-recovery-history/get-recovery-history.use-case';
import { GetDailyCheckInHistoryUseCase } from '../../../../progress/application/use-cases/get-daily-check-in-history/get-daily-check-in-history.use-case';
import { GetWorkoutHistoryUseCase } from '../../../../progress/application/use-cases/get-workout-history/get-workout-history.use-case';
import { GetProgressSummaryUseCase } from '../../../../progress/application/use-cases/get-progress-summary/get-progress-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetHabitHistoryUseCase } from '../../../../habits/application/use-cases/get-habit-history/get-habit-history.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetCurrentNutritionPlanUseCase } from '../../../../nutrition/application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.use-case';
import { GetTodayNutritionUseCase } from '../../../../nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { NutritionLogRepository } from '../../../../nutrition/domain/repositories/nutrition-log.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('CoachChatContextLoaderService', () => {
  let userProfileRepository: {
    findByAuthUserId: jest.MockedFunction<
      UserProfileRepository['findByAuthUserId']
    >;
  };
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService['build']>;
  };
  let getCurrentGoalUseCase: {
    execute: jest.MockedFunction<GetCurrentGoalUseCase['execute']>;
  };
  let getGoalHistoryUseCase: {
    execute: jest.MockedFunction<GetGoalHistoryUseCase['execute']>;
  };
  let getGoalMilestonesUseCase: {
    execute: jest.MockedFunction<GetGoalMilestonesUseCase['execute']>;
  };
  let getGoalAchievementHistoryUseCase: {
    execute: jest.MockedFunction<GetGoalAchievementHistoryUseCase['execute']>;
  };
  let getCurrentCoachDecisionUseCase: {
    execute: jest.MockedFunction<GetCurrentCoachDecisionUseCase['execute']>;
  };
  let getRecoveryHistoryUseCase: {
    execute: jest.MockedFunction<GetRecoveryHistoryUseCase['execute']>;
  };
  let getDailyCheckInHistoryUseCase: {
    execute: jest.MockedFunction<GetDailyCheckInHistoryUseCase['execute']>;
  };
  let getWorkoutHistoryUseCase: {
    execute: jest.MockedFunction<GetWorkoutHistoryUseCase['execute']>;
  };
  let getProgressSummaryUseCase: {
    execute: jest.MockedFunction<GetProgressSummaryUseCase['execute']>;
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
  let getHabitHistoryUseCase: {
    execute: jest.MockedFunction<GetHabitHistoryUseCase['execute']>;
  };
  let getConsistencySummaryUseCase: {
    execute: jest.MockedFunction<GetConsistencySummaryUseCase['execute']>;
  };
  let getHabitRiskSignalsUseCase: {
    execute: jest.MockedFunction<GetHabitRiskSignalsUseCase['execute']>;
  };
  let getCurrentPersonalizationUseCase: {
    execute: jest.MockedFunction<GetCurrentPersonalizationUseCase['execute']>;
  };
  let getUserBehaviorProfileUseCase: {
    execute: jest.MockedFunction<GetUserBehaviorProfileUseCase['execute']>;
  };
  let getBehavioralPatternsUseCase: {
    execute: jest.MockedFunction<GetBehavioralPatternsUseCase['execute']>;
  };
  let getCurrentNutritionPlanUseCase: {
    execute: jest.MockedFunction<GetCurrentNutritionPlanUseCase['execute']>;
  };
  let getTodayNutritionUseCase: {
    execute: jest.MockedFunction<GetTodayNutritionUseCase['execute']>;
  };
  let nutritionLogRepository: {
    findByUserProfileIdAndDate: jest.MockedFunction<
      NutritionLogRepository['findByUserProfileIdAndDate']
    >;
  };
  let service: CoachChatContextLoaderService;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    buildUserHealthContextService = {
      build: jest.fn(),
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
    getCurrentCoachDecisionUseCase = {
      execute: jest.fn(),
    };
    getRecoveryHistoryUseCase = {
      execute: jest.fn(),
    };
    getDailyCheckInHistoryUseCase = {
      execute: jest.fn(),
    };
    getWorkoutHistoryUseCase = {
      execute: jest.fn(),
    };
    getProgressSummaryUseCase = {
      execute: jest.fn(),
    };
    getCurrentNotificationUseCase = {
      execute: jest.fn(),
    };
    getEngagementSummaryUseCase = {
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
    getCurrentNutritionPlanUseCase = {
      execute: jest.fn(),
    };
    getTodayNutritionUseCase = {
      execute: jest.fn(),
    };
    nutritionLogRepository = {
      findByUserProfileIdAndDate: jest.fn(),
    };

    service = new CoachChatContextLoaderService(
      userProfileRepository as unknown as UserProfileRepository,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      getCurrentGoalUseCase as unknown as GetCurrentGoalUseCase,
      getGoalHistoryUseCase as unknown as GetGoalHistoryUseCase,
      getGoalMilestonesUseCase as unknown as GetGoalMilestonesUseCase,
      getGoalAchievementHistoryUseCase as unknown as GetGoalAchievementHistoryUseCase,
      getCurrentCoachDecisionUseCase as unknown as GetCurrentCoachDecisionUseCase,
      getRecoveryHistoryUseCase as unknown as GetRecoveryHistoryUseCase,
      getCurrentNotificationUseCase as unknown as GetCurrentNotificationUseCase,
      getEngagementSummaryUseCase as unknown as GetEngagementSummaryUseCase,
      getCurrentHabitsUseCase as unknown as GetCurrentHabitsUseCase,
      getHabitHistoryUseCase as unknown as GetHabitHistoryUseCase,
      getConsistencySummaryUseCase as unknown as GetConsistencySummaryUseCase,
      getHabitRiskSignalsUseCase as unknown as GetHabitRiskSignalsUseCase,
      getCurrentPersonalizationUseCase as unknown as GetCurrentPersonalizationUseCase,
      getUserBehaviorProfileUseCase as unknown as GetUserBehaviorProfileUseCase,
      getBehavioralPatternsUseCase as unknown as GetBehavioralPatternsUseCase,
      getCurrentNutritionPlanUseCase as unknown as GetCurrentNutritionPlanUseCase,
      getTodayNutritionUseCase as unknown as GetTodayNutritionUseCase,
      getDailyCheckInHistoryUseCase as unknown as GetDailyCheckInHistoryUseCase,
      getWorkoutHistoryUseCase as unknown as GetWorkoutHistoryUseCase,
      getProgressSummaryUseCase as unknown as GetProgressSummaryUseCase,
      nutritionLogRepository as unknown as NutritionLogRepository,
    );
  });

  it('loads context from the existing coach and profile sources', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    buildUserHealthContextService.build.mockResolvedValue({
      goal: 'muscle_gain',
      fatigueLevel: 'LOW',
      recoveryTrend: 'improving',
      nutritionProfile: { goal: 'muscle_gain', mealsPerDay: 4 },
      recentWorkoutLogs: [],
      currentStreak: 3,
    } as never);
    getCurrentGoalUseCase.execute.mockResolvedValue({
      goal: {
        id: 'goal_123',
        userProfileId: 'profile_123',
        type: 'gain_muscle',
        status: {
          value: 'active',
        },
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        targetDate: new Date('2026-08-01T00:00:00.000Z'),
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-07T00:00:00.000Z'),
      },
      progressSnapshot: {
        goalId: 'goal_123',
        userProfileId: 'profile_123',
        date: '2026-07-07',
        progressPercentage: 58,
        currentValue: 72,
        targetValue: 80,
        trend: { value: 'improving' },
        sourceContext: {
          goalType: 'gain_muscle',
          formulaVersion: 'goal-deterministic-v1',
        },
        formulaVersion: 'goal-deterministic-v1',
      },
      forecast: {
        goalId: 'goal_123',
        userProfileId: 'profile_123',
        predictedCompletionDate: new Date('2026-08-01T00:00:00.000Z'),
        confidence: { value: 'medium' },
        estimatedDaysRemaining: 24,
        generatedAt: new Date('2026-07-07T00:00:00.000Z'),
        formulaVersion: 'goal-deterministic-v1',
      },
    } as never);
    getGoalHistoryUseCase.execute.mockResolvedValue({
      goalProgressSnapshots: [
        {
          goalId: 'goal_123',
          userProfileId: 'profile_123',
          date: '2026-07-05',
          progressPercentage: 52,
          currentValue: 71,
          targetValue: 80,
          trend: { value: 'improving' },
          sourceContext: {
            goalType: 'gain_muscle',
            formulaVersion: 'goal-deterministic-v1',
          },
          formulaVersion: 'goal-deterministic-v1',
        },
        {
          goalId: 'goal_123',
          userProfileId: 'profile_123',
          date: '2026-07-06',
          progressPercentage: 55,
          currentValue: 72,
          targetValue: 80,
          trend: { value: 'improving' },
          sourceContext: {
            goalType: 'gain_muscle',
            formulaVersion: 'goal-deterministic-v1',
          },
          formulaVersion: 'goal-deterministic-v1',
        },
      ],
      limit: 7,
    } as never);
    getGoalMilestonesUseCase.execute.mockResolvedValue({
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      goalMilestones: [
        {
          goalId: 'goal_123',
          type: { value: 'custom' },
          title: 'Foundation phase',
          targetValue: 25,
          achieved: true,
          achievedAt: new Date('2026-06-15T00:00:00.000Z'),
        },
        {
          goalId: 'goal_123',
          type: { value: 'custom' },
          title: 'Volume phase',
          targetValue: 50,
          achieved: true,
          achievedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          goalId: 'goal_123',
          type: { value: 'custom' },
          title: 'Strength phase',
          targetValue: 75,
          achieved: false,
        },
      ],
    } as never);
    getGoalAchievementHistoryUseCase.execute.mockResolvedValue({
      goalAchievements: [
        {
          goalId: 'goal_123',
          achievedAt: new Date('2026-07-01T00:00:00.000Z'),
          completionPercentage: 50,
        },
      ],
      limit: 20,
    } as never);
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: {
        priority: 'training',
        headline: 'Train today',
        summary: 'You are ready.',
        actionItems: ['Train'],
        influences: [],
      },
    } as never);
    getRecoveryHistoryUseCase.execute.mockResolvedValue({
      recoverySnapshots: [
        {
          userProfileId: 'profile_123',
          date: '2026-07-06',
          readinessScore: 74,
          fatigueScore: 28,
          recoveryTrend: 'improving',
          recommendedIntensity: 'hard',
          influences: [],
          formulaVersion: 'recovery-v1',
          sourceContext: {
            formulaVersion: 'recovery-v1',
            generatedAt: '2026-07-06T08:00:00.000Z',
          },
          createdAt: new Date('2026-07-06T08:00:00.000Z'),
        },
      ],
    } as never);
    getDailyCheckInHistoryUseCase.execute.mockResolvedValue({
      dailyCheckIns: [
        {
          id: 'checkin_123',
          energyLevel: 4,
          sleepQuality: 4,
          muscleSoreness: 2,
          motivationLevel: 4,
          createdAt: '2026-07-06T08:00:00.000Z',
        },
      ],
    } as never);
    getWorkoutHistoryUseCase.execute.mockResolvedValue({
      workoutLogs: [
        {
          id: 'workout_123',
          trainingPlanId: 'training_123',
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [],
          feedback: undefined,
          date: '2026-07-06',
          createdAt: '2026-07-06T08:00:00.000Z',
        },
      ],
    } as never);
    getProgressSummaryUseCase.execute.mockResolvedValueOnce({
      summary: {
        period: 'week',
        workoutsCompleted: 3,
        totalDurationMinutes: 135,
        averageDurationMinutes: 45,
        lastWorkoutDate: '2026-07-06',
        currentStreak: 3,
      },
    } as never);
    getProgressSummaryUseCase.execute.mockResolvedValueOnce({
      summary: {
        period: 'month',
        workoutsCompleted: 11,
        totalDurationMinutes: 495,
        averageDurationMinutes: 45,
        lastWorkoutDate: '2026-07-06',
        currentStreak: 3,
      },
    } as never);
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: {
        type: 'coach_nudge',
        priority: 'low',
        status: 'planned',
        suppressed: false,
        fatigueLevel: 'low',
      },
    } as never);
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        engagementScore: 80,
        fatigueLevel: 'low',
        dismissedCount: 1,
        recentEventsCount: 5,
      },
    } as never);
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: {
        userProfileId: 'profile_123',
        date: '2026-07-05',
        consistencyScore: 72,
        streakDays: 3,
        adherenceScore: 78,
        trend: 'improving',
        sourceContext: {
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-07-05T08:00:00.000Z',
        },
        formulaVersion: 'habit-engine-v1',
        generatedAt: '2026-07-05T08:00:00.000Z',
      },
    } as never);
    getHabitHistoryUseCase.execute.mockResolvedValue({
      habitSnapshots: [
        {
          userProfileId: 'profile_123',
          date: '2026-07-05',
          consistencyScore: 72,
          streakDays: 3,
          adherenceScore: 78,
          trend: 'improving',
          sourceContext: {
            formulaVersion: 'habit-engine-v1',
            generatedAt: '2026-07-05T08:00:00.000Z',
          },
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-07-05T08:00:00.000Z',
        },
        {
          userProfileId: 'profile_123',
          date: '2026-07-04',
          consistencyScore: 66,
          streakDays: 2,
          adherenceScore: 70,
          trend: 'stable',
          sourceContext: {
            formulaVersion: 'habit-engine-v1',
            generatedAt: '2026-07-04T08:00:00.000Z',
          },
          formulaVersion: 'habit-engine-v1',
          generatedAt: '2026-07-04T08:00:00.000Z',
        },
      ],
      limit: 30,
    } as never);
    getConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: {
        userProfileId: 'profile_123',
        score: 72,
        trend: 'improving',
        currentStreak: 3,
        longestStreak: 7,
        adherenceRate: 78,
        riskLevel: 'low',
        updatedAt: '2026-07-05T08:00:00.000Z',
        formulaVersion: 'habit-engine-v1',
      },
    } as never);
    getHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [],
    } as never);
    getCurrentPersonalizationUseCase.execute.mockResolvedValue({
      personalizationSnapshot: {
        userProfileId: 'profile_123',
        date: '2026-07-05',
        preferredCoachingStyle: 'motivational',
        engagementProfile: 'high',
        notificationResponsiveness: 'medium',
        goalResponsiveness: 'high',
        recoveryResponsiveness: 'medium',
        habitResponsiveness: 'high',
        riskOfDisengagement: 'low',
        trend: 'improving',
        sourceContext: {
          formulaVersion: 'personalization-engine-v1',
          generatedAt: '2026-07-05T08:00:00.000Z',
        },
        formulaVersion: 'personalization-engine-v1',
        generatedAt: '2026-07-05T08:00:00.000Z',
      },
    } as never);
    getUserBehaviorProfileUseCase.execute.mockResolvedValue({
      userBehaviorProfile: {
        userProfileId: 'profile_123',
        preferredCoachingStyle: 'motivational',
        notificationResponsiveness: 'medium',
        goalResponsiveness: 'high',
        recoveryResponsiveness: 'medium',
        habitResponsiveness: 'high',
        engagementProfile: 'high',
        riskOfDisengagement: 'low',
        formulaVersion: 'personalization-engine-v1',
      },
    } as never);
    getBehavioralPatternsUseCase.execute.mockResolvedValue({
      behavioralPatterns: [
        {
          userProfileId: 'profile_123',
          type: 'responds_to_goals',
          confidence: 'high',
          evidenceCount: 3,
          lastObservedAt: '2026-07-05T08:00:00.000Z',
          formulaVersion: 'personalization-engine-v1',
        },
      ],
    } as never);
    getCurrentNutritionPlanUseCase.execute.mockResolvedValue({
      nutritionPlan: {
        id: 'nutrition_plan_123',
        userProfileId: 'profile_123',
        nutritionProfileId: 'nutrition_profile_123',
        fitnessProfileId: 'fitness_profile_123',
        status: 'active',
        weekStartDate: '2026-07-06',
        weekEndDate: '2026-07-12',
        macroTargets: {
          calories: 2200,
          proteinGrams: 150,
          carbsGrams: 240,
          fatGrams: 70,
        },
        days: [],
        generatedBy: 'deterministic',
        createdAt: new Date('2026-07-06T00:00:00.000Z'),
      },
    } as never);
    getTodayNutritionUseCase.execute.mockResolvedValue({
      todayNutrition: {
        date: '2026-07-07',
        macroTargets: {
          calories: 2200,
          proteinGrams: 150,
          carbsGrams: 240,
          fatGrams: 70,
        },
        meals: [],
        progress: {
          consumedCalories: 1800,
          consumedProteinGrams: 120,
          consumedCarbsGrams: 190,
          consumedFatGrams: 55,
          targetCalories: 2200,
          targetProteinGrams: 150,
          targetCarbsGrams: 240,
          targetFatGrams: 70,
          adherencePercentage: 82,
        },
        nextMeal: null,
        nutritionFocus:
          'Focus on consistency and balanced meals across the day.',
      },
    } as never);
    nutritionLogRepository.findByUserProfileIdAndDate.mockResolvedValue([]);

    const result = await service.load('auth_123');

    expect(result.userProfileId).toBe('profile_123');
    expect(result.healthContext.goal).toBe('muscle_gain');
    expect(result.goalContext?.currentGoal?.id).toBe('goal_123');
    expect(result.goalContext?.progressSnapshot?.progressPercentage).toBe(58);
    expect(result.goalContext?.milestones).toHaveLength(3);
    expect(result.recoveryHistory).toHaveLength(1);
    expect(result.progress?.weeklySummary?.workoutsCompleted).toBe(3);
    expect(result.progress?.monthlySummary?.workoutsCompleted).toBe(11);
    expect(result.progress?.workoutHistory).toHaveLength(1);
    expect(result.progress?.dailyCheckInHistory).toHaveLength(1);
    expect(result.coachDecision).toMatchObject({ priority: 'training' });
    expect(result.nutritionPlan).toMatchObject({ id: 'nutrition_plan_123' });
    expect(result.todayNutrition).toMatchObject({ date: '2026-07-07' });
    expect(result.nutritionLogs).toEqual([]);
    expect(result.notification).toMatchObject({
      current: { type: 'coach_nudge', suppressed: false },
    });
    expect(result.habit).toBeDefined();
    expect(result.habitHistory).toHaveLength(2);
    expect(result.personalization).toMatchObject({
      preferredCoachingStyle: 'motivational',
    });
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(service.load('auth_123')).rejects.toBeInstanceOf(
      CreateCoachChatError,
    );
  });
});
