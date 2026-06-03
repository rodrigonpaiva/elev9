import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachDecisionRepository } from '../../../domain/repositories/coach-decision.repository';
import { CoachDecisionCalculatorService } from '../../services/coach-decision-calculator.service';
import { CoachDecisionDateService } from '../../services/coach-decision-date.service';
import { BuildCoachDecisionUseCase } from './build-coach-decision.use-case';
import { GetCurrentRecoveryUseCase } from '../../../../recovery/application/use-cases/get-current-recovery/get-current-recovery.use-case';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetCurrentAdaptiveTrainingUseCase } from '../../../../training/application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { WorkoutLogRepository } from '../../../../progress/domain/repositories/workout-log.repository';
import { NutritionRecommendationRepository } from '../../../../nutrition/domain/repositories/nutrition-recommendation.repository';

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
      calculator,
      dateService,
    );
  });

  it('builds and persists a coach decision with all signals', async () => {
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
    expect(coachDecisionRepository.upsertDailyDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        date: '2026-06-03',
        nutritionRecommendationId: 'nutrition_123',
        adaptiveTrainingRecommendationId: 'adaptive_123',
        generatedBy: 'deterministic',
        llmMetadata: { used: false },
      }),
    );
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
    expect(calls[0]?.[0].date).toBe('2026-06-03');
    expect(calls[1]?.[0].date).toBe('2026-06-03');
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
