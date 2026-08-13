import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { Goal as GoalEntity } from '../../../../../goals/domain/entities/goal.entity';
import type { GoalForecast as GoalForecastEntity } from '../../../../../goals/domain/entities/goal-forecast.entity';
import type { GoalMilestone as GoalMilestoneEntity } from '../../../../../goals/domain/entities/goal-milestone.entity';
import type { GoalProgressSnapshot as GoalProgressSnapshotEntity } from '../../../../../goals/domain/entities/goal-progress-snapshot.entity';
import type {
  GoalAnalysis,
  GoalConfidence,
  GoalConsistencyAssessment,
  GoalConsistencyLevel,
  GoalExpertContribution,
  GoalForecast,
  GoalForecastStatus,
  GoalMilestoneAssessment,
  GoalMilestoneSnapshot,
  GoalPriority,
  GoalProgressAssessment,
  GoalRecommendation,
  GoalRecommendationCode,
  GoalRiskAssessment,
  GoalStatus,
  GoalTrend,
  GoalRuntimeExpertSnapshot,
} from './goal-expert.types';

const COACH_EXPERT_VERSION = '1.0.0';
const GOAL_EXPERT_ID = 'GoalExpert';

const GOAL_RECOMMENDATION_PRIORITY: Record<GoalPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const GOAL_RECOMMENDATION_ORDER: readonly GoalRecommendationCode[] =
  Object.freeze([
    'REDUCE_INACTIVITY_PERIODS',
    'PRIORITIZE_RECOVERY',
    'IMPROVE_WORKOUT_ADHERENCE',
    'IMPROVE_NUTRITION_ADHERENCE',
    'INCREASE_WEEKLY_CONSISTENCY',
    'REVIEW_TRAINING_FREQUENCY',
    'FOCUS_ON_NEXT_MILESTONE',
    'STAY_CONSISTENT_WITH_CURRENT_PLAN',
    'MAINTAIN_CURRENT_STRATEGY',
  ]);

const CONSISTENCY_SCORE: Record<GoalConsistencyLevel, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

const FORECAST_STATUS_PRIORITY: Record<GoalForecastStatus, number> = {
  LIKELY: 3,
  UNCERTAIN: 2,
  UNLIKELY: 1,
  UNKNOWN: 0,
};

const GOAL_STATUS_PRIORITY: Record<GoalStatus, number> = {
  COMPLETED: 5,
  ON_TRACK: 4,
  SLIGHTLY_BEHIND: 3,
  BEHIND: 2,
  AT_RISK: 1,
  UNKNOWN: 0,
};

export class GoalExpert extends BaseCoachExpert {
  constructor() {
    super({
      id: GOAL_EXPERT_ID,
      displayName: 'Goal Expert',
      version: COACH_EXPERT_VERSION,
      category: 'GOALS',
      supportedIntents: [
        'GOALS',
        'TRAINING',
        'NUTRITION',
        'RECOVERY',
        'HABITS',
        'PROGRESS',
        'PLANNING',
        'MOTIVATION',
      ],
      supportedDomains: [
        'goals',
        'progress',
        'training',
        'recovery',
        'nutrition',
      ],
      estimatedCost: 2,
      estimatedLatencyMs: 16,
      priority: 85,
      capabilities: ['GOAL_SPECIALIST', 'COACH_ROUTING', 'CONTEXT_SYNTHESIS'],
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
        goalExpert: Object.freeze({
          expertId: this.metadata.id,
          goalStatus: analysis.goalStatus,
          progressCompletionPercentage:
            analysis.progressAssessment.completionPercentage,
          progressTrend: analysis.progressAssessment.trend,
          forecastStatus: analysis.forecast.status,
          consistency: analysis.consistency.overallConsistency,
          confidence: analysis.confidence,
          riskLevel: analysis.risks[0]?.level ?? 'LOW',
          recommendationCodes: analysis.recommendations.map(
            (recommendation) => recommendation.code,
          ),
          milestoneCount: analysis.milestoneCount,
          achievementCount: analysis.achievementCount,
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
        goalStatus: contribution.goalStatus,
        progressAssessment: contribution.progressAssessment,
        forecast: contribution.forecast,
        milestoneAssessment: contribution.milestoneAssessment,
        consistency: contribution.consistency,
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

  private buildAnalysis(context: CoachExpertContext): GoalAnalysis {
    const healthContext = context.healthContext;
    const goalContext = context.goalContext;

    if (context.policyEvaluation?.decision.blocked || !healthContext) {
      return this.buildUnavailableAnalysis({
        reason: 'policy_blocked',
        policyBlocked: Boolean(context.policyEvaluation?.decision.blocked),
        healthContextAvailable: Boolean(healthContext),
        goalContextAvailable: Boolean(goalContext),
      });
    }

    if (!goalContext) {
      return this.buildUnavailableAnalysis({
        reason: 'missing_goal_context',
        policyBlocked: Boolean(context.policyEvaluation?.decision.blocked),
        healthContextAvailable: Boolean(healthContext),
        goalContextAvailable: false,
      });
    }

    const currentGoal = goalContext.currentGoal ?? null;
    const progressSnapshot = this.resolveLatestProgressSnapshot(goalContext);
    const progressHistory = this.normalizeProgressHistory(goalContext);
    const progressAssessment = this.buildProgressAssessment({
      currentGoal,
      progressSnapshot,
      progressHistory,
      healthContext,
    });
    const consistency = this.buildConsistencyAssessment(context);
    const forecast = this.buildForecast({
      currentGoal,
      progressAssessment,
      consistency,
      goalContext,
      healthContext,
    });
    const goalStatus = this.resolveGoalStatus({
      currentGoal,
      progressAssessment,
      consistency,
      forecast,
      goalContext,
    });
    const milestoneAssessment = this.buildMilestoneAssessment({
      goalContext,
      progressAssessment,
      consistency,
      forecast,
      goalStatus,
    });
    const recommendations = this.buildRecommendations({
      goalStatus,
      progressAssessment,
      consistency,
      forecast,
      milestoneAssessment,
    });
    const risks = [
      this.buildRiskAssessment({
        goalStatus,
        progressAssessment,
        consistency,
        forecast,
        milestoneAssessment,
        currentGoal,
      }),
    ];
    const confidence = this.buildConfidence({
      currentGoal,
      progressAssessment,
      consistency,
      forecast,
      milestoneAssessment,
      goalContext,
    });
    const signals = this.buildSignals({
      goalStatus,
      progressAssessment,
      consistency,
      forecast,
      milestoneAssessment,
      goalContext,
      healthContext,
    });

    return Object.freeze({
      goalStatus,
      progressAssessment,
      forecast,
      milestoneAssessment,
      consistency,
      recommendations: Object.freeze(recommendations),
      risks: Object.freeze(risks),
      confidence,
      signals: Object.freeze(signals),
      activeGoalPresent: Boolean(currentGoal),
      progressSnapshotPresent: Boolean(progressSnapshot),
      historyCount: progressHistory.length,
      milestoneCount:
        milestoneAssessment.completedMilestones.length +
        milestoneAssessment.remainingMilestones.length,
      achievementCount: goalContext.achievementHistory?.length ?? 0,
      goalType: currentGoal?.type,
      goalTargetDate: currentGoal?.targetDate?.toISOString() ?? null,
    });
  }

  private buildUnavailableAnalysis(input: {
    reason: string;
    policyBlocked: boolean;
    healthContextAvailable: boolean;
    goalContextAvailable: boolean;
  }): GoalAnalysis {
    const riskAssessment: GoalRiskAssessment = Object.freeze({
      level: 'CRITICAL',
      summary: 'Goal analysis is unavailable.',
      factors: Object.freeze([input.reason]),
      metadata: Object.freeze({
        policyBlocked: input.policyBlocked,
        healthContextAvailable: input.healthContextAvailable,
        goalContextAvailable: input.goalContextAvailable,
      }),
    });

    const progressAssessment = this.buildEmptyProgressAssessment(input.reason);
    const forecast = this.buildEmptyForecast(input.reason);
    const milestoneAssessment = this.buildEmptyMilestoneAssessment(
      input.reason,
    );
    const consistency = this.buildEmptyConsistencyAssessment(input.reason);

    return Object.freeze({
      goalStatus: 'UNKNOWN',
      progressAssessment,
      forecast,
      milestoneAssessment,
      consistency,
      recommendations: Object.freeze([
        Object.freeze({
          code: 'MAINTAIN_CURRENT_STRATEGY',
          summary: 'Maintain current strategy.',
          reason: 'Goal context is unavailable.',
          priority: 'LOW',
          metadata: Object.freeze({
            unavailableReason: input.reason,
          }),
        }),
      ]),
      risks: Object.freeze([riskAssessment]),
      confidence: 'LOW',
      signals: Object.freeze([
        `unavailable_reason=${input.reason}`,
        `policy_blocked=${input.policyBlocked}`,
        `health_context_available=${input.healthContextAvailable}`,
        `goal_context_available=${input.goalContextAvailable}`,
      ]),
      activeGoalPresent: false,
      progressSnapshotPresent: false,
      historyCount: 0,
      milestoneCount: 0,
      achievementCount: 0,
      goalType: undefined,
      goalTargetDate: null,
    });
  }

  private buildEmptyProgressAssessment(reason: string): GoalProgressAssessment {
    return Object.freeze({
      completionPercentage: null,
      currentValue: null,
      targetValue: null,
      trend: 'UNKNOWN',
      progressDelta: null,
      historyCount: 0,
      daysSinceLatestProgress: null,
      summary: 'Goal progress is unavailable.',
      metadata: Object.freeze({
        unavailableReason: reason,
      }),
    });
  }

  private buildEmptyForecast(reason: string): GoalForecast {
    return Object.freeze({
      status: 'UNKNOWN',
      confidence: 'LOW',
      predictedCompletionDate: null,
      estimatedDaysRemaining: null,
      daysUntilDeadline: null,
      summary: 'Goal forecast is unavailable.',
      metadata: Object.freeze({
        unavailableReason: reason,
      }),
    });
  }

  private buildEmptyMilestoneAssessment(
    reason: string,
  ): GoalMilestoneAssessment {
    return Object.freeze({
      completedMilestones: Object.freeze([]),
      remainingMilestones: Object.freeze([]),
      blockedMilestones: Object.freeze([]),
      nextMilestone: null,
      completionPercentage: null,
      summary: 'Goal milestones are unavailable.',
      metadata: Object.freeze({
        unavailableReason: reason,
      }),
    });
  }

  private buildEmptyConsistencyAssessment(
    reason: string,
  ): GoalConsistencyAssessment {
    return Object.freeze({
      workoutConsistency: 'UNKNOWN',
      nutritionConsistency: 'UNKNOWN',
      recoveryConsistency: 'UNKNOWN',
      overallConsistency: 'UNKNOWN',
      summary: 'Goal consistency is unavailable.',
      metadata: Object.freeze({
        unavailableReason: reason,
      }),
    });
  }

  private buildSignals(input: {
    goalStatus: GoalStatus;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    forecast: GoalForecast;
    milestoneAssessment: GoalMilestoneAssessment;
    goalContext: NonNullable<CoachExpertContext['goalContext']>;
    healthContext: NonNullable<CoachExpertContext['healthContext']>;
  }): readonly string[] {
    const signals = [
      `goal_status=${input.goalStatus}`,
      `progress_trend=${input.progressAssessment.trend}`,
      `progress_completion=${this.formatPercentage(
        input.progressAssessment.completionPercentage,
      )}`,
      `consistency=${input.consistency.overallConsistency}`,
      `forecast_status=${input.forecast.status}`,
      `milestones_completed=${input.milestoneAssessment.completedMilestones.length}`,
      `milestones_remaining=${input.milestoneAssessment.remainingMilestones.length}`,
      `goal_history_count=${input.goalContext.goalHistory?.length ?? 0}`,
      `achievement_history_count=${input.goalContext.achievementHistory?.length ?? 0}`,
      `health_context_user=${input.healthContext.userProfileId ?? 'unknown'}`,
    ];

    return Object.freeze(signals);
  }

  private buildProgressAssessment(input: {
    currentGoal: GoalEntity | null;
    progressSnapshot: GoalProgressSnapshotEntity | undefined;
    progressHistory: readonly GoalProgressSnapshotEntity[];
    healthContext: CoachExpertContext['healthContext'];
  }): GoalProgressAssessment {
    const latestSnapshot = input.progressSnapshot ?? null;
    const currentProgress =
      latestSnapshot?.progressPercentage ??
      this.resolveLatestHistoryProgress(input.progressHistory);
    const previousProgress = this.resolvePreviousHistoryProgress(
      input.progressHistory,
    );
    const trend = this.resolveTrend(latestSnapshot, input.progressHistory);
    const progressDelta =
      typeof currentProgress === 'number' &&
      typeof previousProgress === 'number'
        ? this.roundToTwoDecimals(currentProgress - previousProgress)
        : null;
    const daysSinceLatestProgress = latestSnapshot
      ? this.calculateDaysBetween(
          new Date(latestSnapshot.date),
          input.healthContext?.generatedAt ?? new Date(),
        )
      : null;

    return Object.freeze({
      completionPercentage:
        typeof currentProgress === 'number'
          ? this.clampProgress(currentProgress)
          : null,
      currentValue: latestSnapshot?.currentValue ?? null,
      targetValue: latestSnapshot?.targetValue ?? null,
      trend,
      progressDelta,
      historyCount: input.progressHistory.length,
      daysSinceLatestProgress,
      summary: this.buildProgressSummary({
        completionPercentage:
          typeof currentProgress === 'number'
            ? this.clampProgress(currentProgress)
            : null,
        trend,
        progressDelta,
        historyCount: input.progressHistory.length,
        daysSinceLatestProgress,
      }),
      metadata: Object.freeze({
        goalStatus: input.currentGoal?.status.value ?? null,
        goalType: input.currentGoal?.type ?? null,
        snapshotDate: latestSnapshot?.date ?? null,
        historyCount: input.progressHistory.length,
      }),
    });
  }

  private buildForecast(input: {
    currentGoal: GoalEntity | null;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    goalContext: NonNullable<CoachExpertContext['goalContext']>;
    healthContext: NonNullable<CoachExpertContext['healthContext']>;
  }): GoalForecast {
    const storedForecast = input.goalContext.forecast ?? null;
    const daysUntilDeadline = this.resolveDaysUntilDeadline(
      input.currentGoal?.targetDate ?? null,
      input.healthContext.generatedAt,
    );
    const derivedStatus = this.resolveForecastStatus({
      currentGoal: input.currentGoal,
      progressAssessment: input.progressAssessment,
      consistency: input.consistency,
      daysUntilDeadline,
      storedForecast,
    });
    const derivedConfidence = this.resolveForecastConfidence({
      currentGoal: input.currentGoal,
      progressAssessment: input.progressAssessment,
      consistency: input.consistency,
      goalContext: input.goalContext,
      storedForecast,
    });

    return Object.freeze({
      status: derivedStatus,
      confidence: derivedConfidence,
      predictedCompletionDate:
        storedForecast?.predictedCompletionDate?.toISOString() ?? null,
      estimatedDaysRemaining:
        storedForecast?.estimatedDaysRemaining ??
        this.resolveEstimatedDaysRemaining(
          input.progressAssessment.completionPercentage,
          input.currentGoal,
          daysUntilDeadline,
        ),
      daysUntilDeadline,
      summary: this.buildForecastSummary({
        status: derivedStatus,
        estimatedDaysRemaining:
          storedForecast?.estimatedDaysRemaining ??
          this.resolveEstimatedDaysRemaining(
            input.progressAssessment.completionPercentage,
            input.currentGoal,
            daysUntilDeadline,
          ),
        daysUntilDeadline,
      }),
      metadata: Object.freeze({
        hasStoredForecast: Boolean(storedForecast),
        forecastConfidence: storedForecast?.confidence.value ?? null,
        goalTargetDate: input.currentGoal?.targetDate?.toISOString() ?? null,
      }),
    });
  }

  private buildMilestoneAssessment(input: {
    goalContext: NonNullable<CoachExpertContext['goalContext']>;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    forecast: GoalForecast;
    goalStatus: GoalStatus;
  }): GoalMilestoneAssessment {
    const milestones = this.normalizeMilestones(input.goalContext.milestones);
    const completedMilestones = milestones.filter(
      (milestone) => milestone.achieved,
    );
    const remainingMilestones = milestones.filter(
      (milestone) => !milestone.achieved,
    );
    const blockedMilestones = this.resolveBlockedMilestones({
      remainingMilestones,
      goalStatus: input.goalStatus,
      trend: input.progressAssessment.trend,
      consistency: input.consistency.overallConsistency,
      forecastStatus: input.forecast.status,
    });
    const nextMilestone = remainingMilestones[0] ?? null;

    return Object.freeze({
      completedMilestones: Object.freeze(completedMilestones),
      remainingMilestones: Object.freeze(remainingMilestones),
      blockedMilestones: Object.freeze(blockedMilestones),
      nextMilestone,
      completionPercentage: input.progressAssessment.completionPercentage,
      summary: this.buildMilestoneSummary({
        completedCount: completedMilestones.length,
        remainingCount: remainingMilestones.length,
        blockedCount: blockedMilestones.length,
        nextMilestone,
      }),
      metadata: Object.freeze({
        milestoneCount: milestones.length,
        completedCount: completedMilestones.length,
        remainingCount: remainingMilestones.length,
        blockedCount: blockedMilestones.length,
      }),
    });
  }

  private buildConsistencyAssessment(
    context: CoachExpertContext,
  ): GoalConsistencyAssessment {
    const workoutExpert = this.readRuntimeExpertSnapshot(
      context,
      'workoutExpert',
    );
    const nutritionExpert = this.readRuntimeExpertSnapshot(
      context,
      'nutritionExpert',
    );
    const recoveryExpert = this.readRuntimeExpertSnapshot(
      context,
      'recoveryExpert',
    );
    const workoutConsistency = this.resolveWorkoutConsistency(workoutExpert);
    const nutritionConsistency =
      this.resolveNutritionConsistency(nutritionExpert);
    const recoveryConsistency = this.resolveRecoveryConsistency(recoveryExpert);
    const overallConsistency = this.resolveOverallConsistency([
      workoutConsistency,
      nutritionConsistency,
      recoveryConsistency,
    ]);

    return Object.freeze({
      workoutConsistency,
      nutritionConsistency,
      recoveryConsistency,
      overallConsistency,
      summary: this.buildConsistencySummary({
        workoutConsistency,
        nutritionConsistency,
        recoveryConsistency,
        overallConsistency,
      }),
      metadata: Object.freeze({
        workoutExpertPresent: Boolean(workoutExpert),
        nutritionExpertPresent: Boolean(nutritionExpert),
        recoveryExpertPresent: Boolean(recoveryExpert),
      }),
    });
  }

  private buildRecommendations(input: {
    goalStatus: GoalStatus;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    forecast: GoalForecast;
    milestoneAssessment: GoalMilestoneAssessment;
  }): GoalRecommendation[] {
    const candidateCodes: GoalRecommendationCode[] = [];

    if (input.goalStatus === 'COMPLETED') {
      candidateCodes.push('MAINTAIN_CURRENT_STRATEGY');
    } else {
      if (input.consistency.overallConsistency === 'LOW') {
        candidateCodes.push('REDUCE_INACTIVITY_PERIODS');
      }

      if (input.consistency.recoveryConsistency === 'LOW') {
        candidateCodes.push('PRIORITIZE_RECOVERY');
      }

      if (input.consistency.workoutConsistency === 'LOW') {
        candidateCodes.push('IMPROVE_WORKOUT_ADHERENCE');
      }

      if (input.consistency.nutritionConsistency === 'LOW') {
        candidateCodes.push('IMPROVE_NUTRITION_ADHERENCE');
      }

      if (
        input.goalStatus === 'SLIGHTLY_BEHIND' ||
        input.goalStatus === 'BEHIND'
      ) {
        candidateCodes.push('INCREASE_WEEKLY_CONSISTENCY');
      }

      if (
        input.goalStatus === 'BEHIND' ||
        input.goalStatus === 'AT_RISK' ||
        input.forecast.status === 'UNLIKELY'
      ) {
        candidateCodes.push('REVIEW_TRAINING_FREQUENCY');
      }

      if (input.milestoneAssessment.blockedMilestones.length > 0) {
        candidateCodes.push('FOCUS_ON_NEXT_MILESTONE');
      }

      if (input.goalStatus === 'ON_TRACK') {
        candidateCodes.push('STAY_CONSISTENT_WITH_CURRENT_PLAN');
      }

      if (candidateCodes.length === 0) {
        candidateCodes.push('MAINTAIN_CURRENT_STRATEGY');
      }
    }

    const uniqueCodes = [...new Set(candidateCodes)];
    const orderedCodes = uniqueCodes.sort((left, right) => {
      const leftPriority = this.resolveRecommendationPriority(left);
      const rightPriority = this.resolveRecommendationPriority(right);

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return (
        GOAL_RECOMMENDATION_ORDER.indexOf(left) -
        GOAL_RECOMMENDATION_ORDER.indexOf(right)
      );
    });

    return orderedCodes.map((code) => this.buildRecommendation(input, code));
  }

  private buildRiskAssessment(input: {
    goalStatus: GoalStatus;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    forecast: GoalForecast;
    milestoneAssessment: GoalMilestoneAssessment;
    currentGoal: GoalEntity | null;
  }): GoalRiskAssessment {
    const factors: string[] = [];
    let level: GoalPriority = 'LOW';

    if (!input.currentGoal) {
      factors.push('missing_goal_context');
      level = 'CRITICAL';
    }

    if (input.goalStatus === 'COMPLETED') {
      factors.push('goal_completed');
      level = 'LOW';
    }

    if (input.goalStatus === 'AT_RISK') {
      factors.push('goal_at_risk');
      level = 'HIGH';
    }

    if (input.goalStatus === 'BEHIND') {
      factors.push('goal_behind_schedule');
      level = 'HIGH';
    }

    if (input.goalStatus === 'SLIGHTLY_BEHIND' && level === 'LOW') {
      factors.push('goal_slightly_behind');
      level = 'MEDIUM';
    }

    if (input.consistency.overallConsistency === 'LOW') {
      factors.push('overall_consistency_low');
      level = level === 'CRITICAL' ? level : 'HIGH';
    }

    if (input.consistency.workoutConsistency === 'LOW') {
      factors.push('workout_consistency_low');
    }

    if (input.consistency.nutritionConsistency === 'LOW') {
      factors.push('nutrition_consistency_low');
    }

    if (input.consistency.recoveryConsistency === 'LOW') {
      factors.push('recovery_consistency_low');
    }

    if (input.progressAssessment.trend === 'DECLINING') {
      factors.push('progress_declining');
      level = level === 'LOW' ? 'MEDIUM' : 'HIGH';
    }

    if (input.forecast.status === 'UNLIKELY') {
      factors.push('forecast_unlikely');
      level = level === 'LOW' ? 'MEDIUM' : 'HIGH';
    }

    if (input.milestoneAssessment.blockedMilestones.length > 0) {
      factors.push('blocked_milestones_present');
      if (level === 'LOW') {
        level = 'MEDIUM';
      }
    }

    if (
      input.progressAssessment.daysSinceLatestProgress !== null &&
      input.progressAssessment.daysSinceLatestProgress >= 14
    ) {
      factors.push('recent_inactivity');
      level = 'CRITICAL';
    }

    if (
      input.progressAssessment.completionPercentage !== null &&
      input.progressAssessment.completionPercentage < 20 &&
      input.consistency.overallConsistency === 'LOW'
    ) {
      level = 'CRITICAL';
    }

    return Object.freeze({
      level,
      summary: this.buildRiskSummary(level, factors),
      factors: Object.freeze([...new Set(factors)]),
      metadata: Object.freeze({
        goalStatus: input.goalStatus,
        progressTrend: input.progressAssessment.trend,
        forecastStatus: input.forecast.status,
        overallConsistency: input.consistency.overallConsistency,
      }),
    });
  }

  private buildConfidence(input: {
    currentGoal: GoalEntity | null;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    forecast: GoalForecast;
    milestoneAssessment: GoalMilestoneAssessment;
    goalContext: NonNullable<CoachExpertContext['goalContext']>;
  }): GoalConfidence {
    let score = 0;

    if (input.currentGoal) {
      score += 1;
    }

    if (input.progressAssessment.completionPercentage !== null) {
      score += 1;
    }

    if (input.progressAssessment.trend !== 'UNKNOWN') {
      score += 1;
    }

    if (input.forecast.status !== 'UNKNOWN') {
      score += 1;
    }

    if (input.consistency.overallConsistency !== 'UNKNOWN') {
      score += 1;
    }

    if (
      input.milestoneAssessment.completedMilestones.length +
        input.milestoneAssessment.remainingMilestones.length >
      0
    ) {
      score += 1;
    }

    if ((input.goalContext.goalHistory?.length ?? 0) > 0) {
      score += 1;
    }

    if ((input.goalContext.achievementHistory?.length ?? 0) > 0) {
      score += 1;
    }

    if (score >= 7) {
      return 'HIGH';
    }

    if (score >= 4) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private buildContribution(
    analysis: GoalAnalysis,
    context: CoachExpertContext,
  ): GoalExpertContribution {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      analysis.recommendations,
    );

    return Object.freeze({
      expertId: this.metadata.id,
      summary: this.buildSummary(analysis, primaryRecommendation),
      analysis,
      recommendations: analysis.recommendations,
      risks: analysis.risks,
      goalStatus: analysis.goalStatus,
      progressAssessment: analysis.progressAssessment,
      forecast: analysis.forecast,
      milestoneAssessment: analysis.milestoneAssessment,
      consistency: analysis.consistency,
      confidence: analysis.confidence,
      priority: analysis.risks[0]?.level ?? 'LOW',
      metadata: Object.freeze({
        expertId: this.metadata.id,
        selectionReason: context.selectionReason,
        goalStatus: analysis.goalStatus,
        progressTrend: analysis.progressAssessment.trend,
        forecastStatus: analysis.forecast.status,
        consistency: analysis.consistency.overallConsistency,
        confidence: analysis.confidence,
        recommendationCodes: analysis.recommendations.map(
          (recommendation) => recommendation.code,
        ),
        milestoneCount: analysis.milestoneCount,
        achievementCount: analysis.achievementCount,
      }),
    });
  }

  private buildContributions(
    contribution: GoalExpertContribution,
  ): readonly CoachExpertContribution[] {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      contribution.recommendations,
    );

    return Object.freeze([
      Object.freeze({
        expertId: this.metadata.id,
        type: 'ANALYSIS',
        summary: contribution.summary,
        metadata: Object.freeze({
          goalContribution: contribution,
          kind: 'analysis',
        }),
      }),
      Object.freeze({
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: primaryRecommendation.summary,
        metadata: Object.freeze({
          goalContribution: contribution,
          kind: 'contribution',
          recommendationCode: primaryRecommendation.code,
        }),
      }),
    ]);
  }

  private buildSummary(
    analysis: GoalAnalysis,
    recommendation: GoalRecommendation,
  ): string {
    return [
      `status=${analysis.goalStatus}`,
      `progress=${this.formatPercentage(analysis.progressAssessment.completionPercentage)}`,
      `trend=${analysis.progressAssessment.trend}`,
      `forecast=${analysis.forecast.status}`,
      `consistency=${analysis.consistency.overallConsistency}`,
      `recommendation=${recommendation.code}`,
      `milestones=${analysis.milestoneAssessment.completedMilestones.length}/${analysis.milestoneCount}`,
    ].join('; ');
  }

  private buildProgressSummary(input: {
    completionPercentage: number | null;
    trend: GoalTrend;
    progressDelta: number | null;
    historyCount: number;
    daysSinceLatestProgress: number | null;
  }): string {
    if (input.completionPercentage === null) {
      return 'Goal progress is unavailable.';
    }

    const deltaText =
      input.progressDelta !== null
        ? ` delta=${this.formatSigned(input.progressDelta)}`
        : '';
    const inactivityText =
      input.daysSinceLatestProgress !== null
        ? ` inactivity=${input.daysSinceLatestProgress}d`
        : '';

    return `Progress is ${this.formatPercentage(input.completionPercentage)} with ${input.trend.toLowerCase()} trend.${deltaText}${inactivityText} history=${input.historyCount}`;
  }

  private buildForecastSummary(input: {
    status: GoalForecastStatus;
    estimatedDaysRemaining: number | null;
    daysUntilDeadline: number | null;
  }): string {
    const estimatedDays =
      input.estimatedDaysRemaining !== null
        ? `${input.estimatedDaysRemaining}d remaining`
        : 'remaining days unavailable';
    const deadlineText =
      input.daysUntilDeadline !== null
        ? ` deadline=${input.daysUntilDeadline}d`
        : '';

    return `Goal forecast is ${input.status.toLowerCase()} (${estimatedDays})${deadlineText}.`;
  }

  private buildMilestoneSummary(input: {
    completedCount: number;
    remainingCount: number;
    blockedCount: number;
    nextMilestone: GoalMilestoneSnapshot | null;
  }): string {
    if (input.completedCount + input.remainingCount === 0) {
      return 'Goal milestones are unavailable.';
    }

    const nextText = input.nextMilestone
      ? ` next=${input.nextMilestone.title}`
      : '';

    return `Milestones completed=${input.completedCount}, remaining=${input.remainingCount}, blocked=${input.blockedCount}.${nextText}`;
  }

  private buildConsistencySummary(input: {
    workoutConsistency: GoalConsistencyLevel;
    nutritionConsistency: GoalConsistencyLevel;
    recoveryConsistency: GoalConsistencyLevel;
    overallConsistency: GoalConsistencyLevel;
  }): string {
    return [
      `workout=${input.workoutConsistency}`,
      `nutrition=${input.nutritionConsistency}`,
      `recovery=${input.recoveryConsistency}`,
      `overall=${input.overallConsistency}`,
    ].join('; ');
  }

  private buildRiskSummary(
    level: GoalPriority,
    factors: readonly string[],
  ): string {
    if (factors.length === 0) {
      return `Goal risk is ${level}.`;
    }

    return `Goal risk is ${level.toLowerCase()}: ${factors.join(', ')}.`;
  }

  private buildRecommendation(
    input: {
      goalStatus: GoalStatus;
      progressAssessment: GoalProgressAssessment;
      consistency: GoalConsistencyAssessment;
      forecast: GoalForecast;
      milestoneAssessment: GoalMilestoneAssessment;
    },
    code: GoalRecommendationCode,
  ): GoalRecommendation {
    const { summary, reason, priority } = this.resolveRecommendationDetails(
      input,
      code,
    );

    return Object.freeze({
      code,
      summary,
      reason,
      priority,
      metadata: Object.freeze({
        goalStatus: input.goalStatus,
        progressTrend: input.progressAssessment.trend,
        overallConsistency: input.consistency.overallConsistency,
        forecastStatus: input.forecast.status,
        milestoneBlockedCount:
          input.milestoneAssessment.blockedMilestones.length,
      }),
    });
  }

  private resolveRecommendationDetails(
    input: {
      goalStatus: GoalStatus;
      progressAssessment: GoalProgressAssessment;
      consistency: GoalConsistencyAssessment;
      forecast: GoalForecast;
      milestoneAssessment: GoalMilestoneAssessment;
    },
    code: GoalRecommendationCode,
  ): { summary: string; reason: string; priority: GoalPriority } {
    switch (code) {
      case 'REDUCE_INACTIVITY_PERIODS':
        return {
          summary: 'Reduce inactivity periods.',
          reason: 'The goal is losing momentum.',
          priority: 'HIGH',
        };
      case 'PRIORITIZE_RECOVERY':
        return {
          summary: 'Prioritize recovery.',
          reason: 'Recovery consistency is limiting goal progress.',
          priority: 'HIGH',
        };
      case 'IMPROVE_WORKOUT_ADHERENCE':
        return {
          summary: 'Improve workout adherence.',
          reason: 'Workout consistency is below target.',
          priority: 'HIGH',
        };
      case 'IMPROVE_NUTRITION_ADHERENCE':
        return {
          summary: 'Improve nutrition adherence.',
          reason: 'Nutrition consistency is below target.',
          priority: 'HIGH',
        };
      case 'INCREASE_WEEKLY_CONSISTENCY':
        return {
          summary: 'Increase weekly consistency.',
          reason: 'The goal needs more steady weekly execution.',
          priority: 'MEDIUM',
        };
      case 'REVIEW_TRAINING_FREQUENCY':
        return {
          summary: 'Review training frequency.',
          reason: 'Progress is not keeping pace with the current cadence.',
          priority: 'MEDIUM',
        };
      case 'FOCUS_ON_NEXT_MILESTONE':
        return {
          summary: 'Focus on the next milestone.',
          reason: 'The next milestone is the clearest target.',
          priority: 'MEDIUM',
        };
      case 'STAY_CONSISTENT_WITH_CURRENT_PLAN':
        return {
          summary: 'Stay consistent with the current plan.',
          reason: 'The goal is progressing without a corrective adjustment.',
          priority: 'LOW',
        };
      case 'MAINTAIN_CURRENT_STRATEGY':
      default:
        return {
          summary: 'Maintain current strategy.',
          reason: 'The goal signal is stable enough to continue as planned.',
          priority: 'LOW',
        };
    }
  }

  private selectPrimaryRecommendation(
    recommendations: readonly GoalRecommendation[],
  ): GoalRecommendation {
    return [...recommendations].sort((left, right) => {
      const leftPriority = GOAL_RECOMMENDATION_PRIORITY[left.priority];
      const rightPriority = GOAL_RECOMMENDATION_PRIORITY[right.priority];

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return (
        GOAL_RECOMMENDATION_ORDER.indexOf(left.code) -
        GOAL_RECOMMENDATION_ORDER.indexOf(right.code)
      );
    })[0]!;
  }

  private resolveGoalStatus(input: {
    currentGoal: GoalEntity | null;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    forecast: GoalForecast;
    goalContext: NonNullable<CoachExpertContext['goalContext']>;
  }): GoalStatus {
    if (!input.currentGoal) {
      return 'UNKNOWN';
    }

    if (input.currentGoal.status.value === 'achieved') {
      return 'COMPLETED';
    }

    const completion = input.progressAssessment.completionPercentage;
    const trend = input.progressAssessment.trend;
    const consistency = input.consistency.overallConsistency;
    const forecastStatus = input.forecast.status;
    const inactiveDays = input.progressAssessment.daysSinceLatestProgress;

    if (completion === null) {
      if (
        forecastStatus === 'LIKELY' &&
        consistency === 'HIGH' &&
        input.goalContext.goalHistory?.length
      ) {
        return 'ON_TRACK';
      }

      if (forecastStatus === 'UNLIKELY' || consistency === 'LOW') {
        return 'AT_RISK';
      }

      return 'UNKNOWN';
    }

    if (completion >= 100) {
      return 'COMPLETED';
    }

    if (
      completion >= 65 &&
      trend !== 'DECLINING' &&
      consistency !== 'LOW' &&
      forecastStatus !== 'UNLIKELY'
    ) {
      return 'ON_TRACK';
    }

    if (
      completion >= 60 &&
      trend !== 'DECLINING' &&
      consistency !== 'LOW' &&
      forecastStatus !== 'UNLIKELY'
    ) {
      return 'SLIGHTLY_BEHIND';
    }

    if (
      completion >= 35 ||
      forecastStatus === 'UNCERTAIN' ||
      (inactiveDays !== null && inactiveDays >= 7)
    ) {
      return 'BEHIND';
    }

    return 'AT_RISK';
  }

  private resolveForecastStatus(input: {
    currentGoal: GoalEntity | null;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    daysUntilDeadline: number | null;
    storedForecast: GoalForecastEntity | null;
  }): GoalForecastStatus {
    if (input.currentGoal?.status.value === 'achieved') {
      return 'LIKELY';
    }

    if (input.storedForecast) {
      const confidence = input.storedForecast.confidence.value;
      if (confidence === 'high') {
        return 'LIKELY';
      }
      if (confidence === 'medium') {
        return 'UNCERTAIN';
      }
      if (confidence === 'low') {
        return 'UNLIKELY';
      }
    }

    const completion = input.progressAssessment.completionPercentage;
    const consistency = input.consistency.overallConsistency;
    const trend = input.progressAssessment.trend;

    if (completion === null) {
      return 'UNKNOWN';
    }

    if (completion >= 75 && consistency === 'HIGH' && trend !== 'DECLINING') {
      return 'LIKELY';
    }

    if (completion >= 55 && trend !== 'DECLINING' && consistency !== 'LOW') {
      return 'UNCERTAIN';
    }

    if (
      completion < 55 ||
      trend === 'DECLINING' ||
      consistency === 'LOW' ||
      (input.daysUntilDeadline !== null && input.daysUntilDeadline < 0)
    ) {
      return 'UNLIKELY';
    }

    return 'UNKNOWN';
  }

  private resolveForecastConfidence(input: {
    currentGoal: GoalEntity | null;
    progressAssessment: GoalProgressAssessment;
    consistency: GoalConsistencyAssessment;
    goalContext: NonNullable<CoachExpertContext['goalContext']>;
    storedForecast: GoalForecastEntity | null;
  }): GoalConfidence {
    if (input.storedForecast) {
      return input.storedForecast.confidence.value.toUpperCase() as GoalConfidence;
    }

    let score = 0;

    if (input.currentGoal) {
      score += 1;
    }

    if (input.progressAssessment.completionPercentage !== null) {
      score += 1;
    }

    if (input.progressAssessment.trend !== 'UNKNOWN') {
      score += 1;
    }

    if (input.consistency.overallConsistency !== 'UNKNOWN') {
      score += 1;
    }

    if ((input.goalContext.goalHistory?.length ?? 0) > 0) {
      score += 1;
    }

    if ((input.goalContext.milestones?.length ?? 0) > 0) {
      score += 1;
    }

    if (score >= 5) {
      return 'HIGH';
    }

    if (score >= 3) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveBlockedMilestones(input: {
    remainingMilestones: readonly GoalMilestoneSnapshot[];
    goalStatus: GoalStatus;
    trend: GoalTrend;
    consistency: GoalConsistencyLevel;
    forecastStatus: GoalForecastStatus;
  }): GoalMilestoneSnapshot[] {
    if (input.remainingMilestones.length === 0) {
      return [];
    }

    if (
      input.goalStatus === 'AT_RISK' ||
      input.trend === 'DECLINING' ||
      input.consistency === 'LOW' ||
      input.forecastStatus === 'UNLIKELY'
    ) {
      return [...input.remainingMilestones];
    }

    return [];
  }

  private resolveWorkoutConsistency(
    expert: GoalRuntimeExpertSnapshot | undefined,
  ): GoalConsistencyLevel {
    switch (expert?.trainingStatus) {
      case 'completed':
        return 'HIGH';
      case 'partially_completed':
      case 'scheduled':
        return 'MEDIUM';
      case 'skipped':
      case 'unavailable':
        return 'LOW';
      default:
        return 'UNKNOWN';
    }
  }

  private resolveNutritionConsistency(
    expert: GoalRuntimeExpertSnapshot | undefined,
  ): GoalConsistencyLevel {
    switch (expert?.nutritionStatus) {
      case 'ON_TRACK':
        return 'HIGH';
      case 'PARTIAL':
        return 'MEDIUM';
      case 'MISSED':
      case 'NO_PLAN':
        return 'LOW';
      case 'NO_PROFILE':
      case 'UNKNOWN':
      default:
        return 'UNKNOWN';
    }
  }

  private resolveRecoveryConsistency(
    expert: GoalRuntimeExpertSnapshot | undefined,
  ): GoalConsistencyLevel {
    switch (expert?.recoveryStatus) {
      case 'OPTIMAL':
      case 'GOOD':
        return 'HIGH';
      case 'MODERATE':
        return 'MEDIUM';
      case 'POOR':
      case 'CRITICAL':
        return 'LOW';
      default:
        return 'UNKNOWN';
    }
  }

  private resolveOverallConsistency(
    consistencies: readonly GoalConsistencyLevel[],
  ): GoalConsistencyLevel {
    const knownScores = consistencies
      .map((consistency) => CONSISTENCY_SCORE[consistency])
      .filter((score) => score > 0);

    if (knownScores.length === 0) {
      return 'UNKNOWN';
    }

    const average =
      knownScores.reduce((total, score) => total + score, 0) /
      knownScores.length;

    if (average >= 2.5) {
      return 'HIGH';
    }

    if (average >= 1.5) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveTrend(
    latestSnapshot: GoalProgressSnapshotEntity | null,
    progressHistory: readonly GoalProgressSnapshotEntity[],
  ): GoalTrend {
    if (latestSnapshot) {
      return this.normalizeTrend(latestSnapshot.trend.value);
    }

    if (progressHistory.length < 2) {
      return 'UNKNOWN';
    }

    const ordered = [...progressHistory].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
    const first = ordered[0]?.progressPercentage;
    const last = ordered[ordered.length - 1]?.progressPercentage;

    if (typeof first !== 'number' || typeof last !== 'number') {
      return 'UNKNOWN';
    }

    const delta = last - first;

    if (delta >= 5) {
      return 'IMPROVING';
    }

    if (delta <= -5) {
      return 'DECLINING';
    }

    return 'STABLE';
  }

  private normalizeTrend(
    trend: GoalProgressSnapshotEntity['trend']['value'],
  ): GoalTrend {
    switch (trend) {
      case 'improving':
        return 'IMPROVING';
      case 'declining':
        return 'DECLINING';
      case 'stable':
      default:
        return 'STABLE';
    }
  }

  private normalizeMilestones(
    milestones: readonly GoalMilestoneEntity[] | undefined,
  ): GoalMilestoneSnapshot[] {
    return [...(milestones ?? [])]
      .map((milestone) => ({
        title: milestone.title,
        targetValue: milestone.targetValue,
        achieved: milestone.achieved,
        achievedAt: milestone.achievedAt?.toISOString() ?? null,
      }))
      .sort((left, right) => left.targetValue - right.targetValue);
  }

  private normalizeProgressHistory(
    goalContext: NonNullable<CoachExpertContext['goalContext']>,
  ): readonly GoalProgressSnapshotEntity[] {
    const snapshots = [
      ...(goalContext.goalHistory ?? []),
      ...(goalContext.progressSnapshot ? [goalContext.progressSnapshot] : []),
    ];
    const uniqueByDate = new Map<string, GoalProgressSnapshotEntity>();

    for (const snapshot of snapshots) {
      uniqueByDate.set(snapshot.date, snapshot);
    }

    return [...uniqueByDate.values()].sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }

  private resolveLatestProgressSnapshot(
    goalContext: NonNullable<CoachExpertContext['goalContext']>,
  ): GoalProgressSnapshotEntity | undefined {
    const history = this.normalizeProgressHistory(goalContext);
    return history.at(-1);
  }

  private resolveLatestHistoryProgress(
    progressHistory: readonly GoalProgressSnapshotEntity[],
  ): number | null {
    const latest = progressHistory.at(-1);
    return typeof latest?.progressPercentage === 'number'
      ? latest.progressPercentage
      : null;
  }

  private resolvePreviousHistoryProgress(
    progressHistory: readonly GoalProgressSnapshotEntity[],
  ): number | null {
    if (progressHistory.length < 2) {
      return null;
    }

    const previous = progressHistory.at(-2);
    return typeof previous?.progressPercentage === 'number'
      ? previous.progressPercentage
      : null;
  }

  private resolveDaysUntilDeadline(
    targetDate: Date | null,
    referenceDate: Date,
  ): number | null {
    if (!targetDate) {
      return null;
    }

    return this.calculateDaysBetween(referenceDate, targetDate);
  }

  private resolveEstimatedDaysRemaining(
    completionPercentage: number | null,
    currentGoal: GoalEntity | null,
    daysUntilDeadline: number | null,
  ): number | null {
    if (currentGoal?.status.value === 'achieved') {
      return 0;
    }

    if (completionPercentage === null) {
      return daysUntilDeadline;
    }

    const remaining = Math.max(0, Math.ceil((100 - completionPercentage) / 5));

    if (daysUntilDeadline === null) {
      return remaining;
    }

    return Math.min(Math.max(daysUntilDeadline, 0), remaining);
  }

  private readRuntimeExpertSnapshot(
    context: CoachExpertContext,
    key: string,
  ): GoalRuntimeExpertSnapshot | undefined {
    const value = context.runtimeMetadata[key];

    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as GoalRuntimeExpertSnapshot;
  }

  private resolveRecommendationPriority(code: GoalRecommendationCode): number {
    return (
      {
        REDUCE_INACTIVITY_PERIODS: 5,
        PRIORITIZE_RECOVERY: 5,
        IMPROVE_WORKOUT_ADHERENCE: 4,
        IMPROVE_NUTRITION_ADHERENCE: 4,
        INCREASE_WEEKLY_CONSISTENCY: 3,
        REVIEW_TRAINING_FREQUENCY: 3,
        FOCUS_ON_NEXT_MILESTONE: 2,
        STAY_CONSISTENT_WITH_CURRENT_PLAN: 1,
        MAINTAIN_CURRENT_STRATEGY: 1,
      } as const
    )[code];
  }

  private formatPercentage(value: number | null): string {
    if (value === null) {
      return 'unknown';
    }

    return `${Math.round(value)}%`;
  }

  private formatSigned(value: number): string {
    return value >= 0
      ? `+${this.roundToTwoDecimals(value)}`
      : `${this.roundToTwoDecimals(value)}`;
  }

  private clampProgress(value: number): number {
    return Math.max(0, Math.min(100, this.roundToTwoDecimals(value)));
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private calculateDaysBetween(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.round(diff / 86_400_000);
  }
}
