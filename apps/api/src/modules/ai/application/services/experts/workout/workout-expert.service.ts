import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type {
  WorkoutAnalysis,
  WorkoutConfidence,
  WorkoutExpertContribution,
  WorkoutGoalAlignment,
  WorkoutPriority,
  WorkoutRecommendation,
  WorkoutRecommendationCode,
  WorkoutReadinessLevel,
  WorkoutRiskAssessment,
  WorkoutTrainingStatus,
} from './workout-expert.types';
import type {
  UserHealthContext,
  UserHealthContextTodayWorkout,
} from '../../context-builder/build-user-health-context.service';

const COACH_EXPERT_VERSION = '1.0.0';
const WORKOUT_EXPERT_ID = 'WorkoutExpert';

const RECOMMENDATION_PRIORITY: Record<WorkoutPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RECOMMENDATION_ORDER: readonly WorkoutRecommendationCode[] =
  Object.freeze([
    'REST_FIRST',
    'REDUCE_VOLUME',
    'REDUCE_INTENSITY',
    'PRIORITIZE_MOBILITY',
    'FOCUS_TECHNIQUE',
    'INCREASE_VOLUME',
    'AVOID_OVERHEAD_MOVEMENTS',
    'AVOID_LOWER_BACK_LOADING',
    'LIMIT_KNEE_DOMINANT_LOADING',
    'INCREASE_INTENSITY',
    'MAINTAIN_TODAY',
    'NO_WORKOUT_SCHEDULED',
  ]);

export class WorkoutExpert extends BaseCoachExpert {
  constructor() {
    super({
      id: WORKOUT_EXPERT_ID,
      displayName: 'Workout Expert',
      version: COACH_EXPERT_VERSION,
      category: 'TRAINING',
      supportedIntents: [
        'TRAINING',
        'RECOVERY',
        'GOALS',
        'PROGRESS',
        'PLANNING',
        'MOTIVATION',
      ],
      supportedDomains: ['training', 'recovery', 'goals', 'progress'],
      estimatedCost: 2,
      estimatedLatencyMs: 18,
      priority: 100,
      capabilities: [
        'TRAINING_SPECIALIST',
        'COACH_ROUTING',
        'CONTEXT_SYNTHESIS',
      ],
      enabled: true,
    });
  }

  override loadContext(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertContext {
    void input;
    const analysis = this.buildAnalysis(context);

    return Object.freeze({
      ...context,
      runtimeMetadata: Object.freeze({
        ...context.runtimeMetadata,
        workoutExpert: Object.freeze({
          expertId: this.metadata.id,
          trainingStatus: analysis.trainingStatus,
          readinessLevel: analysis.readinessLevel,
          priority: analysis.priority,
          goalAlignment: analysis.goalAlignment,
          confidence: analysis.confidence,
          riskLevel: analysis.riskAssessment.level,
          recommendationCodes: analysis.recommendations.map(
            (recommendation) => recommendation.code,
          ),
        }),
      }),
    });
  }

  override analyze(
    input: CoachExpertRequest,
    context: CoachExpertContext,
  ): CoachExpertResult {
    const analysis = this.buildAnalysis(context);
    const contribution = this.buildContribution(analysis, context);
    const contributions = this.buildContributions(contribution);

    return {
      expertId: this.metadata.id,
      summary: contribution.summary,
      contributions,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        category: this.metadata.category,
        priority: contribution.priority,
        intent: input.intent,
        selectedDomainCount: input.selectedDomains.length,
        selectionReason: context.selectionReason,
        runtimeMode: 'deterministic-domain-specialist',
        analysis: contribution.analysis,
        recommendations: contribution.recommendations,
        risks: contribution.risks,
        goalAlignment: contribution.goalAlignment,
        confidence: contribution.confidence,
      }),
    };
  }

  override contribute(
    input: CoachExpertRequest,
    context: CoachExpertContext,
    result: CoachExpertResult,
  ): readonly CoachExpertContribution[] {
    void input;
    void context;
    return result.contributions;
  }

  private buildAnalysis(context: CoachExpertContext): WorkoutAnalysis {
    const healthContext = context.healthContext;

    if (context.policyEvaluation?.decision.blocked || !healthContext) {
      return this.buildBlockedAnalysis(healthContext);
    }

    const todayWorkout = healthContext.todayWorkout ?? null;
    const recentWorkoutLogs = [...healthContext.recentWorkoutLogs];
    const workoutHistory = this.buildWorkoutHistory(
      recentWorkoutLogs,
      todayWorkout,
    );
    const completedWorkoutCount = recentWorkoutLogs.filter(
      (log) => log.completedExercises.length > 0,
    ).length;
    const activeInjuryCount = this.countActiveInjuries(
      healthContext.limitations,
    );
    const readinessLevel = this.resolveReadinessLevel(healthContext);
    const goalAlignment = this.resolveGoalAlignment(
      healthContext,
      todayWorkout,
    );
    const trainingStatus = this.resolveTrainingStatus(
      healthContext,
      todayWorkout,
      recentWorkoutLogs,
    );
    const adaptiveRecommendation = healthContext.adaptiveTrainingRecommendation
      ? Object.freeze({
          recommendationType:
            healthContext.adaptiveTrainingRecommendation.recommendationType,
          recommendedIntensity:
            healthContext.adaptiveTrainingRecommendation.recommendedIntensity,
          volumeAction:
            healthContext.adaptiveTrainingRecommendation.volumeAction,
          reasoning: healthContext.adaptiveTrainingRecommendation.reasoning,
        })
      : undefined;
    const riskAssessment = this.assessRisk({
      readinessLevel,
      activeInjuryCount,
      trainingStatus,
      adaptiveRecommendation,
      recentWorkoutLogs,
      healthContext,
    });
    const recommendations = this.buildRecommendations({
      trainingStatus,
      readinessLevel,
      activeInjuryCount,
      adaptiveRecommendation,
      healthContext,
    });
    const priority = this.resolvePriority({
      riskAssessment,
      readinessLevel,
      trainingStatus,
      activeInjuryCount,
    });
    const confidence = this.resolveConfidence({
      healthContext,
      trainingStatus,
      adaptiveRecommendation: adaptiveRecommendation ?? null,
      activeInjuryCount,
    });
    const signals = this.buildSignals({
      trainingStatus,
      readinessLevel,
      goalAlignment,
      activeInjuryCount,
      completedWorkoutCount,
      healthContext,
      adaptiveRecommendation,
    });

    return Object.freeze({
      trainingStatus,
      readinessLevel,
      adaptiveRecommendation,
      goalAlignment,
      priority,
      confidence,
      riskAssessment,
      recommendations: Object.freeze(recommendations),
      activeInjuryCount,
      limitationCount: healthContext.limitations.length,
      equipmentCount: healthContext.availableEquipment.length,
      recentWorkoutCount: recentWorkoutLogs.length,
      completedWorkoutCount,
      workoutHistory: Object.freeze(workoutHistory),
      todayWorkout: todayWorkout
        ? Object.freeze({
            dayIndex: todayWorkout.dayIndex,
            title: todayWorkout.title,
            focus: todayWorkout.focus,
            format: todayWorkout.format,
            intensity: todayWorkout.intensity,
            exerciseCount: todayWorkout.exercises.length,
          })
        : null,
      signals: Object.freeze(signals),
    });
  }

  private buildBlockedAnalysis(
    healthContext?: UserHealthContext,
  ): WorkoutAnalysis {
    const factors = ['policy_blocked'];

    if (!healthContext) {
      factors.push('missing_health_context');
    }

    const riskAssessment: WorkoutRiskAssessment = Object.freeze({
      level: 'CRITICAL',
      summary:
        'Workout analysis is blocked by policy or missing trusted health context.',
      factors: Object.freeze(factors),
      metadata: Object.freeze({
        policyBlocked: true,
        healthContextAvailable: Boolean(healthContext),
      }),
    });

    return Object.freeze({
      trainingStatus: 'unavailable',
      readinessLevel: 'LOW',
      goalAlignment: 'unknown',
      priority: 'CRITICAL',
      confidence: 'LOW',
      riskAssessment,
      recommendations: Object.freeze([]),
      activeInjuryCount: 0,
      limitationCount: healthContext?.limitations.length ?? 0,
      equipmentCount: healthContext?.availableEquipment.length ?? 0,
      recentWorkoutCount: healthContext?.recentWorkoutLogs.length ?? 0,
      completedWorkoutCount: 0,
      workoutHistory: Object.freeze([]),
      todayWorkout: healthContext?.todayWorkout ?? null,
      signals: Object.freeze([
        'analysis_blocked_by_policy',
        `health_context_available=${Boolean(healthContext)}`,
      ]),
    });
  }

  private buildContribution(
    analysis: WorkoutAnalysis,
    context: CoachExpertContext,
  ): WorkoutExpertContribution {
    const selectedRecommendation = this.selectPrimaryRecommendation(
      analysis.recommendations,
      analysis.trainingStatus,
    );

    return Object.freeze({
      expertId: this.metadata.id,
      summary: this.buildSummary(analysis, selectedRecommendation),
      analysis,
      recommendations: analysis.recommendations,
      risks: Object.freeze([analysis.riskAssessment]),
      goalAlignment: analysis.goalAlignment,
      confidence: analysis.confidence,
      priority: analysis.priority,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        selectionReason: context.selectionReason,
        trainingStatus: analysis.trainingStatus,
        readinessLevel: analysis.readinessLevel,
        riskLevel: analysis.riskAssessment.level,
        goalAlignment: analysis.goalAlignment,
        confidence: analysis.confidence,
        recommendationCodes: analysis.recommendations.map(
          (recommendation) => recommendation.code,
        ),
        activeInjuryCount: analysis.activeInjuryCount,
        limitationCount: analysis.limitationCount,
        equipmentCount: analysis.equipmentCount,
        recentWorkoutCount: analysis.recentWorkoutCount,
        completedWorkoutCount: analysis.completedWorkoutCount,
      }),
    });
  }

  private buildContributions(
    contribution: WorkoutExpertContribution,
  ): readonly CoachExpertContribution[] {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      contribution.recommendations,
      contribution.analysis.trainingStatus,
    );

    return Object.freeze([
      Object.freeze({
        expertId: this.metadata.id,
        type: 'ANALYSIS',
        summary: contribution.summary,
        metadata: Object.freeze({
          workoutContribution: contribution,
          kind: 'analysis',
        }),
      }),
      Object.freeze({
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: primaryRecommendation.summary,
        metadata: Object.freeze({
          workoutContribution: contribution,
          kind: 'contribution',
          recommendationCode: primaryRecommendation.code,
        }),
      }),
    ]);
  }

  private buildSummary(
    analysis: WorkoutAnalysis,
    recommendation: WorkoutRecommendation,
  ): string {
    return [
      `status=${analysis.trainingStatus}`,
      `readiness=${analysis.readinessLevel}`,
      `risk=${analysis.riskAssessment.level}`,
      `priority=${analysis.priority}`,
      `confidence=${analysis.confidence}`,
      `recommendation=${recommendation.code}`,
      `goal=${analysis.goalAlignment}`,
    ].join('; ');
  }

  private buildSignals(input: {
    trainingStatus: WorkoutTrainingStatus;
    readinessLevel: WorkoutReadinessLevel;
    goalAlignment: WorkoutGoalAlignment;
    activeInjuryCount: number;
    completedWorkoutCount: number;
    healthContext: UserHealthContext;
    adaptiveRecommendation?: NonNullable<
      WorkoutAnalysis['adaptiveRecommendation']
    >;
  }): string[] {
    const signals = [
      `training_status=${input.trainingStatus}`,
      `readiness_level=${input.readinessLevel}`,
      `goal_alignment=${input.goalAlignment}`,
      `active_injury_count=${input.activeInjuryCount}`,
      `completed_workout_count=${input.completedWorkoutCount}`,
      `available_equipment_count=${input.healthContext.availableEquipment.length}`,
      `limitation_count=${input.healthContext.limitations.length}`,
      `recent_workout_count=${input.healthContext.recentWorkoutLogs.length}`,
    ];

    if (typeof input.healthContext.readinessScore === 'number') {
      signals.push(`readiness_score=${input.healthContext.readinessScore}`);
    }

    if (typeof input.healthContext.fatigueScore === 'number') {
      signals.push(`fatigue_score=${input.healthContext.fatigueScore}`);
    }

    if (input.healthContext.goal) {
      signals.push(`goal=${input.healthContext.goal}`);
    }

    if (input.adaptiveRecommendation) {
      signals.push(
        `adaptive_recommendation=${input.adaptiveRecommendation.recommendationType}`,
      );
      signals.push(
        `adaptive_intensity=${input.adaptiveRecommendation.recommendedIntensity}`,
      );
      signals.push(
        `adaptive_volume_action=${input.adaptiveRecommendation.volumeAction}`,
      );
    }

    return signals;
  }

  private buildWorkoutHistory(
    logs: readonly UserHealthContext['recentWorkoutLogs'],
    todayWorkout: UserHealthContextTodayWorkout | null,
  ): WorkoutAnalysis['workoutHistory'] {
    return [...logs]
      .sort((left, right) => {
        if (left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }

        return left.workoutDayIndex - right.workoutDayIndex;
      })
      .map((log) => {
        const isTodayWorkout = todayWorkout
          ? log.workoutDayIndex === todayWorkout.dayIndex
          : false;
        const plannedExercises = isTodayWorkout
          ? todayWorkout.exercises.length
          : log.completedExercises.length;

        return Object.freeze({
          workoutDayIndex: log.workoutDayIndex,
          completedExercises: log.completedExercises.length,
          plannedExercises,
          durationMinutes: log.durationMinutes,
          date: log.date,
        });
      });
  }

  private countActiveInjuries(
    limitations: readonly UserHealthContext['limitations'],
  ): number {
    return limitations.filter((limitation) =>
      this.isActiveInjury(limitation.type, limitation.description),
    ).length;
  }

  private isActiveInjury(type: string, description?: string): boolean {
    const token = `${type} ${description ?? ''}`.toLowerCase();
    return [
      'injury',
      'pain',
      'strain',
      'sprain',
      'soreness',
      'shoulder',
      'back',
      'knee',
      'ankle',
      'hip',
      'wrist',
      'elbow',
      'neck',
      'overhead',
    ].some((keyword) => token.includes(keyword));
  }

  private resolveReadinessLevel(
    healthContext: UserHealthContext,
  ): WorkoutReadinessLevel {
    const readinessScore = healthContext.recoverySnapshot?.readinessScore;

    if (typeof readinessScore === 'number') {
      if (readinessScore >= 75) {
        return 'HIGH';
      }

      if (readinessScore >= 45) {
        return 'MEDIUM';
      }

      return 'LOW';
    }

    if (healthContext.fatigueLevel === 'LOW') {
      return 'HIGH';
    }

    if (healthContext.fatigueLevel === 'MODERATE') {
      return 'MEDIUM';
    }

    if (healthContext.fatigueLevel === 'HIGH') {
      return 'LOW';
    }

    const recommendedIntensity = healthContext.recommendedIntensity;
    if (recommendedIntensity === 'hard') {
      return 'HIGH';
    }

    if (recommendedIntensity === 'moderate') {
      return 'MEDIUM';
    }

    if (
      recommendedIntensity === 'light' ||
      recommendedIntensity === 'recovery'
    ) {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  private resolveGoalAlignment(
    healthContext: UserHealthContext,
    todayWorkout: UserHealthContextTodayWorkout | null,
  ): WorkoutGoalAlignment {
    const workoutText =
      `${todayWorkout?.title ?? ''} ${todayWorkout?.focus ?? ''} ${todayWorkout?.format ?? ''}`.toLowerCase();

    if (workoutText.includes('strength') || workoutText.includes('power')) {
      return 'strength';
    }

    if (
      workoutText.includes('endurance') ||
      workoutText.includes('cardio') ||
      workoutText.includes('conditioning')
    ) {
      return 'endurance';
    }

    switch (healthContext.goal) {
      case 'lose_weight':
        return 'fat_loss';
      case 'gain_muscle':
        return 'muscle_gain';
      case 'maintain':
        return 'maintenance';
      default:
        return 'unknown';
    }
  }

  private resolveTrainingStatus(
    healthContext: UserHealthContext,
    todayWorkout: UserHealthContextTodayWorkout | null,
    recentWorkoutLogs: readonly UserHealthContext['recentWorkoutLogs'],
  ): WorkoutTrainingStatus {
    if (!todayWorkout) {
      return 'unavailable';
    }

    const matchingLog = recentWorkoutLogs.find(
      (log) => log.workoutDayIndex === todayWorkout.dayIndex,
    );

    if (matchingLog) {
      if (matchingLog.completedExercises.length === 0) {
        return 'skipped';
      }

      if (
        matchingLog.completedExercises.length >= todayWorkout.exercises.length
      ) {
        return 'completed';
      }

      return 'partially_completed';
    }

    const missingSession =
      healthContext.adherenceScore <= 40 &&
      healthContext.currentStreak === 0 &&
      recentWorkoutLogs.length === 0;

    return missingSession ? 'skipped' : 'scheduled';
  }

  private assessRisk(input: {
    readinessLevel: WorkoutReadinessLevel;
    activeInjuryCount: number;
    trainingStatus: WorkoutTrainingStatus;
    adaptiveRecommendation?: NonNullable<
      WorkoutAnalysis['adaptiveRecommendation']
    >;
    recentWorkoutLogs: readonly UserHealthContext['recentWorkoutLogs'];
    healthContext: UserHealthContext;
  }): WorkoutRiskAssessment {
    const factors: string[] = [];
    let level: WorkoutPriority = 'LOW';

    if (input.trainingStatus === 'unavailable') {
      factors.push('no_scheduled_workout');
    }

    if (input.readinessLevel === 'LOW') {
      factors.push('low_readiness');
    }

    if ((input.healthContext.fatigueScore ?? 0) >= 85) {
      factors.push('high_fatigue');
    }

    if (input.activeInjuryCount > 0) {
      factors.push('active_injury_or_limitation');
    }

    if (input.trainingStatus === 'skipped') {
      factors.push('missed_workout');
    }

    if (
      input.adaptiveRecommendation &&
      ['rest_day', 'recovery_workout', 'reschedule_workout'].includes(
        input.adaptiveRecommendation.recommendationType,
      )
    ) {
      factors.push(
        `adaptive_${input.adaptiveRecommendation.recommendationType}`,
      );
    }

    if (
      input.readinessLevel === 'LOW' &&
      (input.activeInjuryCount > 0 ||
        (input.healthContext.fatigueScore ?? 0) >= 85)
    ) {
      level = 'CRITICAL';
    } else if (
      input.trainingStatus === 'skipped' ||
      input.activeInjuryCount > 0 ||
      input.readinessLevel === 'LOW'
    ) {
      level = 'HIGH';
    } else if (
      input.trainingStatus === 'partially_completed' ||
      input.readinessLevel === 'MEDIUM' ||
      input.recentWorkoutLogs.length > 0
    ) {
      level = 'MEDIUM';
    }

    if (
      input.trainingStatus === 'completed' &&
      input.readinessLevel === 'HIGH' &&
      input.activeInjuryCount === 0
    ) {
      level = 'LOW';
    }

    if ((input.healthContext.fatigueScore ?? 0) >= 95) {
      level = 'CRITICAL';
    }

    if ((input.healthContext.recoverySnapshot?.readinessScore ?? 100) <= 20) {
      level = 'CRITICAL';
    }

    return Object.freeze({
      level,
      summary: this.buildRiskSummary(level, factors),
      factors: Object.freeze([...new Set(factors)]),
      metadata: Object.freeze({
        readinessLevel: input.readinessLevel,
        activeInjuryCount: input.activeInjuryCount,
        trainingStatus: input.trainingStatus,
        fatigueScore: input.healthContext.fatigueScore ?? null,
        readinessScore:
          input.healthContext.recoverySnapshot?.readinessScore ?? null,
      }),
    });
  }

  private resolvePriority(input: {
    riskAssessment: WorkoutRiskAssessment;
    readinessLevel: WorkoutReadinessLevel;
    trainingStatus: WorkoutTrainingStatus;
    activeInjuryCount: number;
  }): WorkoutPriority {
    if (input.riskAssessment.level === 'CRITICAL') {
      return 'CRITICAL';
    }

    if (input.riskAssessment.level === 'HIGH') {
      return 'HIGH';
    }

    if (input.riskAssessment.level === 'MEDIUM') {
      return 'MEDIUM';
    }

    if (
      input.trainingStatus === 'completed' &&
      input.readinessLevel === 'HIGH' &&
      input.activeInjuryCount === 0
    ) {
      return 'LOW';
    }

    return 'LOW';
  }

  private resolveConfidence(input: {
    healthContext: UserHealthContext;
    trainingStatus: WorkoutTrainingStatus;
    adaptiveRecommendation: NonNullable<
      WorkoutAnalysis['adaptiveRecommendation']
    > | null;
    activeInjuryCount: number;
  }): WorkoutConfidence {
    let score = 0;

    if (input.healthContext.todayWorkout) {
      score += 1;
    }

    if (
      typeof input.healthContext.recoverySnapshot?.readinessScore === 'number'
    ) {
      score += 1;
    }

    if (
      typeof input.healthContext.recoverySnapshot?.fatigueScore === 'number'
    ) {
      score += 1;
    }

    if (input.adaptiveRecommendation) {
      score += 1;
    }

    if (input.healthContext.recentWorkoutLogs.length > 0) {
      score += 1;
    }

    if (input.healthContext.goal) {
      score += 1;
    }

    if (input.activeInjuryCount > 0) {
      score += 1;
    }

    if (input.trainingStatus === 'completed') {
      score += 1;
    }

    if (score >= 6) {
      return 'HIGH';
    }

    if (score >= 3) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private buildRecommendations(input: {
    trainingStatus: WorkoutTrainingStatus;
    readinessLevel: WorkoutReadinessLevel;
    activeInjuryCount: number;
    adaptiveRecommendation?: NonNullable<
      WorkoutAnalysis['adaptiveRecommendation']
    >;
    healthContext: UserHealthContext;
  }): WorkoutRecommendation[] {
    const recommendations: WorkoutRecommendation[] = [];
    const pushRecommendation = (
      code: WorkoutRecommendationCode,
      summary: string,
      reason: string,
      priority: WorkoutPriority,
      metadata: Readonly<Record<string, unknown>>,
    ): void => {
      recommendations.push(
        Object.freeze({
          code,
          summary,
          reason,
          priority,
          metadata,
        }),
      );
    };

    if (input.trainingStatus === 'unavailable') {
      pushRecommendation(
        'NO_WORKOUT_SCHEDULED',
        'No workout scheduled today.',
        'The current plan does not assign a workout for this day.',
        'LOW',
        Object.freeze({ trainingStatus: input.trainingStatus }),
      );
    } else if (
      input.adaptiveRecommendation?.recommendationType === 'rest_day'
    ) {
      pushRecommendation(
        'REST_FIRST',
        'Complete recovery first.',
        'The adaptive training recommendation is a rest day.',
        'CRITICAL',
        Object.freeze({
          adaptiveRecommendationType:
            input.adaptiveRecommendation.recommendationType,
        }),
      );
    } else if (
      input.adaptiveRecommendation?.recommendationType === 'recovery_workout'
    ) {
      pushRecommendation(
        'PRIORITIZE_MOBILITY',
        'Prioritize mobility work.',
        'The adaptive training recommendation favors recovery work.',
        'HIGH',
        Object.freeze({
          adaptiveRecommendationType:
            input.adaptiveRecommendation.recommendationType,
        }),
      );
    } else if (
      input.adaptiveRecommendation?.recommendationType === 'reschedule_workout'
    ) {
      pushRecommendation(
        'REST_FIRST',
        'Rest today and reschedule the session.',
        'The adaptive training recommendation is to reschedule the workout.',
        'HIGH',
        Object.freeze({
          adaptiveRecommendationType:
            input.adaptiveRecommendation.recommendationType,
        }),
      );
    } else if (
      input.adaptiveRecommendation?.recommendationType === 'decrease_volume'
    ) {
      pushRecommendation(
        'REDUCE_VOLUME',
        'Reduce training volume.',
        'The adaptive training recommendation is to reduce volume.',
        'HIGH',
        Object.freeze({
          adaptiveRecommendationType:
            input.adaptiveRecommendation.recommendationType,
        }),
      );
    } else if (
      input.adaptiveRecommendation?.recommendationType === 'decrease_intensity'
    ) {
      pushRecommendation(
        'REDUCE_INTENSITY',
        'Reduce training intensity.',
        'The adaptive training recommendation is to reduce intensity.',
        'HIGH',
        Object.freeze({
          adaptiveRecommendationType:
            input.adaptiveRecommendation.recommendationType,
        }),
      );
    } else if (
      input.adaptiveRecommendation?.recommendationType === 'increase_volume'
    ) {
      pushRecommendation(
        'INCREASE_VOLUME',
        'Increase training volume.',
        'The adaptive training recommendation is to increase volume.',
        'MEDIUM',
        Object.freeze({
          adaptiveRecommendationType:
            input.adaptiveRecommendation.recommendationType,
        }),
      );
    } else if (
      input.adaptiveRecommendation?.recommendationType === 'increase_intensity'
    ) {
      pushRecommendation(
        'INCREASE_INTENSITY',
        'Increase training intensity.',
        'The adaptive training recommendation is to increase intensity.',
        'MEDIUM',
        Object.freeze({
          adaptiveRecommendationType:
            input.adaptiveRecommendation.recommendationType,
        }),
      );
    } else if (
      input.trainingStatus === 'completed' &&
      input.readinessLevel === 'HIGH'
    ) {
      pushRecommendation(
        'MAINTAIN_TODAY',
        "Maintain today's session.",
        'The workout is complete and readiness is high.',
        'LOW',
        Object.freeze({ trainingStatus: input.trainingStatus }),
      );
    } else if (input.trainingStatus === 'partially_completed') {
      pushRecommendation(
        'FOCUS_TECHNIQUE',
        'Focus on technique.',
        'The session was only partially completed.',
        'MEDIUM',
        Object.freeze({ trainingStatus: input.trainingStatus }),
      );
    } else if (input.trainingStatus === 'skipped') {
      pushRecommendation(
        'REST_FIRST',
        'Complete recovery first.',
        'The planned workout was skipped.',
        'HIGH',
        Object.freeze({ trainingStatus: input.trainingStatus }),
      );
    } else if (input.readinessLevel === 'LOW') {
      pushRecommendation(
        'REST_FIRST',
        'Complete recovery first.',
        'Current readiness is low.',
        'HIGH',
        Object.freeze({ readinessLevel: input.readinessLevel }),
      );
    } else {
      pushRecommendation(
        'MAINTAIN_TODAY',
        "Maintain today's session.",
        'No stronger adjustment is required from the current evidence.',
        'LOW',
        Object.freeze({ trainingStatus: input.trainingStatus }),
      );
    }

    if (input.activeInjuryCount > 0) {
      const limitationText = this.collectLimitationText(input.healthContext);

      if (
        limitationText.includes('shoulder') ||
        limitationText.includes('overhead')
      ) {
        pushRecommendation(
          'AVOID_OVERHEAD_MOVEMENTS',
          'Avoid overhead movements.',
          'A limitation or injury affects overhead loading.',
          'HIGH',
          Object.freeze({ limitationHint: 'shoulder_or_overhead' }),
        );
      }

      if (limitationText.includes('back') || limitationText.includes('spine')) {
        pushRecommendation(
          'AVOID_LOWER_BACK_LOADING',
          'Avoid heavy spinal loading.',
          'A limitation or injury affects the lower back or spine.',
          'HIGH',
          Object.freeze({ limitationHint: 'back_or_spine' }),
        );
      }

      if (limitationText.includes('knee')) {
        pushRecommendation(
          'LIMIT_KNEE_DOMINANT_LOADING',
          'Limit knee-dominant loading.',
          'A limitation or injury affects the knee.',
          'HIGH',
          Object.freeze({ limitationHint: 'knee' }),
        );
      }
    }

    return this.uniqueRecommendations(recommendations);
  }

  private selectPrimaryRecommendation(
    recommendations: readonly WorkoutRecommendation[],
    trainingStatus?: WorkoutTrainingStatus,
  ): WorkoutRecommendation {
    if (recommendations.length === 0) {
      if (trainingStatus === 'unavailable') {
        return Object.freeze({
          code: 'NO_WORKOUT_SCHEDULED',
          summary: 'No workout scheduled today.',
          reason: 'No session is planned or available from the current state.',
          priority: 'LOW',
          metadata: Object.freeze({ trainingStatus }),
        });
      }

      return Object.freeze({
        code: 'MAINTAIN_TODAY',
        summary: "Maintain today's session.",
        reason: 'No deterministic adjustment was required.',
        priority: 'LOW',
        metadata: Object.freeze({}),
      });
    }

    return [...recommendations].sort((left, right) => {
      if (left.priority !== right.priority) {
        return (
          RECOMMENDATION_PRIORITY[right.priority] -
          RECOMMENDATION_PRIORITY[left.priority]
        );
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOMMENDATION_ORDER.indexOf(right.code)
      );
    })[0];
  }

  private uniqueRecommendations(
    recommendations: readonly WorkoutRecommendation[],
  ): WorkoutRecommendation[] {
    const seen = new Set<WorkoutRecommendationCode>();
    const result: WorkoutRecommendation[] = [];

    for (const recommendation of recommendations) {
      if (seen.has(recommendation.code)) {
        continue;
      }

      seen.add(recommendation.code);
      result.push(recommendation);
    }

    return result.sort((left, right) => {
      if (left.priority !== right.priority) {
        return (
          RECOMMENDATION_PRIORITY[right.priority] -
          RECOMMENDATION_PRIORITY[left.priority]
        );
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOMMENDATION_ORDER.indexOf(right.code)
      );
    });
  }

  private buildRiskSummary(
    level: WorkoutPriority,
    factors: readonly string[],
  ): string {
    if (factors.length === 0) {
      return `risk=${level.toLowerCase()}; factors=none`;
    }

    return `risk=${level.toLowerCase()}; factors=${factors.join(',')}`;
  }

  private collectLimitationText(healthContext: UserHealthContext): string {
    return healthContext.limitations
      .map((limitation) =>
        `${limitation.type} ${limitation.description ?? ''}`.toLowerCase(),
      )
      .join(' ');
  }
}
