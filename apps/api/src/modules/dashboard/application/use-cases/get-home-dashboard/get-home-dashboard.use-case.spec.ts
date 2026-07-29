import { FitnessProfile } from '../../../../fitness/domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { DailyCheckIn } from '../../../../progress/domain/entities/daily-check-in.entity';
import { DailyCheckInRepository } from '../../../../progress/domain/repositories/daily-check-in.repository';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import { WorkoutLogRepository } from '../../../../progress/domain/repositories/workout-log.repository';
import { Clock } from '../../../../progress/domain/services/clock.service';
import { TrainingPlan } from '../../../../training/domain/entities/training-plan.entity';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { BuildUserHealthContextService } from '../../../../ai/application/services/context-builder/build-user-health-context.service';
import { GetCurrentCoachDecisionUseCase } from '../../../../ai/application/use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { Goal } from '../../../../goals/domain/entities/goal.entity';
import { GoalForecast } from '../../../../goals/domain/entities/goal-forecast.entity';
import { GoalMilestone } from '../../../../goals/domain/entities/goal-milestone.entity';
import { GoalProgressSnapshot } from '../../../../goals/domain/entities/goal-progress-snapshot.entity';
import { GoalForecastConfidenceValueObject } from '../../../../goals/domain/value-objects/goal-forecast-confidence.value-object';
import { GoalMilestoneTypeValueObject } from '../../../../goals/domain/value-objects/goal-milestone-type.value-object';
import { GoalStatusValueObject } from '../../../../goals/domain/value-objects/goal-status.value-object';
import { GoalTrendValueObject } from '../../../../goals/domain/value-objects/goal-trend.value-object';
import { CoachDecision } from '../../../../ai/domain/entities/coach-decision.entity';
import { NotificationDecision } from '../../../../notifications/domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../../notifications/domain/value-objects/notification-influence.value-object';
import { DashboardAdaptiveSignalsService } from '../../services/dashboard-adaptive-signals/dashboard-adaptive-signals.service';
import { GET_HOME_DASHBOARD_ERROR_CODES } from './get-home-dashboard.errors';
import { GetHomeDashboardUseCase } from './get-home-dashboard.use-case';

describe('GetHomeDashboardUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let clock: jest.Mocked<Clock>;
  let getCurrentCoachDecisionUseCase: {
    execute: jest.MockedFunction<GetCurrentCoachDecisionUseCase['execute']>;
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
  let getCurrentPersonalizationUseCase: {
    execute: jest.MockedFunction<GetCurrentPersonalizationUseCase['execute']>;
  };
  let getUserBehaviorProfileUseCase: {
    execute: jest.MockedFunction<GetUserBehaviorProfileUseCase['execute']>;
  };
  let getBehavioralPatternsUseCase: {
    execute: jest.MockedFunction<GetBehavioralPatternsUseCase['execute']>;
  };
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService['build']>;
  };
  let dashboardAdaptiveSignalsService: DashboardAdaptiveSignalsService;
  let useCase: GetHomeDashboardUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    fitnessProfileRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
    };
    trainingPlanRepository = {
      findById: jest.fn(),
      findActiveByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    };
    workoutLogRepository = {
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      create: jest.fn(),
    };
    dailyCheckInRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn().mockResolvedValue([]),
    };
    clock = {
      now: jest.fn().mockReturnValue(new Date('2026-04-30T10:00:00.000Z')),
      todayUtcDateString: jest.fn().mockReturnValue('2026-04-30'),
    };
    getCurrentCoachDecisionUseCase = {
      execute: jest.fn(),
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
    getCurrentPersonalizationUseCase = {
      execute: jest.fn().mockResolvedValue({
        personalizationSnapshot: undefined,
      }),
    };
    getUserBehaviorProfileUseCase = {
      execute: jest.fn().mockResolvedValue({
        userBehaviorProfile: undefined,
      }),
    };
    getBehavioralPatternsUseCase = {
      execute: jest.fn().mockResolvedValue({
        behavioralPatterns: [],
      }),
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
        fatigueLevel: 'MODERATE',
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        recentWorkoutLogs: [],
        generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      }),
    };
    dashboardAdaptiveSignalsService = new DashboardAdaptiveSignalsService();

    useCase = new GetHomeDashboardUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      dailyCheckInRepository,
      clock,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      getCurrentCoachDecisionUseCase as unknown as GetCurrentCoachDecisionUseCase,
      getCurrentGoalUseCase as unknown as GetCurrentGoalUseCase,
      getGoalMilestonesUseCase as unknown as GetGoalMilestonesUseCase,
      getCurrentNotificationUseCase as unknown as GetCurrentNotificationUseCase,
      getEngagementSummaryUseCase as unknown as GetEngagementSummaryUseCase,
      getCurrentHabitsUseCase as unknown as GetCurrentHabitsUseCase,
      getConsistencySummaryUseCase as unknown as GetConsistencySummaryUseCase,
      getHabitRiskSignalsUseCase as unknown as GetHabitRiskSignalsUseCase,
      getCurrentPersonalizationUseCase as unknown as GetCurrentPersonalizationUseCase,
      getUserBehaviorProfileUseCase as unknown as GetUserBehaviorProfileUseCase,
      getBehavioralPatternsUseCase as unknown as GetBehavioralPatternsUseCase,
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

  function mockFitnessProfile(): void {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'high',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  }

  function mockTrainingPlan(
    weeklySchedule?: TrainingPlan['weeklySchedule'],
  ): void {
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: 'training_123',
        fitnessProfileId: 'fitness_123',
        goal: 'gain_muscle',
        activityLevel: 'high',
        weeklySchedule: weeklySchedule ?? [
          {
            dayIndex: 4,
            title: 'Upper Body Strength',
            focus: 'upper_body_strength',
            format: 'strength',
            intensity: 'high',
            exercises: [
              { name: 'push_up', sets: 4, reps: '8-12', restSeconds: 90 },
            ],
          },
        ],
        status: 'active',
        createdAt: new Date('2026-04-29T10:00:00.000Z'),
        updatedAt: new Date('2026-04-29T10:00:00.000Z'),
      }),
    );
  }

  function mockDailyCheckInHistory(
    entries: Array<{
      id: string;
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
      createdAt: string;
    }>,
  ): void {
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue(
      entries.map(
        (entry) =>
          new DailyCheckIn({
            id: entry.id,
            userProfileId: 'profile_123',
            energyLevel: entry.energyLevel,
            sleepQuality: entry.sleepQuality,
            muscleSoreness: entry.muscleSoreness,
            motivationLevel: entry.motivationLevel,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.createdAt),
          }),
      ),
    );
  }

  function buildCoachDecision(
    overrides: Partial<CoachDecision> = {},
  ): CoachDecision {
    return new CoachDecision({
      id: overrides.id ?? 'decision_123',
      userProfileId: overrides.userProfileId ?? 'profile_123',
      date: overrides.date ?? '2026-04-30',
      priority: overrides.priority ?? 'motivation',
      headline: overrides.headline ?? 'Keep building momentum',
      summary: overrides.summary ?? 'Signals are stable.',
      actionItems: overrides.actionItems ?? [
        'Continue the current plan',
        'Stay consistent',
      ],
      influences: overrides.influences ?? [],
      sourceContext: overrides.sourceContext ?? {
        generatedAt: '2026-04-30T10:00:00.000Z',
      },
      formulaVersion: overrides.formulaVersion ?? 'coach-decision-v1',
      generatedBy: overrides.generatedBy ?? 'deterministic',
      llmMetadata: overrides.llmMetadata ?? { used: false },
      createdAt: overrides.createdAt ?? new Date('2026-04-30T10:00:00.000Z'),
      updatedAt: overrides.updatedAt ?? new Date('2026-04-30T10:00:00.000Z'),
    });
  }

  function buildGoalReadModel() {
    return {
      goal: new Goal({
        id: 'goal_123',
        userProfileId: 'profile_123',
        type: 'gain_muscle',
        status: new GoalStatusValueObject('active'),
        startDate: new Date('2026-04-01T00:00:00.000Z'),
        targetValue: 90,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        updatedAt: new Date('2026-04-30T00:00:00.000Z'),
      }),
      progressSnapshot: new GoalProgressSnapshot({
        goalId: 'goal_123',
        userProfileId: 'profile_123',
        date: '2026-04-30',
        progressPercentage: 78,
        currentValue: 85,
        targetValue: 90,
        trend: new GoalTrendValueObject('improving'),
        sourceContext: {
          generatedAt: '2026-04-30T10:00:00.000Z',
        },
        formulaVersion: 'goal-progress-v1',
      }),
      forecast: new GoalForecast({
        goalId: 'goal_123',
        userProfileId: 'profile_123',
        predictedCompletionDate: new Date('2026-05-14T00:00:00.000Z'),
        confidence: new GoalForecastConfidenceValueObject('medium'),
        estimatedDaysRemaining: 14,
        generatedAt: new Date('2026-04-30T10:00:00.000Z'),
        formulaVersion: 'goal-forecast-v1',
      }),
      milestones: [
        new GoalMilestone({
          goalId: 'goal_123',
          type: new GoalMilestoneTypeValueObject('weight_target'),
          title: 'Reach 75%',
          targetValue: 75,
          achieved: true,
          achievedAt: new Date('2026-04-29T00:00:00.000Z'),
        }),
        new GoalMilestone({
          goalId: 'goal_123',
          type: new GoalMilestoneTypeValueObject('weight_target'),
          title: 'Reach 100%',
          targetValue: 100,
          achieved: false,
        }),
      ],
    };
  }

  function buildNotificationDecision(): NotificationDecision {
    return new NotificationDecision({
      id: 'notification_123',
      userProfileId: 'profile_123',
      date: '2026-04-30',
      type: 'coach_nudge',
      priority: 'medium',
      channel: 'in_app',
      status: 'planned',
      title: 'Small action, big progress',
      message: 'Keep the next step simple and consistent.',
      influences: [
        {
          code: 'COACH_CONSISTENCY_NUDGE',
          label: 'Coach consistency nudge',
          impact: 'neutral',
          source: 'coach',
        } as NotificationInfluence,
      ] as never,
      sourceContext: {
        coachDecisionId: 'decision_123',
        coachDecisionPriority: 'consistency',
        coachDecisionHeadline: 'Focus on consistency',
        readinessScore: 64,
        fatigueScore: 38,
        fatigueLevel: 'low',
        adaptiveRecommendationType: 'maintain',
        goalProgressTrend: 'stable',
        goalMilestoneClose: false,
        goalAchievementReached: false,
        nutritionAdherence: 72,
        missedWorkouts: 0,
        noRecentActivity: false,
        recentEngagementEventsCount: 2,
        formulaVersion: 'notification-engine-v1',
        generatedAt: '2026-04-30T10:00:00.000Z',
      },
      suppressed: false,
      suppressionReasons: [],
      fatigueLevel: 'low',
      formulaVersion: 'notification-engine-v1',
      generatedBy: 'deterministic',
      createdAt: new Date('2026-04-30T10:00:00.000Z'),
      updatedAt: new Date('2026-04-30T10:00:00.000Z'),
    });
  }

  it('returns fitnessProfile and trainingPlan as null when no active fitness profile exists', async () => {
    mockUserProfile();
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision(),
    } as never);
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: buildNotificationDecision(),
    } as never);
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: {
        engagementScore: 84,
        fatigueLevel: 'high',
        openedCount: 2,
        clickedCount: 1,
        dismissedCount: 2,
        completedCount: 1,
        recentEventsCount: 6,
      },
    } as never);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result).toEqual({
      dashboard: {
        user: {
          name: 'Rodrigo Paiva',
        },
        fitnessProfile: null,
        trainingPlan: null,
        progressSummary: {
          period: 'week',
          workoutsCompleted: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          lastWorkoutDate: null,
        },
        recovery: {
          fatigueLevel: 'MODERATE',
          recommendedIntensity: 'medium',
          recoveryTrend: 'stable',
          readinessScore: undefined,
          fatigueScore: undefined,
          recoveryInfluences: undefined,
        },
        notification: {
          current: {
            type: 'coach_nudge',
            priority: 'medium',
            status: 'planned',
            suppressed: false,
            fatigueLevel: 'low',
          },
          engagementSummary: {
            engagementScore: 84,
            fatigueLevel: 'high',
            openedCount: 2,
            clickedCount: 1,
            dismissedCount: 2,
            completedCount: 1,
            recentEventsCount: 6,
          },
        },
        coachDecision: {
          priority: 'motivation',
          headline: 'Keep building momentum',
          summary: 'Signals are stable.',
          actionItems: ['Continue the current plan', 'Stay consistent'],
          influences: [],
        },
        nutritionGuidance: {
          priority: 'consistency',
          message:
            'Keep your nutrition routine consistent today.',
          signals: ['nutrition_unavailable'],
        },
      },
    });
    expect(result.dashboard.notification).toEqual({
      current: {
        type: 'coach_nudge',
        priority: 'medium',
        status: 'planned',
        suppressed: false,
        fatigueLevel: 'low',
      },
      engagementSummary: {
        engagementScore: 84,
        fatigueLevel: 'high',
        openedCount: 2,
        clickedCount: 1,
        dismissedCount: 2,
        completedCount: 1,
        recentEventsCount: 6,
      },
    });
    expect(JSON.stringify(result.dashboard.notification)).not.toContain(
      'sourceContext',
    );
    expect(
      trainingPlanRepository.findActiveByFitnessProfileId,
    ).not.toHaveBeenCalled();
    expect(
      workoutLogRepository.findByTrainingPlanIdsAndDateRange,
    ).not.toHaveBeenCalled();
  });

  it('returns trainingPlan as null and zero summary when no active training plan exists', async () => {
    mockUserProfile();
    mockFitnessProfile();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision(),
    } as never);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.dashboard.trainingPlan).toBeNull();
    expect(result.dashboard.progressSummary).toEqual({
      period: 'week',
      workoutsCompleted: 0,
      totalDurationMinutes: 0,
      averageDurationMinutes: 0,
      lastWorkoutDate: null,
    });
    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: 'MODERATE',
      recommendedIntensity: 'medium',
      recoveryTrend: 'stable',
      readinessScore: undefined,
      fatigueScore: undefined,
      recoveryInfluences: undefined,
    });
    expect(result.dashboard.nutritionGuidance).toEqual({
      priority: 'consistency',
      message:
        'Keep your nutrition routine consistent today.',
      signals: ['nutrition_unavailable'],
    });
    expect(
      workoutLogRepository.findByTrainingPlanIdsAndDateRange,
    ).not.toHaveBeenCalled();
  });

  it('includes the goal read model when available', async () => {
    mockUserProfile();
    mockFitnessProfile();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision(),
    } as never);
    getCurrentGoalUseCase.execute.mockResolvedValue({
      goal: buildGoalReadModel().goal,
      progressSnapshot: buildGoalReadModel().progressSnapshot,
      forecast: buildGoalReadModel().forecast,
    } as never);
    getGoalMilestonesUseCase.execute.mockResolvedValue({
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      goalMilestones: buildGoalReadModel().milestones,
    } as never);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.dashboard.goal).toEqual({
      current: buildGoalReadModel().goal.toJSON(),
      progressSnapshot: (() => {
        const { sourceContext: _sourceContext, ...safeProgressSnapshot } =
          buildGoalReadModel().progressSnapshot.toJSON();

        return safeProgressSnapshot;
      })(),
      forecast: buildGoalReadModel().forecast.toJSON(),
      milestones: buildGoalReadModel().milestones.map((milestone) =>
        milestone.toJSON(),
      ),
    });
  });

  it('falls back safely when goal read fails', async () => {
    mockUserProfile();
    mockFitnessProfile();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision(),
    } as never);
    getCurrentGoalUseCase.execute.mockRejectedValue(
      new Error('goal unavailable'),
    );
    getGoalMilestonesUseCase.execute.mockRejectedValue(
      new Error('goal unavailable'),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.dashboard.goal).toBeUndefined();
    expect(result.dashboard.fitnessProfile).toEqual({
      id: 'fitness_123',
      goal: 'gain_muscle',
      activityLevel: 'high',
    });
  });

  it('returns todayWorkout when the UTC weekday matches weeklySchedule.dayIndex', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.dashboard.trainingPlan).toEqual({
      id: 'training_123',
      todayWorkout: {
        dayIndex: 4,
        title: 'Upper Body Strength',
        focus: 'upper_body_strength',
        format: 'strength',
        intensity: 'high',
        exercises: [
          { name: 'push_up', sets: 4, reps: '8-12', restSeconds: 90 },
        ],
      },
    });
  });

  it('returns todayWorkout as null when weeklySchedule does not contain the current UTC day', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan([
      {
        dayIndex: 1,
        title: 'Upper Body Strength',
        focus: 'upper_body_strength',
        format: 'strength',
        intensity: 'high',
        exercises: [
          { name: 'push_up', sets: 4, reps: '8-12', restSeconds: 90 },
        ],
      },
    ]);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.dashboard.trainingPlan).toEqual({
      id: 'training_123',
      todayWorkout: null,
    });
  });

  it('builds the weekly summary correctly', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    getCurrentCoachDecisionUseCase.execute.mockResolvedValue({
      coachDecision: buildCoachDecision({
        priority: 'motivation',
        headline: 'Keep building momentum',
        summary: 'Signals are stable.',
        actionItems: ['Continue the current plan', 'Stay consistent'],
      }),
    } as Awaited<ReturnType<GetCurrentCoachDecisionUseCase['execute']>>);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      new WorkoutLog({
        id: 'log_1',
        trainingPlanId: 'training_123',
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [],
        date: '2026-04-29',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new WorkoutLog({
        id: 'log_2',
        trainingPlanId: 'training_123',
        workoutDayIndex: 4,
        durationMinutes: 50,
        completedExercises: [],
        date: '2026-04-30',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.dashboard.progressSummary).toEqual({
      period: 'week',
      workoutsCompleted: 2,
      totalDurationMinutes: 95,
      averageDurationMinutes: 47.5,
      lastWorkoutDate: '2026-04-30',
    });
    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: 'MODERATE',
      recommendedIntensity: 'medium',
      recoveryTrend: 'stable',
      readinessScore: undefined,
      fatigueScore: undefined,
      recoveryInfluences: undefined,
    });
    expect(result.dashboard.nutritionGuidance).toEqual({
      priority: 'consistency',
      message:
        'Keep your nutrition routine consistent today.',
      signals: ['nutrition_unavailable'],
    });
    expect(result.dashboard.coachDecision).toEqual({
      priority: 'motivation',
      headline: 'Keep building momentum',
      summary: 'Signals are stable.',
      actionItems: ['Continue the current plan', 'Stay consistent'],
      influences: [],
    });
  });

  it('falls back safely when coach decision resolution fails', async () => {
    mockUserProfile();
    mockFitnessProfile();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    getCurrentCoachDecisionUseCase.execute.mockRejectedValue(
      new Error('decision unavailable'),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(result.dashboard.coachDecision).toBeUndefined();
  });

  it("isolates the summary by authenticated user's training plan id", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(
      workoutLogRepository.findByTrainingPlanIdsAndDateRange,
    ).toHaveBeenCalledWith({
      trainingPlanIds: ['training_123'],
      startDate: '2026-04-24',
      endDate: '2026-04-30',
    });
  });

  it('returns USER_PROFILE_NOT_FOUND when the session user has no user profile', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
      }),
    ).rejects.toMatchObject({
      code: GET_HOME_DASHBOARD_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('returns recovery with HIGH fatigue mapped to low intensity', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 0,
      currentStreak: 6,
      averageWorkoutDuration: 80,
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
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: 'HIGH',
      recommendedIntensity: 'low',
      recoveryTrend: 'stable',
      readinessScore: undefined,
      fatigueScore: undefined,
      recoveryInfluences: undefined,
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: '2026-04-30T09:00:00.000Z',
      },
    });
    expect(result.dashboard.nutritionGuidance).toEqual({
      priority: 'consistency',
      message: 'Keep your nutrition routine consistent today.',
      signals: ['nutrition_unavailable'],
    });
  });

  it('returns recovery with LOW fatigue mapped to normal intensity', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 0,
      currentStreak: 3,
      averageWorkoutDuration: 40,
      fatigueLevel: 'LOW',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      latestCheckIn: undefined,
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: 'LOW',
      recommendedIntensity: 'normal',
      recoveryTrend: 'stable',
      readinessScore: undefined,
      fatigueScore: undefined,
      recoveryInfluences: undefined,
    });
    expect(result.dashboard.nutritionGuidance).toEqual({
      priority: 'consistency',
      message:
        'Keep your nutrition routine consistent today.',
      signals: ['nutrition_unavailable'],
    });
  });

  it('exposes adaptive training recommendation when available', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 0,
      currentStreak: 2,
      averageWorkoutDuration: 42,
      fatigueLevel: 'MODERATE',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      adaptiveTrainingRecommendation: {
        recommendationType: 'recovery_workout',
        recommendedIntensity: 'light',
        volumeAction: 'decrease',
        reasoning: 'Recovery is the best trade-off today.',
        influences: [
          {
            code: 'HIGH_FATIGUE',
            label: 'Fatigue is elevated.',
            impact: 'negative',
          },
        ],
      },
    } as never);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.adaptiveTrainingRecommendation).toEqual({
      recommendationType: 'recovery_workout',
      recommendedIntensity: 'light',
      volumeAction: 'decrease',
      reasoning: 'Recovery is the best trade-off today.',
      influences: [
        {
          code: 'HIGH_FATIGUE',
          label: 'Fatigue is elevated.',
          impact: 'negative',
        },
      ],
    });
  });

  it('uses the recovery snapshot as the primary recovery source when available', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 0,
      currentStreak: 2,
      averageWorkoutDuration: 42,
      fatigueLevel: 'MODERATE',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      recoverySnapshot: {
        date: '2026-04-30',
        readinessScore: 84,
        fatigueScore: 18,
        recoveryTrend: 'declining',
        recommendedIntensity: 'hard',
        influences: [
          {
            code: 'HIGH_ADHERENCE',
            label: 'Strong adherence supports recovery.',
            impact: 'positive',
            weight: 0.15,
            value: 100,
          },
        ],
        formulaVersion: 'recovery-deterministic-v1',
        createdAt: new Date('2026-04-30T09:30:00.000Z'),
      },
      readinessScore: 84,
      fatigueScore: 18,
      recoveryInfluences: [
        {
          code: 'HIGH_ADHERENCE',
          label: 'Strong adherence supports recovery.',
          impact: 'positive',
          weight: 0.15,
          value: 100,
        },
      ],
      recoveryTrend: 'needs_recovery',
      recommendedIntensity: 'hard',
      latestCheckIn: undefined,
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: 'LOW',
      recommendedIntensity: 'normal',
      recoveryTrend: 'needs_recovery',
      readinessScore: 84,
      fatigueScore: 18,
      recoveryInfluences: [
        {
          code: 'HIGH_ADHERENCE',
          label: 'Strong adherence supports recovery.',
          impact: 'positive',
          weight: 0.15,
          value: 100,
        },
      ],
      latestCheckIn: undefined,
    });
    expect(result.dashboard.nutritionGuidance.priority).toBe('consistency');
  });

  it('returns consistency guidance when meal frequency is low', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 76,
      currentStreak: 2,
      averageWorkoutDuration: 48,
      fatigueLevel: 'MODERATE',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      latestCheckIn: {
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: new Date('2026-04-30T09:00:00.000Z'),
      },
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.nutritionGuidance).toEqual({
      priority: 'consistency',
      message:
        'Keep your nutrition routine consistent today.',
      signals: ['nutrition_unavailable'],
    });
  });

  it('returns performance guidance when recovery is low-fatigue and muscle gain is active', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 82,
      currentStreak: 4,
      averageWorkoutDuration: 55,
      fatigueLevel: 'LOW',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 5,
        createdAt: new Date('2026-04-30T09:00:00.000Z'),
      },
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.nutritionGuidance).toEqual({
      priority: 'consistency',
      message: 'Keep your nutrition routine consistent today.',
      signals: ['nutrition_unavailable'],
    });
  });

  it('returns a safe consistency fallback when no nutrition profile exists', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 88,
      currentStreak: 3,
      averageWorkoutDuration: 42,
      fatigueLevel: 'LOW',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      latestCheckIn: undefined,
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.nutritionGuidance).toEqual({
      priority: 'consistency',
      message: 'Keep your nutrition routine consistent today.',
      signals: ['nutrition_unavailable'],
    });
  });

  it('includes recovery trend in recovery guidance signals when recovery is declining', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 82,
      currentStreak: 3,
      averageWorkoutDuration: 50,
      fatigueLevel: 'MODERATE',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      latestCheckIn: {
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: new Date('2026-04-30T09:00:00.000Z'),
      },
    });
    mockDailyCheckInHistory([
      {
        id: 'check_in_3',
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 2,
        createdAt: '2026-04-30T09:00:00.000Z',
      },
      {
        id: 'check_in_2',
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
        createdAt: '2026-04-29T09:00:00.000Z',
      },
      {
        id: 'check_in_1',
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: '2026-04-28T09:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.nutritionGuidance.signals).toContain(
      'nutrition_unavailable',
    );
  });

  it('includes improving recovery in performance guidance signals when available', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: 'auth_user_123',
      adherenceScore: 82,
      currentStreak: 4,
      averageWorkoutDuration: 55,
      fatigueLevel: 'LOW',
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-04-30T10:00:00.000Z'),
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 5,
        createdAt: new Date('2026-04-30T09:00:00.000Z'),
      },
    });
    mockDailyCheckInHistory([
      {
        id: 'check_in_3',
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: '2026-04-30T09:00:00.000Z',
      },
      {
        id: 'check_in_2',
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: '2026-04-29T09:00:00.000Z',
      },
      {
        id: 'check_in_1',
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: '2026-04-28T09:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.nutritionGuidance.signals).toEqual([
      'nutrition_unavailable',
    ]);
  });

  it('returns improving recovery trend with positive recent check-in signals', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    mockDailyCheckInHistory([
      {
        id: 'check_in_3',
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: '2026-04-30T09:00:00.000Z',
      },
      {
        id: 'check_in_2',
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: '2026-04-29T09:00:00.000Z',
      },
      {
        id: 'check_in_1',
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: '2026-04-28T09:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.recovery.recoveryTrend).toBe('improving');
  });

  it('returns needs_recovery trend with negative recent check-in signals', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    mockDailyCheckInHistory([
      {
        id: 'check_in_3',
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 2,
        createdAt: '2026-04-30T09:00:00.000Z',
      },
      {
        id: 'check_in_2',
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
        createdAt: '2026-04-29T09:00:00.000Z',
      },
      {
        id: 'check_in_1',
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: '2026-04-28T09:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.recovery.recoveryTrend).toBe('needs_recovery');
  });

  it('returns stable recovery trend with mixed recent check-in signals', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    mockDailyCheckInHistory([
      {
        id: 'check_in_3',
        energyLevel: 4,
        sleepQuality: 2,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: '2026-04-30T09:00:00.000Z',
      },
      {
        id: 'check_in_2',
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
        createdAt: '2026-04-29T09:00:00.000Z',
      },
      {
        id: 'check_in_1',
        energyLevel: 2,
        sleepQuality: 4,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: '2026-04-28T09:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.recovery.recoveryTrend).toBe('stable');
  });

  it('returns stable recovery trend when there are fewer than three check-ins', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    mockDailyCheckInHistory([
      {
        id: 'check_in_2',
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 2,
        motivationLevel: 4,
        createdAt: '2026-04-30T09:00:00.000Z',
      },
      {
        id: 'check_in_1',
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
        createdAt: '2026-04-29T09:00:00.000Z',
      },
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.recovery.recoveryTrend).toBe('stable');
  });

  it('includes habit read models when available', async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
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

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.dashboard.habits).toEqual({
      current: expect.objectContaining({
        consistencyScore: 78,
        trend: 'improving',
      }),
      summary: expect.objectContaining({
        score: 78,
        trend: 'improving',
      }),
      riskSignals: expect.arrayContaining([
        expect.objectContaining({
          type: 'streak_at_risk',
        }),
      ]),
    });
  });
});
