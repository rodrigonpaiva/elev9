import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { NotificationDecision } from '../../../../notifications/domain/entities/notification-decision.entity';
import { CoachDecisionRepository } from '../../../domain/repositories/coach-decision.repository';
import { CoachDecisionCalculatorService } from '../../services/coach-decision-calculator.service';
import { CoachDecisionDateService } from '../../services/coach-decision-date.service';
import { BuildCoachDecisionUseCase } from './build-coach-decision.use-case';
import { GetCurrentRecoveryUseCase } from '../../../../recovery/application/use-cases/get-current-recovery/get-current-recovery.use-case';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetCurrentAdaptiveTrainingUseCase } from '../../../../training/application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { WorkoutLogRepository } from '../../../../progress/domain/repositories/workout-log.repository';
import { NutritionRecommendationRepository } from '../../../../nutrition/domain/repositories/nutrition-recommendation.repository';
import { NotificationInfluence } from '../../../../notifications/domain/value-objects/notification-influence.value-object';

describe('BuildCoachDecisionUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let nutritionRecommendationRepository: jest.Mocked<NutritionRecommendationRepository>;
  let coachDecisionRepository: jest.Mocked<CoachDecisionRepository>;
  let getCurrentRecoveryUseCase: jest.Mocked<GetCurrentRecoveryUseCase>;
  let getCurrentGoalUseCase: jest.Mocked<GetCurrentGoalUseCase>;
  let getCurrentAdaptiveTrainingUseCase: jest.Mocked<GetCurrentAdaptiveTrainingUseCase>;
  let getCurrentNotificationUseCase: jest.Mocked<GetCurrentNotificationUseCase>;
  let getEngagementSummaryUseCase: jest.Mocked<GetEngagementSummaryUseCase>;
  let getCurrentHabitsUseCase: jest.Mocked<GetCurrentHabitsUseCase>;
  let getConsistencySummaryUseCase: jest.Mocked<GetConsistencySummaryUseCase>;
  let getHabitRiskSignalsUseCase: jest.Mocked<GetHabitRiskSignalsUseCase>;
  let getCurrentPersonalizationUseCase: jest.Mocked<GetCurrentPersonalizationUseCase>;
  let getUserBehaviorProfileUseCase: jest.Mocked<GetUserBehaviorProfileUseCase>;
  let getBehavioralPatternsUseCase: jest.Mocked<GetBehavioralPatternsUseCase>;
  let useCase: BuildCoachDecisionUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    fitnessProfileRepository = {
      findActiveByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<FitnessProfileRepository>;
    trainingPlanRepository = {
      findActiveByFitnessProfileId: jest.fn(),
    } as unknown as jest.Mocked<TrainingPlanRepository>;
    workoutLogRepository = {
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
    } as unknown as jest.Mocked<WorkoutLogRepository>;
    nutritionRecommendationRepository = {
      findManyByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<NutritionRecommendationRepository>;
    coachDecisionRepository = {
      upsertDailyDecision: jest.fn(),
    } as unknown as jest.Mocked<CoachDecisionRepository>;
    getCurrentRecoveryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentRecoveryUseCase>;
    getCurrentGoalUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentGoalUseCase>;
    getCurrentAdaptiveTrainingUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentAdaptiveTrainingUseCase>;
    getCurrentNotificationUseCase = {
      execute: jest.fn().mockResolvedValue({
        notificationDecision: undefined,
      }),
    } as unknown as jest.Mocked<GetCurrentNotificationUseCase>;
    getEngagementSummaryUseCase = {
      execute: jest.fn().mockResolvedValue({
        engagementSummary: undefined,
      }),
    } as unknown as jest.Mocked<GetEngagementSummaryUseCase>;
    getCurrentHabitsUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    } as unknown as jest.Mocked<GetCurrentHabitsUseCase>;
    getConsistencySummaryUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    } as unknown as jest.Mocked<GetConsistencySummaryUseCase>;
    getHabitRiskSignalsUseCase = {
      execute: jest.fn().mockResolvedValue({} as never),
    } as unknown as jest.Mocked<GetHabitRiskSignalsUseCase>;
    getCurrentPersonalizationUseCase = {
      execute: jest.fn().mockResolvedValue({
        personalizationSnapshot: undefined,
      }),
    } as unknown as jest.Mocked<GetCurrentPersonalizationUseCase>;
    getUserBehaviorProfileUseCase = {
      execute: jest.fn().mockResolvedValue({
        userBehaviorProfile: undefined,
      }),
    } as unknown as jest.Mocked<GetUserBehaviorProfileUseCase>;
    getBehavioralPatternsUseCase = {
      execute: jest.fn().mockResolvedValue({
        behavioralPatterns: [],
      }),
    } as unknown as jest.Mocked<GetBehavioralPatternsUseCase>;

    const calculator = new CoachDecisionCalculatorService();
    const dateService = new CoachDecisionDateService();

    useCase = new BuildCoachDecisionUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      nutritionRecommendationRepository,
      coachDecisionRepository,
      getCurrentRecoveryUseCase,
      getCurrentGoalUseCase,
      getCurrentAdaptiveTrainingUseCase,
      getCurrentNotificationUseCase,
      getEngagementSummaryUseCase,
      getCurrentHabitsUseCase,
      getConsistencySummaryUseCase,
      getHabitRiskSignalsUseCase,
      getCurrentPersonalizationUseCase,
      getUserBehaviorProfileUseCase,
      getBehavioralPatternsUseCase,
      calculator,
      dateService,
    );
  });

  it('builds and persists a coach decision with all signals', async () => {
    const expectedDate = new CoachDecisionDateService().todayUtcDateString();

    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildFitnessProfile(),
    );
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      buildTrainingPlan(),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [buildWorkoutLog('2026-06-03')],
    );
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([
      buildWorkoutLog('2026-06-03'),
      buildWorkoutLog('2026-06-02'),
    ]);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue([
      buildNutritionRecommendation(),
    ]);
    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: buildRecoverySnapshot(),
    } as never);
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: buildAdaptiveTrainingRecommendation(),
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
    coachDecisionRepository.upsertDailyDecision.mockImplementation(async (input) =>
      new CoachDecision({
        id: 'decision_123',
        userProfileId: input.userProfileId,
        date: input.date,
        nutritionRecommendationId: input.nutritionRecommendationId,
        adaptiveTrainingRecommendationId: input.adaptiveTrainingRecommendationId,
        priority: input.priority,
        headline: input.headline,
        summary: input.summary,
        actionItems: input.actionItems,
        influences: input.influences.map((influence) => ({
          ...influence,
          toJSON: () => influence,
        })) as never,
        sourceContext: input.sourceContext,
        formulaVersion: input.formulaVersion,
        generatedBy: input.generatedBy,
        llmMetadata: input.llmMetadata,
        createdAt: new Date('2026-06-03T06:00:00.000Z'),
        updatedAt: new Date('2026-06-03T06:00:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(getCurrentRecoveryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(getCurrentAdaptiveTrainingUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(getCurrentNotificationUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(getEngagementSummaryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(coachDecisionRepository.upsertDailyDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        date: expectedDate,
        nutritionRecommendationId: 'nutrition_123',
        adaptiveTrainingRecommendationId: 'adaptive_123',
        generatedBy: 'deterministic',
        llmMetadata: { used: false },
      }),
    );
    const persistedInput = coachDecisionRepository.upsertDailyDecision.mock
      .calls[0][0];
    expect(persistedInput.sourceContext).not.toHaveProperty('authUserId');
    expect(persistedInput.sourceContext).not.toHaveProperty('rawHealthContext');
    expect(persistedInput.sourceContext).not.toHaveProperty('prompt');
    expect(result.coachDecision.id).toBe('decision_123');
    expect(result.coachDecision.generatedBy).toBe('deterministic');
  });

  it('uses neutral fallbacks when recovery, nutrition and progress are absent', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: undefined,
    } as never);
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: undefined,
    } as never);
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: undefined,
    } as never);
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: undefined,
    } as never);
    coachDecisionRepository.upsertDailyDecision.mockImplementation(async (input) =>
      new CoachDecision({
        id: 'decision_123',
        userProfileId: input.userProfileId,
        date: input.date,
        priority: input.priority,
        headline: input.headline,
        summary: input.summary,
        actionItems: input.actionItems,
        influences: input.influences.map((influence) => ({
          ...influence,
          toJSON: () => influence,
        })) as never,
        sourceContext: input.sourceContext,
        formulaVersion: input.formulaVersion,
        generatedBy: input.generatedBy,
        createdAt: new Date('2026-06-03T06:00:00.000Z'),
        updatedAt: new Date('2026-06-03T06:00:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(result.coachDecision.priority).toBe('motivation');
    expect(result.coachDecision.generatedBy).toBe('deterministic');
    expect(result.coachDecision.sourceContext).toMatchObject({
      readinessScore: 50,
      fatigueScore: 50,
      nutritionAdherence: 50,
      currentStreak: 0,
      missedWorkouts: 0,
      noRecentActivity: false,
      formulaVersion: 'coach-decision-v1',
      generatedAt: expect.any(String),
    });
    const persistedInput = coachDecisionRepository.upsertDailyDecision.mock
      .calls[0][0];
    expect(persistedInput.sourceContext).not.toHaveProperty('authUserId');
    expect(persistedInput.sourceContext).not.toHaveProperty('rawHealthContext');
    expect(persistedInput.sourceContext).not.toHaveProperty('prompt');
  });

  it('includes habit signals when available and does not override recovery', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: undefined,
    } as never);
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: undefined,
    } as never);
    getCurrentNotificationUseCase.execute.mockResolvedValue({
      notificationDecision: undefined,
    } as never);
    getEngagementSummaryUseCase.execute.mockResolvedValue({
      engagementSummary: undefined,
    } as never);
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: buildHabitSnapshot({
        consistencyScore: 38,
        streakDays: 1,
        trend: 'declining',
      }),
    } as never);
    getConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: buildConsistencySummary({
        score: 38,
        trend: 'declining',
        currentStreak: 1,
        riskLevel: 'high',
      }),
    } as never);
    getHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [
        buildHabitRiskSignal({
          type: 'dropout_risk',
          level: 'high',
        }),
      ],
    } as never);
    coachDecisionRepository.upsertDailyDecision.mockImplementation(async (input) =>
      new CoachDecision({
        id: 'decision_123',
        userProfileId: input.userProfileId,
        date: input.date,
        priority: input.priority,
        headline: input.headline,
        summary: input.summary,
        actionItems: input.actionItems,
        influences: input.influences.map((influence) => ({
          ...influence,
          toJSON: () => influence,
        })) as never,
        sourceContext: input.sourceContext,
        formulaVersion: input.formulaVersion,
        generatedBy: input.generatedBy,
        createdAt: new Date('2026-06-03T06:00:00.000Z'),
        updatedAt: new Date('2026-06-03T06:00:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(result.coachDecision.priority).toBe('consistency');
    expect(result.coachDecision.influences.map((influence) => influence.code)).toEqual(
      expect.arrayContaining([
        'HABIT_CONSISTENCY_DECLINING',
        'HABIT_RISK_HIGH',
        'HABIT_DROPOUT_RISK',
      ]),
    );
    expect(result.coachDecision.sourceContext).toMatchObject({
      habitConsistencyScore: 38,
      habitTrend: 'declining',
      habitCurrentStreak: 1,
      habitRiskLevel: 'high',
      habitRiskSignals: ['dropout_risk'],
    });
  });

  it('falls back to recovery priority when readiness is low', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildFitnessProfile(),
    );
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      buildTrainingPlan(),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: buildRecoverySnapshot({ readinessScore: 32 }),
    } as never);
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: undefined,
    } as never);
    coachDecisionRepository.upsertDailyDecision.mockResolvedValue(
      buildDecision(),
    );

    await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(coachDecisionRepository.upsertDailyDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'recovery',
      }),
    );
  });

  it('uses goal signals to influence priority and source context when no crisis exists', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildFitnessProfile(),
    );
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      buildTrainingPlan(),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: buildRecoverySnapshot({ readinessScore: 72 }),
    } as never);
    getCurrentGoalUseCase.execute.mockResolvedValue({
      goal: {
        id: 'goal_123',
        type: 'gain_muscle',
        status: { value: 'active' },
      },
      progressSnapshot: {
        progressPercentage: 48,
        trend: { value: 'declining' },
      },
      forecast: {
        confidence: { value: 'medium' },
      },
    } as never);
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: undefined,
    } as never);
    coachDecisionRepository.upsertDailyDecision.mockResolvedValue(
      buildDecision(),
    );

    await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(coachDecisionRepository.upsertDailyDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'consistency',
        sourceContext: expect.objectContaining({
          goalId: 'goal_123',
          goalType: 'gain_muscle',
          goalProgressPercentage: 48,
          goalTrend: 'declining',
          goalForecastConfidence: 'medium',
          goalMilestoneClose: false,
          goalAchievementReached: false,
        }),
      }),
    );
  });

  it('throws when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });

  it('uses the same date helper for idempotent builds', async () => {
    const expectedDate = new CoachDecisionDateService().todayUtcDateString();

    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildFitnessProfile(),
    );
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      buildTrainingPlan(),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);
    nutritionRecommendationRepository.findManyByUserProfileId.mockResolvedValue(
      [],
    );
    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: undefined,
    } as never);
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: undefined,
    } as never);
    coachDecisionRepository.upsertDailyDecision.mockResolvedValue(
      buildDecision(),
    );

    await useCase.execute({
      authUserId: 'auth_123',
    });
    await useCase.execute({
      authUserId: 'auth_123',
    });

    const calls = coachDecisionRepository.upsertDailyDecision.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0].date).toBe(expectedDate);
    expect(calls[1]?.[0].date).toBe(expectedDate);
  });
});

function buildUserProfile() {
  return {
    id: 'profile_123',
    authUserId: 'auth_123',
    name: 'Alex',
  } as never;
}

function buildFitnessProfile() {
  return {
    id: 'fitness_123',
  } as never;
}

function buildTrainingPlan() {
  return {
    id: 'training_123',
    weeklySchedule: [
      { dayIndex: 1, exercises: [] },
      { dayIndex: 2, exercises: [] },
      { dayIndex: 3, exercises: [] },
      { dayIndex: 4, exercises: [] },
      { dayIndex: 5, exercises: [] },
      { dayIndex: 6, exercises: [] },
      { dayIndex: 7, exercises: [] },
    ],
  } as never;
}

function buildWorkoutLog(date: string) {
  return {
    date,
    durationMinutes: 45,
  } as never;
}

function buildNutritionRecommendation() {
  return {
    id: 'nutrition_123',
    contextSnapshot: {
      adherenceScore: 86,
    },
  } as never;
}

function buildRecoverySnapshot(overrides: { readinessScore?: number } = {}) {
  return {
    id: 'recovery_123',
    readinessScore: overrides.readinessScore ?? 82,
    fatigueScore: 24,
    recoveryTrend: 'improving',
    recommendedIntensity: 'hard',
  } as never;
}

function buildAdaptiveTrainingRecommendation() {
  return {
    id: 'adaptive_123',
    recommendationType: 'increase_intensity',
    recommendedIntensity: 'hard',
  } as never;
}

function buildNotificationDecision() {
  return new NotificationDecision({
    id: 'notification_123',
    userProfileId: 'profile_123',
    date: '2026-06-03',
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
    ],
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
      generatedAt: '2026-06-03T06:00:00.000Z',
    },
    suppressed: false,
    suppressionReasons: [],
    fatigueLevel: 'low',
    formulaVersion: 'notification-engine-v1',
    generatedBy: 'deterministic',
    createdAt: new Date('2026-06-03T06:00:00.000Z'),
    updatedAt: new Date('2026-06-03T06:00:00.000Z'),
  });
}

function buildDecision() {
  return new CoachDecision({
    id: 'decision_123',
    userProfileId: 'profile_123',
    date: '2026-06-03',
    priority: 'recovery',
    headline: 'Recovery should be your focus today',
    summary: 'Recovery is the main priority because readiness is low.',
    actionItems: [
      'Reduce training intensity today',
      'Prioritize sleep tonight',
      'Keep hydration high',
    ],
    influences: [
      {
        code: 'LOW_READINESS',
        label: 'Readiness is low.',
        impact: 'negative',
        source: 'recovery',
      } as never,
    ] as never,
    sourceContext: {
      generatedAt: '2026-06-03T06:00:00.000Z',
    },
    formulaVersion: 'coach-decision-v1',
    generatedBy: 'deterministic',
    llmMetadata: { used: false },
    createdAt: new Date('2026-06-03T06:00:00.000Z'),
    updatedAt: new Date('2026-06-03T06:00:00.000Z'),
  });
}

function buildHabitSnapshot(overrides: {
  consistencyScore?: number;
  streakDays?: number;
  trend?: 'improving' | 'stable' | 'declining';
} = {}) {
  return {
    userProfileId: 'profile_123',
    date: '2026-06-03',
    consistencyScore: overrides.consistencyScore ?? 72,
    streakDays: overrides.streakDays ?? 4,
    adherenceScore: 76,
    trend: overrides.trend ?? 'stable',
    sourceContext: {
      formulaVersion: 'habit-engine-v1',
      generatedAt: '2026-06-03T06:00:00.000Z',
    },
    formulaVersion: 'habit-engine-v1',
    generatedAt: '2026-06-03T06:00:00.000Z',
  } as never;
}

function buildConsistencySummary(overrides: {
  score?: number;
  trend?: 'improving' | 'stable' | 'declining';
  currentStreak?: number;
  riskLevel?: 'low' | 'medium' | 'high';
} = {}) {
  return {
    userProfileId: 'profile_123',
    score: overrides.score ?? 72,
    trend: overrides.trend ?? 'stable',
    currentStreak: overrides.currentStreak ?? 4,
    longestStreak: 6,
    adherenceRate: 76,
    riskLevel: overrides.riskLevel ?? 'low',
    updatedAt: '2026-06-03T06:00:00.000Z',
    formulaVersion: 'habit-engine-v1',
  } as never;
}

function buildHabitRiskSignal(overrides: {
  type?: 'inactivity_pattern' | 'streak_at_risk' | 'declining_consistency' | 'dropout_risk';
  level?: 'low' | 'medium' | 'high';
} = {}) {
  return {
    userProfileId: 'profile_123',
    type: overrides.type ?? 'streak_at_risk',
    level: overrides.level ?? 'medium',
    title: 'Habit risk',
    description: 'A habit risk signal was generated.',
    generatedAt: '2026-06-03T06:00:00.000Z',
    formulaVersion: 'habit-engine-v1',
  } as never;
}
