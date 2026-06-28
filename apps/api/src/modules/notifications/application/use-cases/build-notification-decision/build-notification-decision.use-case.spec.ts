import { NotificationDecision } from '../../../domain/entities/notification-decision.entity';
import { NotificationInfluence } from '../../../domain/value-objects/notification-influence.value-object';
import { BUILD_NOTIFICATION_DECISION_ERROR_CODES } from './build-notification-decision.errors';
import { BuildNotificationDecisionUseCase } from './build-notification-decision.use-case';
import { NotificationDecisionCalculatorService } from '../../services/notification-decision-calculator.service';
import { NotificationFatiguePolicyService } from '../../services/notification-fatigue-policy.service';
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { CoachDecisionRepository } from '../../../../ai/domain/repositories/coach-decision.repository';
import { RecoverySnapshotRepository } from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import { AdaptiveTrainingRecommendationRepository } from '../../../../training/domain/repositories/adaptive-training-recommendation.repository';
import { GoalRepository } from '../../../../goals/domain/repositories/goal.repository';
import { GoalProgressSnapshotRepository } from '../../../../goals/domain/repositories/goal-progress-snapshot.repository';
import { GoalMilestoneRepository } from '../../../../goals/domain/repositories/goal-milestone.repository';
import { NutritionRecommendationRepository } from '../../../../nutrition/domain/repositories/nutrition-recommendation.repository';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { WorkoutLogRepository } from '../../../../progress/domain/repositories/workout-log.repository';
import { DailyCheckInRepository } from '../../../../progress/domain/repositories/daily-check-in.repository';
import { EngagementEventRepository } from '../../../domain/repositories/engagement-event.repository';
import {
  NotificationDecisionRepository,
  UpsertNotificationDecisionRepositoryInput,
} from '../../../domain/repositories/notification-decision.repository';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';

describe('BuildNotificationDecisionUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachDecisionRepository: jest.Mocked<CoachDecisionRepository>;
  let recoverySnapshotRepository: jest.Mocked<RecoverySnapshotRepository>;
  let adaptiveTrainingRecommendationRepository: jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  let goalRepository: jest.Mocked<GoalRepository>;
  let goalProgressSnapshotRepository: jest.Mocked<GoalProgressSnapshotRepository>;
  let goalMilestoneRepository: jest.Mocked<GoalMilestoneRepository>;
  let nutritionRecommendationRepository: jest.Mocked<NutritionRecommendationRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let engagementEventRepository: jest.Mocked<EngagementEventRepository>;
  let notificationDecisionRepository: jest.Mocked<NotificationDecisionRepository>;
  let getCurrentPersonalizationUseCase: {
    execute: jest.MockedFunction<GetCurrentPersonalizationUseCase['execute']>;
  };
  let notificationDecisionCalculatorService: NotificationDecisionCalculatorService;
  let notificationFatiguePolicyService: NotificationFatiguePolicyService;
  let platformDateService: PlatformDateService;
  let useCase: BuildNotificationDecisionUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-03T10:00:00.000Z'));

    userProfileRepository = buildUserProfileRepository();
    coachDecisionRepository = buildCoachDecisionRepository();
    recoverySnapshotRepository = buildRecoverySnapshotRepository();
    adaptiveTrainingRecommendationRepository =
      buildAdaptiveTrainingRecommendationRepository();
    goalRepository = buildGoalRepository();
    goalProgressSnapshotRepository = buildGoalProgressSnapshotRepository();
    goalMilestoneRepository = buildGoalMilestoneRepository();
    nutritionRecommendationRepository =
      buildNutritionRecommendationRepository();
    fitnessProfileRepository = buildFitnessProfileRepository();
    trainingPlanRepository = buildTrainingPlanRepository();
    workoutLogRepository = buildWorkoutLogRepository();
    dailyCheckInRepository = buildDailyCheckInRepository();
    engagementEventRepository = buildEngagementEventRepository();
    notificationDecisionRepository = buildNotificationDecisionRepository();
    getCurrentPersonalizationUseCase = {
      execute: jest.fn().mockResolvedValue({
        personalizationSnapshot: undefined,
      }),
    };
    notificationDecisionCalculatorService =
      new NotificationDecisionCalculatorService();
    notificationFatiguePolicyService = new NotificationFatiguePolicyService();
    platformDateService = new PlatformDateService();

    notificationDecisionRepository.upsertDailyDecision.mockImplementation(
      async (input) => buildPersistedDecision(input),
    );
    notificationDecisionRepository.findByUserProfileIdAndDate.mockResolvedValue(
      null,
    );
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([]);

    seedNeutralState();

    useCase = new BuildNotificationDecisionUseCase(
      userProfileRepository,
      coachDecisionRepository,
      recoverySnapshotRepository,
      adaptiveTrainingRecommendationRepository,
      goalRepository,
      goalProgressSnapshotRepository,
      goalMilestoneRepository,
      nutritionRecommendationRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      dailyCheckInRepository,
      engagementEventRepository,
      notificationDecisionRepository,
      getCurrentPersonalizationUseCase as unknown as GetCurrentPersonalizationUseCase,
      notificationDecisionCalculatorService,
      notificationFatiguePolicyService,
      platformDateService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('builds a recovery alert from a full signal set', async () => {
    arrangeUserProfile();
    arrangeCoachDecision('consistency');
    arrangeRecoverySnapshot({ readinessScore: 20, fatigueScore: 92 });
    arrangeAdaptiveTrainingRecommendation('rest_day');
    arrangeGoal({
      type: 'lose_weight',
      status: 'active',
      progressPercentage: 92,
      trend: 'improving',
      milestoneTargets: [25, 50, 75, 100],
    });
    arrangeNutritionRecommendation(32);
    arrangeTrainingPlanAndActivity({
      weeklyScheduleDays: 4,
      recentWorkoutDates: ['2026-06-01'],
      recentCheckInDates: ['2026-06-03'],
    });
    arrangeEngagementEvents([
      'dismissed',
      'dismissed',
      'dismissed',
      'opened',
      'dismissed',
      'dismissed',
      'opened',
      'dismissed',
    ]);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('recovery_alert');
    expect(result.notificationDecision.priority.value).toBe('urgent');
    expect(
      notificationDecisionRepository.upsertDailyDecision,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-06-03',
        generatedBy: 'deterministic',
        formulaVersion: 'notification-engine-v1',
      }),
    );
  });

  it('builds a weekly summary with neutral fallbacks', async () => {
    arrangeUserProfile();

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('weekly_summary');
    expect(result.notificationDecision.priority.value).toBe('low');

    const persistedInput =
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0];

    expect(persistedInput.sourceContext).toEqual(
      expect.objectContaining({
        readinessScore: 50,
        fatigueScore: 50,
        nutritionAdherence: 50,
        missedWorkouts: 0,
        noRecentActivity: false,
        fatigueLevel: 'low',
        recentEngagementEventsCount: 0,
      }),
    );
    expect(persistedInput).toEqual(
      expect.objectContaining({
        suppressed: false,
        suppressionReasons: [],
        fatigueLevel: 'low',
      }),
    );
  });

  it('persists a suppressed notification when the daily cap is reached', async () => {
    arrangeUserProfile();
    const recentDates = [
      '2026-05-30',
      '2026-05-31',
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ];
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue(
      recentDates.map((date) =>
        buildPersistedDecision({
          userProfileId: 'profile_123',
          date,
          type: 'coach_nudge',
          priority: 'low',
          channel: 'in_app',
          status: 'planned',
          title: 'Weekly summary is ready',
          message: 'Your weekly summary is ready.',
          influences: [],
          sourceContext: {
            formulaVersion: 'notification-engine-v1',
            generatedAt: '2026-06-03T10:00:00.000Z',
          },
          suppressed: false,
          suppressionReasons: [],
          fatigueLevel: 'low',
          formulaVersion: 'notification-engine-v1',
          generatedBy: 'deterministic',
        }),
      ),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.suppressed).toBe(true);
    expect(result.notificationDecision.status.value).toBe('skipped');
    expect(result.notificationDecision.suppressionReasons).toContain(
      'daily_cap_reached',
    );
    expect(result.notificationDecision.fatigueLevel).toBe('high');

    expect(
      notificationDecisionRepository.upsertDailyDecision,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        suppressed: true,
        suppressionReasons: expect.arrayContaining(['daily_cap_reached']),
        fatigueLevel: 'high',
        status: 'skipped',
      }),
    );
  });

  it('returns the existing decision when suppression applies to an already generated day', async () => {
    arrangeUserProfile();
    const recentDates = [
      '2026-05-30',
      '2026-05-31',
      '2026-06-01',
      '2026-06-02',
      '2026-06-03',
    ];

    const existingDecision = buildPersistedDecision({
      userProfileId: 'profile_123',
      date: '2026-06-03',
      type: 'weekly_summary',
      priority: 'low',
      channel: 'in_app',
      status: 'skipped',
      title: 'Weekly summary is ready',
      message: 'Your weekly summary is ready.',
      influences: [],
      sourceContext: {
        formulaVersion: 'notification-engine-v1',
        generatedAt: '2026-06-03T09:00:00.000Z',
      },
      suppressed: true,
      suppressionReasons: ['daily_cap_reached'],
      fatigueLevel: 'high',
      formulaVersion: 'notification-engine-v1',
      generatedBy: 'deterministic',
    });

    notificationDecisionRepository.findByUserProfileIdAndDate.mockResolvedValue(
      existingDecision,
    );
    notificationDecisionRepository.findManyByUserProfileId.mockResolvedValue(
      recentDates.map((date) =>
        buildPersistedDecision({
          userProfileId: 'profile_123',
          date,
          type: 'coach_nudge',
          priority: 'low',
          channel: 'in_app',
          status: 'planned',
          title: 'Weekly summary is ready',
          message: 'Your weekly summary is ready.',
          influences: [],
          sourceContext: {
            formulaVersion: 'notification-engine-v1',
            generatedAt: '2026-06-03T10:00:00.000Z',
          },
          suppressed: false,
          suppressionReasons: [],
          fatigueLevel: 'low',
          formulaVersion: 'notification-engine-v1',
          generatedBy: 'deterministic',
        }),
      ),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.id).toBe('notification_123');
    expect(result.notificationDecision.suppressed).toBe(true);
    expect(
      notificationDecisionRepository.upsertDailyDecision,
    ).not.toHaveBeenCalled();
  });

  it('passes coach decision priority headline and influences to the calculator when available', async () => {
    arrangeUserProfile();
    arrangeCoachDecision('consistency', 'Stay consistent', [
      {
        code: 'LOW_ENGAGEMENT',
        label: 'Low engagement',
        impact: 'negative',
        source: 'coach',
      },
    ]);

    const calculateSpy = jest.spyOn(
      notificationDecisionCalculatorService,
      'calculate',
    );

    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(calculateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        coachDecisionPriority: 'consistency',
        coachDecisionHeadline: 'Stay consistent',
        coachDecisionInfluences: [
          {
            code: 'LOW_ENGAGEMENT',
            label: 'Low engagement',
            impact: 'negative',
            source: 'coach',
            weight: undefined,
            value: undefined,
          },
        ],
      }),
    );
  });

  it('continues without a coach decision', async () => {
    arrangeUserProfile();
    coachDecisionRepository.findLatestByUserProfileId.mockResolvedValue(null);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('weekly_summary');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        coachDecisionId: undefined,
        coachDecisionPriority: undefined,
        coachDecisionHeadline: undefined,
      }),
    );
  });

  it('uses recovery readiness and fatigue values', async () => {
    arrangeUserProfile();
    arrangeRecoverySnapshot({ readinessScore: 20, fatigueScore: 90 });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('recovery_alert');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        readinessScore: 20,
        fatigueScore: 90,
      }),
    );
  });

  it('falls back safely when recovery is missing', async () => {
    arrangeUserProfile();
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('weekly_summary');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        readinessScore: 50,
        fatigueScore: 50,
      }),
    );
  });

  it('uses a rest day recommendation', async () => {
    arrangeUserProfile();
    arrangeAdaptiveTrainingRecommendation('rest_day');

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('recovery_alert');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        adaptiveRecommendationType: 'rest_day',
      }),
    );
  });

  it('uses goal progress trend in source context', async () => {
    arrangeUserProfile();
    arrangeGoal({
      type: 'improve_consistency',
      status: 'active',
      progressPercentage: 80,
      trend: 'improving',
      milestoneTargets: [25, 50, 75, 100],
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('weekly_summary');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        goalProgressTrend: 'improving',
      }),
    );
  });

  it('detects a goal milestone close signal', async () => {
    arrangeUserProfile();
    arrangeGoal({
      type: 'lose_weight',
      status: 'active',
      progressPercentage: 92,
      trend: 'stable',
      milestoneTargets: [25, 50, 75, 100],
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('goal_milestone');
    expect(result.notificationDecision.priority.value).toBe('high');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        goalMilestoneClose: true,
      }),
    );
  });

  it('detects a goal achievement signal', async () => {
    arrangeUserProfile();
    arrangeGoal({
      type: 'improve_recovery',
      status: 'achieved',
      progressPercentage: 100,
      trend: 'improving',
      milestoneTargets: [25, 50, 75, 100],
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('goal_achievement');
    expect(result.notificationDecision.priority.value).toBe('high');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        goalAchievementReached: true,
      }),
    );
  });

  it('detects missed workouts and no recent activity', async () => {
    arrangeUserProfile();
    arrangeTrainingPlanAndActivity({
      weeklyScheduleDays: 4,
      recentWorkoutDates: ['2026-06-01'],
      recentCheckInDates: [],
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('missed_workout');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        missedWorkouts: 3,
        noRecentActivity: false,
      }),
    );
  });

  it('detects no recent activity when workout and check-in signals are absent', async () => {
    arrangeUserProfile();
    arrangeTrainingPlanAndActivity({
      weeklyScheduleDays: 4,
      recentWorkoutDates: [],
      recentCheckInDates: [],
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('missed_workout');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        missedWorkouts: 0,
        noRecentActivity: true,
      }),
    );
  });

  it('detects low nutrition adherence', async () => {
    arrangeUserProfile();
    arrangeNutritionRecommendation(35);

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.notificationDecision.type.value).toBe('nutrition_reminder');
    expect(
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext,
    ).toEqual(
      expect.objectContaining({
        nutritionAdherence: 35,
      }),
    );
  });

  it.each([
    {
      label: 'low',
      events: [],
    },
    {
      label: 'medium',
      events: ['dismissed', 'opened', 'clicked', 'opened'],
    },
    {
      label: 'high',
      events: [
        'dismissed',
        'dismissed',
        'dismissed',
        'dismissed',
        'opened',
        'dismissed',
        'dismissed',
        'opened',
      ],
      expectedFatigueLevel: 'high' as const,
    },
  ])(
    'classifies fatigue as $label from recent engagement events',
    async ({ events }) => {
      arrangeUserProfile();
      arrangeEngagementEvents(events);

      const result = await useCase.execute({ authUserId: 'auth_user_123' });

      expect(
        notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
          .sourceContext,
      ).toEqual(
        expect.objectContaining({
          recentEngagementEventsCount: events.length,
        }),
      );
      expect(result.notificationDecision.influences[0].code).toBeDefined();
    },
  );

  it('rejects requests without a user profile', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: BUILD_NOTIFICATION_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('does not persist raw context fields', async () => {
    arrangeUserProfile();
    arrangeCoachDecision('motivation', 'Keep going', [
      {
        code: 'LOW_ENGAGEMENT',
        label: 'Low engagement',
        impact: 'negative',
        source: 'coach',
      },
    ]);

    await useCase.execute({ authUserId: 'auth_user_123' });

    const sourceContext =
      notificationDecisionRepository.upsertDailyDecision.mock.calls[0][0]
        .sourceContext;

    expect(sourceContext).not.toHaveProperty('authUserId');
    expect(sourceContext).not.toHaveProperty('userProfileId');
    expect(sourceContext).not.toHaveProperty('coachDecisionInfluences');
    expect(sourceContext).not.toHaveProperty('goal');
  });

  function seedNeutralState() {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);
    coachDecisionRepository.findLatestByUserProfileId.mockResolvedValue(null);
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    adaptiveTrainingRecommendationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    goalRepository.findActiveByUserProfileId.mockResolvedValue(null);
    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue(null);
    goalMilestoneRepository.findManyByGoalId.mockResolvedValue([]);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue([]);
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue([]);
  }

  function arrangeUserProfile(profileId = 'profile_123') {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: profileId,
      authUserId:
        profileId === 'profile_123' ? 'auth_user_123' : 'auth_user_456',
      name: 'Alex',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
  }

  function arrangeCoachDecision(
    priority:
      | 'recovery'
      | 'nutrition'
      | 'training'
      | 'consistency'
      | 'motivation',
    headline = 'Keep building',
    influences: Array<{
      code: 'LOW_ENGAGEMENT' | 'COACH_CONSISTENCY_NUDGE' | 'LOW_READINESS';
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      source: 'coach' | 'recovery' | 'activity' | 'goal' | 'nutrition';
    }> = [
      {
        code: 'COACH_CONSISTENCY_NUDGE',
        label: 'Coach consistency nudge',
        impact: 'neutral',
        source: 'coach',
      },
    ],
  ) {
    coachDecisionRepository.findLatestByUserProfileId.mockResolvedValue({
      id: 'coach_decision_123',
      priority: { value: priority },
      headline,
      influences: influences.map(
        (influence) => new NotificationInfluence(influence),
      ),
    } as never);
  }

  function arrangeRecoverySnapshot(overrides: {
    readinessScore: number;
    fatigueScore: number;
  }) {
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue({
      readinessScore: overrides.readinessScore,
      fatigueScore: overrides.fatigueScore,
    } as never);
  }

  function arrangeAdaptiveTrainingRecommendation(
    recommendationType:
      | 'rest_day'
      | 'increase_intensity'
      | 'maintain'
      | 'reduce_volume',
  ) {
    adaptiveTrainingRecommendationRepository.findLatestByUserProfileId.mockResolvedValue(
      {
        recommendationType,
      } as never,
    );
  }

  function arrangeGoal(input: {
    type:
      | 'lose_weight'
      | 'gain_muscle'
      | 'maintain_weight'
      | 'improve_consistency'
      | 'improve_recovery';
    status: 'active' | 'achieved' | 'abandoned';
    progressPercentage: number;
    trend: 'improving' | 'stable' | 'declining';
    milestoneTargets: number[];
  }) {
    goalRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'goal_123',
      userProfileId: 'profile_123',
      type: input.type,
      status: { value: input.status },
      startDate: new Date('2026-06-01T00:00:00.000Z'),
      targetDate: undefined,
      achievedAt:
        input.status === 'achieved'
          ? new Date('2026-06-03T00:00:00.000Z')
          : undefined,
      targetValue: 72,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    } as never);

    goalProgressSnapshotRepository.findLatestByGoalId.mockResolvedValue({
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      date: '2026-06-03',
      progressPercentage: input.progressPercentage,
      currentValue: 80,
      targetValue: 72,
      trend: { value: input.trend },
      sourceContext: { formulaVersion: 'goal-deterministic-v1' },
      formulaVersion: 'goal-deterministic-v1',
    } as never);

    goalMilestoneRepository.findManyByGoalId.mockResolvedValue(
      input.milestoneTargets.map((targetValue) => ({
        goalId: 'goal_123',
        type: {
          value:
            input.type === 'improve_consistency'
              ? 'streak'
              : input.type === 'improve_recovery'
                ? 'recovery'
                : 'weight_target',
        },
        title: `${targetValue}% goal milestone`,
        targetValue,
        achieved: input.progressPercentage >= targetValue,
        achievedAt:
          input.progressPercentage >= targetValue
            ? new Date('2026-06-03T00:00:00.000Z')
            : undefined,
      })) as never,
    );
  }

  function arrangeNutritionRecommendation(adherenceScore: number) {
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [
        {
          contextSnapshot: {
            adherenceScore,
          },
        },
      ] as never,
    );
  }

  function arrangeTrainingPlanAndActivity(input: {
    weeklyScheduleDays: number;
    recentWorkoutDates: string[];
    recentCheckInDates: string[];
  }) {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'fitness_123',
    } as never);

    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue({
      id: 'training_plan_123',
      weeklySchedule: Array.from(
        { length: input.weeklyScheduleDays },
        (_, index) => ({
          dayOfWeek: index,
        }),
      ),
    } as never);

    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      input.recentWorkoutDates.map((date) => ({
        date,
      })) as never,
    );

    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue(
      input.recentCheckInDates.map((date) => ({
        createdAt: new Date(`${date}T12:00:00.000Z`),
      })) as never,
    );
  }

  function arrangeEngagementEvents(
    types: Array<
      'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed'
    >,
  ) {
    engagementEventRepository.findRecentByUserProfileId.mockResolvedValue(
      types.map((type, index) => ({
        id: `event_${index}`,
        userProfileId: 'profile_123',
        notificationDecisionId: 'notification_123',
        type,
        occurredAt: new Date(`2026-06-03T0${index}:00:00.000Z`),
        metadata: {
          surface: 'dashboard',
        },
      })) as never,
    );
  }

  function buildPersistedDecision(
    input: UpsertNotificationDecisionRepositoryInput,
  ): NotificationDecision {
    return new NotificationDecision({
      id: 'notification_123',
      userProfileId: input.userProfileId,
      date: input.date,
      type: input.type,
      priority: input.priority,
      channel: input.channel,
      status: input.status,
      title: input.title,
      message: input.message,
      actionLabel: input.actionLabel,
      actionTarget: input.actionTarget,
      influences: input.influences.map(
        (influence) => new NotificationInfluence(influence),
      ),
      sourceContext: input.sourceContext,
      suppressed: input.suppressed ?? false,
      suppressionReasons: input.suppressionReasons ?? [],
      fatigueLevel: input.fatigueLevel ?? 'low',
      formulaVersion: input.formulaVersion,
      generatedBy: input.generatedBy,
      createdAt: new Date('2026-06-03T10:00:00.000Z'),
      updatedAt: new Date('2026-06-03T10:00:00.000Z'),
    });
  }

  function buildUserProfileRepository() {
    return {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
  }

  function buildCoachDecisionRepository() {
    return {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      findById: jest.fn(),
      upsertDailyDecision: jest.fn(),
    } as unknown as jest.Mocked<CoachDecisionRepository>;
  }

  function buildRecoverySnapshotRepository() {
    return {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<RecoverySnapshotRepository>;
  }

  function buildAdaptiveTrainingRecommendationRepository() {
    return {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      upsertDailyRecommendation: jest.fn(),
    } as unknown as jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  }

  function buildGoalRepository() {
    return {
      findActiveByUserProfileId: jest.fn(),
      findById: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      create: jest.fn(),
      replaceActiveGoal: jest.fn(),
      markAchieved: jest.fn(),
      markAbandoned: jest.fn(),
    } as unknown as jest.Mocked<GoalRepository>;
  }

  function buildGoalProgressSnapshotRepository() {
    return {
      findByGoalIdAndDate: jest.fn(),
      findLatestByGoalId: jest.fn(),
      findManyByGoalId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<GoalProgressSnapshotRepository>;
  }

  function buildGoalMilestoneRepository() {
    return {
      findManyByGoalId: jest.fn(),
      createMany: jest.fn(),
      markAchieved: jest.fn(),
    } as unknown as jest.Mocked<GoalMilestoneRepository>;
  }

  function buildNutritionRecommendationRepository() {
    return {
      create: jest.fn(),
      findManyByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<NutritionRecommendationRepository>;
  }

  function buildFitnessProfileRepository() {
    return {
      findActiveByUserProfileId: jest.fn(),
      findById: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<FitnessProfileRepository>;
  }

  function buildTrainingPlanRepository() {
    return {
      findActiveByFitnessProfileId: jest.fn(),
      findById: jest.fn(),
      findManyByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TrainingPlanRepository>;
  }

  function buildWorkoutLogRepository() {
    return {
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<WorkoutLogRepository>;
  }

  function buildDailyCheckInRepository() {
    return {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<DailyCheckInRepository>;
  }

  function buildEngagementEventRepository() {
    return {
      create: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findManyByNotificationDecisionId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<EngagementEventRepository>;
  }

  function buildNotificationDecisionRepository() {
    return {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      upsertDailyDecision: jest.fn(),
    } as unknown as jest.Mocked<NotificationDecisionRepository>;
  }
});
