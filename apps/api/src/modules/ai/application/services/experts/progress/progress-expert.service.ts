import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContribution,
  CoachExpertContext,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type {
  ProgressAnalysis,
  ProgressConfidence,
  ProgressConsistencyAssessment,
  ProgressConsistencyLevel,
  ProgressExpertContribution,
  ProgressMomentum,
  ProgressMomentumAssessment,
  ProgressPlateau,
  ProgressPlateauAssessment,
  ProgressPriority,
  ProgressRecommendation,
  ProgressRecommendationCode,
  ProgressRegression,
  ProgressRegressionAssessment,
  ProgressRiskAssessment,
  ProgressRiskLevel,
  ProgressStatus,
  ProgressTrend,
  ProgressTrendAssessment,
  ProgressRuntimeExpertSnapshot,
} from './progress-expert.types';

const COACH_EXPERT_VERSION = '1.0.0';
const PROGRESS_EXPERT_ID = 'ProgressExpert';
const RECENT_WINDOW_DAYS = 7;
const HISTORY_WINDOW_DAYS = 30;

const RECOMMENDATION_PRIORITY: Record<ProgressPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RECOMMENDATION_ORDER: readonly ProgressRecommendationCode[] =
  Object.freeze([
    'REDUCE_INACTIVITY',
    'REBUILD_BASELINE_ROUTINE',
    'BREAK_CURRENT_PLATEAU',
    'IMPROVE_WEEKLY_CONSISTENCY',
    'IMPROVE_RECOVERY_CONSISTENCY',
    'STABILIZE_NUTRITION_AND_RECOVERY',
    'REVIEW_TRAINING_PROGRESSION',
    'INCREASE_PROGRESSIVE_OVERLOAD',
    'MAINTAIN_CURRENT_MOMENTUM',
    'MAINTAIN_CURRENT_PROGRESSION',
    'FOCUS_ON_LONG_TERM_CONSISTENCY',
  ]);

type ProgressContext = NonNullable<CoachExpertContext['progress']>;
type ProgressSummaryLike = NonNullable<ProgressContext['weeklySummary']>;
type WorkoutHistoryLike = NonNullable<
  ProgressContext['workoutHistory']
>[number];
type CheckInHistoryLike = NonNullable<
  ProgressContext['dailyCheckInHistory']
>[number];
type ExpertSnapshot = Readonly<Record<string, unknown>>;

type ProgressWindowComparison = {
  recentCount: number;
  previousCount: number;
  recentDuration: number;
  previousDuration: number;
  recentAverageDuration: number;
  previousAverageDuration: number;
  recentRate: number | null;
  previousRate: number | null;
  countDelta: number;
  durationDelta: number;
};

export class ProgressExpert extends BaseCoachExpert {
  constructor() {
    super({
      id: PROGRESS_EXPERT_ID,
      displayName: 'Progress Expert',
      version: COACH_EXPERT_VERSION,
      category: 'PROGRESS',
      supportedIntents: [
        'PROGRESS',
        'GOALS',
        'TRAINING',
        'HABITS',
        'DASHBOARD',
        'MOTIVATION',
      ],
      supportedDomains: ['progress', 'goals', 'training', 'habits'],
      estimatedCost: 3,
      estimatedLatencyMs: 20,
      priority: 75,
      capabilities: [
        'PROGRESS_SPECIALIST',
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
        progressExpert: Object.freeze<ProgressRuntimeExpertSnapshot>({
          expertId: this.metadata.id,
          overallProgress: analysis.overallProgress,
          trend: analysis.trend.trend,
          momentum: analysis.momentum.momentum,
          plateau: analysis.plateau.plateau,
          regression: analysis.regression.regression,
          consistency: analysis.consistency.overallConsistency,
          riskLevel: analysis.risks[0]?.level ?? 'LOW',
          confidence: analysis.confidence,
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
        priority: contribution.metadata.priority,
        intent: input.intent,
        selectedDomainCount: input.selectedDomains.length,
        selectionReason: context.selectionReason,
        runtimeMode: 'deterministic-domain-specialist',
        analysis: contribution.analysis,
        recommendations: contribution.recommendations,
        risks: contribution.risks,
        overallProgress: contribution.overallProgress,
        trend: contribution.trend,
        momentum: contribution.momentum,
        plateau: contribution.plateau,
        regression: contribution.regression,
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

  private buildAnalysis(context: CoachExpertContext): ProgressAnalysis {
    const healthContext = context.healthContext;

    if (context.policyEvaluation?.decision.blocked || !healthContext) {
      return this.buildUnavailableAnalysis({
        healthContextAvailable: Boolean(healthContext),
        progressContextAvailable: Boolean(context.progress),
      });
    }

    const progressContext = context.progress ?? {};
    const workoutHistory = this.normalizeWorkoutHistory(
      progressContext.workoutHistory ?? healthContext.recentWorkoutLogs,
    );
    const checkInHistory = this.normalizeCheckInHistory(
      progressContext.dailyCheckInHistory ?? [],
    );
    const weeklySummary =
      progressContext.weeklySummary ??
      this.buildSummaryFromWorkoutHistory(workoutHistory, 'week');
    const monthlySummary =
      progressContext.monthlySummary ??
      this.buildSummaryFromWorkoutHistory(workoutHistory, 'month');
    const workoutExpert = this.readExpertSnapshot(
      context.runtimeMetadata.workoutExpert,
    );
    const nutritionExpert = this.readExpertSnapshot(
      context.runtimeMetadata.nutritionExpert,
    );
    const recoveryExpert = this.readExpertSnapshot(
      context.runtimeMetadata.recoveryExpert,
    );
    const goalExpert = this.readExpertSnapshot(
      context.runtimeMetadata.goalExpert,
    );
    const habitExpert = this.readExpertSnapshot(
      context.runtimeMetadata.habitExpert,
    );

    const comparison = this.compareWindows(workoutHistory);
    const weeklyWorkoutAdherence = this.resolveAdherencePercentage(
      weeklySummary,
      healthContext.weeklyFrequency,
      RECENT_WINDOW_DAYS,
    );
    const monthlyWorkoutAdherence = this.resolveAdherencePercentage(
      monthlySummary,
      healthContext.weeklyFrequency,
      HISTORY_WINDOW_DAYS,
    );
    const inactivityDays = this.resolveInactivityDays({
      weeklySummary,
      monthlySummary,
      workoutHistory,
      healthContext,
    });
    const consistency = this.buildConsistencyAssessment({
      weeklyWorkoutAdherence,
      monthlyWorkoutAdherence,
      comparison,
      checkInHistory,
      workoutExpert,
      recoveryExpert,
      habitExpert,
      inactivityDays,
    });
    const trend = this.buildTrendAssessment({
      weeklySummary,
      monthlySummary,
      comparison,
      workoutExpert,
      nutritionExpert,
      recoveryExpert,
      goalExpert,
      habitExpert,
      inactivityDays,
      checkInHistory,
    });
    const momentum = this.buildMomentumAssessment({
      trend,
      consistency,
      inactivityDays,
      comparison,
      goalExpert,
      habitExpert,
    });
    const plateau = this.buildPlateauAssessment({
      trend,
      comparison,
      inactivityDays,
      workoutHistory,
      workoutExpert,
      goalExpert,
      habitExpert,
    });
    const regression = this.buildRegressionAssessment({
      trend,
      consistency,
      plateau,
      inactivityDays,
      workoutExpert,
      nutritionExpert,
      recoveryExpert,
      goalExpert,
      habitExpert,
    });
    const overallProgress = this.resolveOverallProgress({
      trend,
      momentum,
      plateau,
      regression,
      consistency,
      inactivityDays,
    });
    const recommendations = this.buildRecommendations({
      overallProgress,
      trend,
      momentum,
      plateau,
      regression,
      consistency,
      inactivityDays,
      workoutExpert,
      nutritionExpert,
      recoveryExpert,
      goalExpert,
      habitExpert,
    });
    const risks = [
      this.buildRiskAssessment({
        overallProgress,
        trend,
        momentum,
        plateau,
        regression,
        consistency,
        inactivityDays,
        workoutExpert,
        nutritionExpert,
        recoveryExpert,
        goalExpert,
        habitExpert,
      }),
    ];
    const confidence = this.buildConfidence({
      healthContext,
      progressContext,
      workoutHistory,
      checkInHistory,
      workoutExpert,
      nutritionExpert,
      recoveryExpert,
      goalExpert,
      habitExpert,
    });
    const summary = this.buildSummary({
      overallProgress,
      trend,
      momentum,
      plateau,
      regression,
      consistency,
      confidence,
      recommendation: recommendations[0],
    });

    return Object.freeze({
      overallProgress,
      trend,
      momentum,
      plateau,
      regression,
      consistency,
      recommendations: Object.freeze(recommendations),
      risks: Object.freeze(risks),
      confidence,
      summary,
      recentWorkoutCount: workoutHistory.slice(-RECENT_WINDOW_DAYS).length,
      monthlyWorkoutCount: monthlySummary.workoutsCompleted,
      weeklyWorkoutAdherence,
      monthlyWorkoutAdherence,
      inactivityDays,
      historyCount: workoutHistory.length,
      checkInHistoryCount: checkInHistory.length,
      sourceCoverage: Object.freeze({
        progressSummaryPresent: Boolean(
          progressContext.weeklySummary || progressContext.monthlySummary,
        ),
        workoutHistoryPresent: workoutHistory.length > 0,
        checkInHistoryPresent: checkInHistory.length > 0,
        workoutExpertPresent: Boolean(workoutExpert),
        nutritionExpertPresent: Boolean(nutritionExpert),
        recoveryExpertPresent: Boolean(recoveryExpert),
        goalExpertPresent: Boolean(goalExpert),
        habitExpertPresent: Boolean(habitExpert),
      }),
    });
  }

  private buildUnavailableAnalysis(input: {
    healthContextAvailable: boolean;
    progressContextAvailable: boolean;
  }): ProgressAnalysis {
    const unavailableReason = input.healthContextAvailable
      ? input.progressContextAvailable
        ? 'progress_summary_unavailable'
        : 'progress_context_missing'
      : 'health_context_missing';
    const recommendation = this.createRecommendation(
      'FOCUS_ON_LONG_TERM_CONSISTENCY',
      'Focus on long-term consistency.',
      'Trusted longitudinal progress data is not available for a stronger recommendation.',
      'MEDIUM',
      {
        reason: 'unavailable',
      },
    );

    return Object.freeze({
      overallProgress: 'UNKNOWN',
      trend: Object.freeze({
        trend: 'UNKNOWN',
        summary: 'Progress trend is unavailable.',
        factors: Object.freeze([]),
        metadata: Object.freeze({ reason: 'unavailable' }),
      }),
      momentum: Object.freeze({
        momentum: 'UNKNOWN',
        summary: 'Progress momentum is unavailable.',
        factors: Object.freeze([]),
        metadata: Object.freeze({ reason: 'unavailable' }),
      }),
      plateau: Object.freeze({
        plateau: 'UNKNOWN',
        durationDays: null,
        summary: 'Progress plateau is unavailable.',
        factors: Object.freeze([]),
        metadata: Object.freeze({ reason: unavailableReason }),
      }),
      regression: Object.freeze({
        regression: 'UNKNOWN',
        summary: 'Progress regression is unavailable.',
        factors: Object.freeze([]),
        metadata: Object.freeze({ reason: unavailableReason }),
      }),
      consistency: Object.freeze({
        weeklyConsistency: 'UNKNOWN',
        monthlyConsistency: 'UNKNOWN',
        historicalConsistency: 'UNKNOWN',
        overallConsistency: 'UNKNOWN',
        summary: 'Progress consistency is unavailable.',
        metadata: Object.freeze({ reason: unavailableReason }),
      }),
      recommendations: Object.freeze([recommendation]),
      risks: Object.freeze([
        Object.freeze({
          level: 'CRITICAL',
          summary: 'Progress analysis is unavailable.',
          factors: Object.freeze([
            input.healthContextAvailable
              ? 'progress_context_missing'
              : 'health_context_missing',
          ]),
          metadata: Object.freeze({ reason: 'unavailable' }),
        }),
      ]),
      confidence: 'LOW',
      summary:
        'overall=UNKNOWN; trend=UNKNOWN; momentum=UNKNOWN; plateau=UNKNOWN; regression=UNKNOWN; consistency=UNKNOWN; confidence=LOW; recommendation=FOCUS_ON_LONG_TERM_CONSISTENCY',
      recentWorkoutCount: 0,
      monthlyWorkoutCount: 0,
      weeklyWorkoutAdherence: null,
      monthlyWorkoutAdherence: null,
      inactivityDays: null,
      historyCount: 0,
      checkInHistoryCount: 0,
      sourceCoverage: Object.freeze({
        progressSummaryPresent: false,
        workoutHistoryPresent: false,
        checkInHistoryPresent: false,
        workoutExpertPresent: false,
        nutritionExpertPresent: false,
        recoveryExpertPresent: false,
        goalExpertPresent: false,
        habitExpertPresent: false,
      }),
    });
  }

  private buildContribution(
    analysis: ProgressAnalysis,
    context: CoachExpertContext,
  ): ProgressExpertContribution {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      analysis.recommendations,
    );

    return Object.freeze({
      expertId: this.metadata.id,
      summary: analysis.summary,
      analysis,
      overallProgress: analysis.overallProgress,
      trend: analysis.trend,
      momentum: analysis.momentum,
      plateau: analysis.plateau,
      regression: analysis.regression,
      consistency: analysis.consistency,
      recommendations: analysis.recommendations,
      risks: analysis.risks,
      confidence: analysis.confidence,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        selectionReason: context.selectionReason,
        priority: analysis.risks[0]?.level ?? 'LOW',
        overallProgress: analysis.overallProgress,
        trend: analysis.trend.trend,
        momentum: analysis.momentum.momentum,
        plateau: analysis.plateau.plateau,
        regression: analysis.regression.regression,
        consistency: analysis.consistency.overallConsistency,
        confidence: analysis.confidence,
        recommendationCodes: analysis.recommendations.map(
          (recommendation) => recommendation.code,
        ),
        primaryRecommendation: primaryRecommendation.code,
      }),
    });
  }

  private buildContributions(
    contribution: ProgressExpertContribution,
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
          progressContribution: contribution,
          kind: 'analysis',
        }),
      }),
      Object.freeze({
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: primaryRecommendation.summary,
        metadata: Object.freeze({
          progressContribution: contribution,
          kind: 'contribution',
          recommendationCode: primaryRecommendation.code,
        }),
      }),
    ]);
  }

  private buildTrendAssessment(input: {
    weeklySummary: ProgressSummaryLike;
    monthlySummary: ProgressSummaryLike;
    comparison: ProgressWindowComparison;
    workoutExpert: ExpertSnapshot | undefined;
    nutritionExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
    inactivityDays: number | null;
    checkInHistory: readonly CheckInHistoryLike[];
  }): ProgressTrendAssessment {
    const factors: string[] = [];
    let score = 0;

    const weeklyRate =
      input.weeklySummary.workoutsCompleted / RECENT_WINDOW_DAYS;
    const monthlyRate =
      input.monthlySummary.workoutsCompleted / HISTORY_WINDOW_DAYS;

    if (
      input.monthlySummary.workoutsCompleted === 0 &&
      input.weeklySummary.workoutsCompleted > 0
    ) {
      score += 2;
      factors.push('weekly_workouts_present_against_empty_month');
    } else if (weeklyRate >= monthlyRate * 1.2) {
      score += 1;
      factors.push('weekly_rate_above_monthly_rate');
    } else if (weeklyRate <= monthlyRate * 0.8) {
      score -= 1;
      factors.push('weekly_rate_below_monthly_rate');
    }

    if (
      input.weeklySummary.totalDurationMinutes >
      input.monthlySummary.totalDurationMinutes * 0.45
    ) {
      score += 1;
      factors.push('weekly_duration_outpacing_monthly_average');
    } else if (
      input.monthlySummary.totalDurationMinutes > 0 &&
      input.weeklySummary.totalDurationMinutes <
        input.monthlySummary.totalDurationMinutes * 0.2
    ) {
      score -= 1;
      factors.push('weekly_duration_below_monthly_average');
    }

    if (
      input.weeklySummary.currentStreak > input.monthlySummary.currentStreak
    ) {
      score += 1;
      factors.push('current_streak_improving');
    } else if (
      input.weeklySummary.currentStreak < input.monthlySummary.currentStreak
    ) {
      score -= 1;
      factors.push('current_streak_softening');
    }

    if (
      input.comparison.previousRate !== null &&
      input.comparison.recentRate !== null
    ) {
      const ratio =
        input.comparison.previousRate === 0
          ? input.comparison.recentRate > 0
            ? Number.POSITIVE_INFINITY
            : 1
          : input.comparison.recentRate / input.comparison.previousRate;

      if (ratio >= 1.4) {
        score += 2;
        factors.push('weekly_rate_outpacing_monthly_rate');
      } else if (ratio >= 1.1) {
        score += 1;
        factors.push('weekly_rate_above_monthly_rate');
      } else if (ratio <= 0.6) {
        score -= 2;
        factors.push('weekly_rate_well_below_monthly_rate');
      } else if (ratio <= 0.9) {
        score -= 1;
        factors.push('weekly_rate_below_monthly_rate');
      }
    }

    if (
      input.comparison.previousDuration > 0 ||
      input.comparison.recentDuration > 0
    ) {
      const durationDelta = input.comparison.durationDelta;

      if (durationDelta >= 30) {
        score += 1;
        factors.push('recent_workout_duration_increasing');
      } else if (durationDelta <= -30) {
        score -= 1;
        factors.push('recent_workout_duration_declining');
      }
    }

    const recentWindow = this.compareRecentCheckInWindows(input.checkInHistory);
    if (recentWindow.delta >= 2) {
      score += 1;
      factors.push('recent_check_in_signals_improving');
    } else if (recentWindow.delta <= -2) {
      score -= 1;
      factors.push('recent_check_in_signals_declining');
    }

    score += this.readTrendSignal(input.workoutExpert?.trainingStatus, {
      positive: ['completed', 'partially_completed'],
      negative: ['skipped', 'unavailable'],
    });
    score += this.readTrendSignal(input.nutritionExpert?.nutritionStatus, {
      positive: ['ON_TRACK', 'PARTIAL'],
      negative: ['MISSED', 'NO_PLAN', 'NO_PROFILE'],
    });
    score += this.readTrendSignal(input.recoveryExpert?.recoveryStatus, {
      positive: ['OPTIMAL', 'GOOD'],
      negative: ['POOR', 'CRITICAL'],
    });
    score += this.readTrendSignal(input.recoveryExpert?.trend, {
      positive: ['IMPROVING'],
      negative: ['DECLINING'],
    });
    score += this.readTrendSignal(input.goalExpert?.progressTrend, {
      positive: ['IMPROVING', 'STRONGLY_IMPROVING'],
      negative: ['DECLINING', 'REGRESSING'],
    });
    score += this.readTrendSignal(input.goalExpert?.goalStatus, {
      positive: ['COMPLETED', 'ON_TRACK', 'SLIGHTLY_BEHIND'],
      negative: ['BEHIND', 'AT_RISK'],
    });
    score += this.readTrendSignal(input.habitExpert?.trend, {
      positive: ['IMPROVING'],
      negative: ['DECLINING'],
    });
    score += this.readTrendSignal(input.habitExpert?.habitStatus, {
      positive: ['EXCELLENT', 'GOOD'],
      negative: ['POOR', 'BROKEN'],
    });

    if ((input.inactivityDays ?? 0) >= 14) {
      score -= 2;
      factors.push(`inactivity_days=${input.inactivityDays}`);
    }

    const trend = this.resolveTrendFromScore(score);

    return Object.freeze({
      trend,
      summary: this.buildTrendSummary(trend, factors),
      factors: Object.freeze(
        factors.length ? [...new Set(factors)] : ['no_material_trend_signal'],
      ),
      metadata: Object.freeze({
        score,
        weeklyRate: input.comparison.recentRate,
        monthlyRate: input.comparison.previousRate,
        inactivityDays: input.inactivityDays,
        workoutExpertPresent: Boolean(input.workoutExpert),
        nutritionExpertPresent: Boolean(input.nutritionExpert),
        recoveryExpertPresent: Boolean(input.recoveryExpert),
        goalExpertPresent: Boolean(input.goalExpert),
        habitExpertPresent: Boolean(input.habitExpert),
      }),
    });
  }

  private buildMomentumAssessment(input: {
    trend: ProgressTrendAssessment;
    consistency: ProgressConsistencyAssessment;
    inactivityDays: number | null;
    comparison: ProgressWindowComparison;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
  }): ProgressMomentumAssessment {
    const factors: string[] = [];
    let score = 0;

    switch (input.trend.trend) {
      case 'STRONGLY_IMPROVING':
        score += 3;
        factors.push('strong_improvement');
        break;
      case 'IMPROVING':
        score += 2;
        factors.push('improving');
        break;
      case 'STABLE':
        score += 0;
        factors.push('stable_trend');
        break;
      case 'DECLINING':
        score -= 2;
        factors.push('declining');
        break;
      case 'REGRESSING':
        score -= 3;
        factors.push('regressing');
        break;
      default:
        break;
    }

    if (input.consistency.overallConsistency === 'HIGH') {
      score += 1;
      factors.push('high_consistency');
    } else if (input.consistency.overallConsistency === 'LOW') {
      score -= 1;
      factors.push('low_consistency');
    }

    if (
      input.comparison.countDelta >= 2 ||
      input.comparison.durationDelta >= 60
    ) {
      score += 1;
      factors.push('recent_positive_change');
    }

    if (
      input.comparison.countDelta <= -2 ||
      input.comparison.durationDelta <= -60
    ) {
      score -= 1;
      factors.push('recent_negative_change');
    }

    if ((input.inactivityDays ?? 0) >= 21) {
      score -= 3;
      factors.push(`inactivity_days=${input.inactivityDays}`);
    }

    score += this.readMomentumSignal(input.goalExpert?.progressTrend, {
      positive: ['IMPROVING', 'STRONGLY_IMPROVING'],
      negative: ['DECLINING', 'REGRESSING'],
    });
    score += this.readMomentumSignal(input.goalExpert?.forecastStatus, {
      positive: ['LIKELY'],
      negative: ['UNLIKELY'],
    });
    score += this.readMomentumSignal(input.habitExpert?.trend, {
      positive: ['IMPROVING'],
      negative: ['DECLINING'],
    });

    const momentum = this.resolveMomentumFromScore(score);

    return Object.freeze({
      momentum,
      summary: this.buildMomentumSummary(momentum, factors),
      factors: Object.freeze(
        factors.length
          ? [...new Set(factors)]
          : ['no_material_momentum_signal'],
      ),
      metadata: Object.freeze({
        score,
        trend: input.trend.trend,
        inactivityDays: input.inactivityDays,
      }),
    });
  }

  private buildPlateauAssessment(input: {
    trend: ProgressTrendAssessment;
    comparison: ProgressWindowComparison;
    inactivityDays: number | null;
    workoutHistory: readonly WorkoutHistoryLike[];
    workoutExpert: ExpertSnapshot | undefined;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
  }): ProgressPlateauAssessment {
    const factors: string[] = [];
    const isFlatRecent =
      Math.abs(input.comparison.countDelta) <= 1 &&
      Math.abs(input.comparison.durationDelta) <= 20 &&
      this.isRateFlat(
        input.comparison.recentRate,
        input.comparison.previousRate,
      );

    if (input.trend.trend === 'STABLE' && isFlatRecent) {
      factors.push('no_measurable_evolution');
    }

    if (this.isSameLoadPattern(input.workoutHistory)) {
      factors.push('same_training_load');
    }

    if (
      this.isStagnantCrossDomain(
        input.workoutExpert,
        input.goalExpert,
        input.habitExpert,
      )
    ) {
      factors.push('stagnant_cross_domain_signals');
    }

    const factorCount = factors.length;
    let plateau: ProgressPlateau = 'NONE';
    let durationDays: number | null = null;

    if (factorCount > 0 && input.trend.trend === 'STABLE') {
      if (
        (input.inactivityDays ?? 0) >= 30 ||
        input.workoutHistory.length >= 30
      ) {
        plateau = 'LONG';
        durationDays = 30;
      } else if (
        (input.inactivityDays ?? 0) >= 14 ||
        input.workoutHistory.length >= 14
      ) {
        plateau = 'MODERATE';
        durationDays = 14;
      } else {
        plateau = 'SHORT';
        durationDays = 7;
      }
    }

    return Object.freeze({
      plateau,
      durationDays,
      summary: this.buildPlateauSummary(plateau, factors),
      factors: Object.freeze(
        factors.length ? [...new Set(factors)] : ['no_plateau_detected'],
      ),
      metadata: Object.freeze({
        factorCount,
        trend: input.trend.trend,
        inactivityDays: input.inactivityDays,
        workoutHistoryCount: input.workoutHistory.length,
      }),
    });
  }

  private buildRegressionAssessment(input: {
    trend: ProgressTrendAssessment;
    consistency: ProgressConsistencyAssessment;
    plateau: ProgressPlateauAssessment;
    inactivityDays: number | null;
    workoutExpert: ExpertSnapshot | undefined;
    nutritionExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
  }): ProgressRegressionAssessment {
    const factors: string[] = [];
    let score = 0;

    if ((input.inactivityDays ?? 0) >= 30) {
      score += 5;
      factors.push(`prolonged_inactivity=${input.inactivityDays}`);
    } else if ((input.inactivityDays ?? 0) >= 21) {
      score += 3;
      factors.push(`prolonged_inactivity=${input.inactivityDays}`);
    } else if ((input.inactivityDays ?? 0) >= 14) {
      score += 2;
      factors.push(`extended_inactivity=${input.inactivityDays}`);
    } else if ((input.inactivityDays ?? 0) >= 7) {
      score += 1;
      factors.push(`recent_inactivity=${input.inactivityDays}`);
    }

    if (input.trend.trend === 'DECLINING') {
      score += 1;
      factors.push('declining_trend');
    }

    if (input.trend.trend === 'REGRESSING') {
      score += 2;
      factors.push('regressing_trend');
    }

    if (input.consistency.overallConsistency === 'LOW') {
      score += 1;
      factors.push('low_overall_consistency');
    }

    if (input.plateau.plateau === 'LONG') {
      score += 2;
      factors.push('long_plateau');
    } else if (input.plateau.plateau === 'MODERATE') {
      score += 1;
      factors.push('moderate_plateau');
    }

    score += this.readRegressionSignal(input.workoutExpert?.trainingStatus, {
      positive: ['completed', 'partially_completed', 'scheduled'],
      negative: ['skipped', 'unavailable'],
    });
    score += this.readRegressionSignal(input.nutritionExpert?.nutritionStatus, {
      positive: ['ON_TRACK', 'PARTIAL'],
      negative: ['MISSED', 'NO_PLAN', 'NO_PROFILE'],
    });
    score += this.readRegressionSignal(input.recoveryExpert?.recoveryStatus, {
      positive: ['OPTIMAL', 'GOOD', 'MODERATE'],
      negative: ['POOR', 'CRITICAL'],
    });
    score += this.readRegressionSignal(input.goalExpert?.goalStatus, {
      positive: ['COMPLETED', 'ON_TRACK', 'SLIGHTLY_BEHIND'],
      negative: ['BEHIND', 'AT_RISK'],
    });
    score += this.readRegressionSignal(input.habitExpert?.habitStatus, {
      positive: ['EXCELLENT', 'GOOD', 'INCONSISTENT'],
      negative: ['POOR', 'BROKEN'],
    });

    const regression = this.resolveRegressionFromScore(score);

    return Object.freeze({
      regression,
      summary: this.buildRegressionSummary(regression, factors),
      factors: Object.freeze(
        factors.length ? [...new Set(factors)] : ['no_regression_detected'],
      ),
      metadata: Object.freeze({
        score,
        trend: input.trend.trend,
        plateau: input.plateau.plateau,
        inactivityDays: input.inactivityDays,
      }),
    });
  }

  private buildConsistencyAssessment(input: {
    weeklyWorkoutAdherence: number | null;
    monthlyWorkoutAdherence: number | null;
    comparison: ProgressWindowComparison;
    checkInHistory: readonly CheckInHistoryLike[];
    workoutExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
    inactivityDays: number | null;
  }): ProgressConsistencyAssessment {
    const weeklyConsistency = this.resolveConsistencyLevel(
      input.weeklyWorkoutAdherence,
    );
    const monthlyConsistency = this.resolveConsistencyLevel(
      input.monthlyWorkoutAdherence,
    );
    const historicalConsistency = this.resolveHistoricalConsistency({
      comparison: input.comparison,
      checkInHistory: input.checkInHistory,
      inactivityDays: input.inactivityDays,
      workoutExpert: input.workoutExpert,
      recoveryExpert: input.recoveryExpert,
      habitExpert: input.habitExpert,
    });
    const overallConsistency = this.resolveOverallConsistency([
      weeklyConsistency,
      monthlyConsistency,
      historicalConsistency,
    ]);

    return Object.freeze({
      weeklyConsistency,
      monthlyConsistency,
      historicalConsistency,
      overallConsistency,
      summary: [
        `weekly=${weeklyConsistency}`,
        `monthly=${monthlyConsistency}`,
        `historical=${historicalConsistency}`,
        `overall=${overallConsistency}`,
      ].join('; '),
      metadata: Object.freeze({
        weeklyWorkoutAdherence: input.weeklyWorkoutAdherence,
        monthlyWorkoutAdherence: input.monthlyWorkoutAdherence,
        comparisonCountDelta: input.comparison.countDelta,
        comparisonDurationDelta: input.comparison.durationDelta,
        checkInHistoryCount: input.checkInHistory.length,
      }),
    });
  }

  private buildRiskAssessment(input: {
    overallProgress: ProgressStatus;
    trend: ProgressTrendAssessment;
    momentum: ProgressMomentumAssessment;
    plateau: ProgressPlateauAssessment;
    regression: ProgressRegressionAssessment;
    consistency: ProgressConsistencyAssessment;
    inactivityDays: number | null;
    workoutExpert: ExpertSnapshot | undefined;
    nutritionExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
  }): ProgressRiskAssessment {
    const factors: string[] = [];
    let level: ProgressRiskLevel = 'LOW';

    if (input.overallProgress === 'REGRESSION') {
      level = 'CRITICAL';
      factors.push('overall_regression');
    }

    if (input.regression.regression === 'SEVERE') {
      level = 'CRITICAL';
      factors.push('severe_regression');
    }

    if (input.momentum.momentum === 'VERY_NEGATIVE') {
      level = 'CRITICAL';
      factors.push('very_negative_momentum');
    }

    if (input.plateau.plateau === 'LONG') {
      level = this.escalateRisk(level, 'HIGH');
      factors.push('long_plateau');
    }

    if (input.trend.trend === 'DECLINING') {
      level = this.escalateRisk(level, 'HIGH');
      factors.push('declining_trend');
    }

    if (input.consistency.overallConsistency === 'LOW') {
      level = this.escalateRisk(level, 'HIGH');
      factors.push('low_consistency');
    }

    if ((input.inactivityDays ?? 0) >= 21) {
      level = 'CRITICAL';
      factors.push(`prolonged_inactivity=${input.inactivityDays}`);
    }

    if (
      this.countNegativeDomains(
        input.workoutExpert,
        input.nutritionExpert,
        input.recoveryExpert,
        input.goalExpert,
        input.habitExpert,
      ) >= 3
    ) {
      level = this.escalateRisk(level, 'HIGH');
      factors.push('multiple_negative_cross_domain_signals');
    }

    return Object.freeze({
      level,
      summary: this.buildRiskSummary(level, factors),
      factors: Object.freeze(
        factors.length ? [...new Set(factors)] : ['no_material_risk'],
      ),
      metadata: Object.freeze({
        overallProgress: input.overallProgress,
        trend: input.trend.trend,
        momentum: input.momentum.momentum,
        plateau: input.plateau.plateau,
        regression: input.regression.regression,
        consistency: input.consistency.overallConsistency,
        inactivityDays: input.inactivityDays,
      }),
    });
  }

  private buildRecommendations(input: {
    overallProgress: ProgressStatus;
    trend: ProgressTrendAssessment;
    momentum: ProgressMomentumAssessment;
    plateau: ProgressPlateauAssessment;
    regression: ProgressRegressionAssessment;
    consistency: ProgressConsistencyAssessment;
    inactivityDays: number | null;
    workoutExpert: ExpertSnapshot | undefined;
    nutritionExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
  }): readonly ProgressRecommendation[] {
    const recommendations = new Map<
      ProgressRecommendationCode,
      ProgressRecommendation
    >();

    const addRecommendation = (
      recommendation: ProgressRecommendation,
    ): void => {
      if (!recommendations.has(recommendation.code)) {
        recommendations.set(recommendation.code, recommendation);
      }
    };

    if (
      input.overallProgress === 'REGRESSION' ||
      input.regression.regression === 'SEVERE'
    ) {
      addRecommendation(
        this.createRecommendation(
          'REDUCE_INACTIVITY',
          'Reduce inactivity.',
          'Prolonged inactivity is the strongest driver of regression.',
          'CRITICAL',
          {
            inactivityDays: input.inactivityDays,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'REBUILD_BASELINE_ROUTINE',
          'Rebuild baseline routine.',
          'The current progression is too unstable to support load increases.',
          'HIGH',
          {
            regression: input.regression.regression,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'FOCUS_ON_LONG_TERM_CONSISTENCY',
          'Focus on long-term consistency.',
          'Long-term progress requires a stable base before adding complexity.',
          'HIGH',
          {
            consistency: input.consistency.overallConsistency,
          },
        ),
      );
    }

    if (
      input.plateau.plateau === 'LONG' ||
      input.plateau.plateau === 'MODERATE'
    ) {
      addRecommendation(
        this.createRecommendation(
          'BREAK_CURRENT_PLATEAU',
          'Break the current plateau.',
          'The available longitudinal signals are no longer moving materially.',
          'HIGH',
          {
            plateau: input.plateau.plateau,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'REVIEW_TRAINING_PROGRESSION',
          'Review training progression.',
          'Training load is not producing measurable evolution.',
          'MEDIUM',
          {
            trend: input.trend.trend,
          },
        ),
      );
    }

    if (
      input.trend.trend === 'IMPROVING' ||
      input.trend.trend === 'STRONGLY_IMPROVING'
    ) {
      addRecommendation(
        this.createRecommendation(
          'MAINTAIN_CURRENT_PROGRESSION',
          'Maintain current progression.',
          'The athlete is improving without corrective intervention.',
          'LOW',
          {
            trend: input.trend.trend,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'INCREASE_PROGRESSIVE_OVERLOAD',
          'Increase progressive overload.',
          'The current trend supports a controlled increase in challenge.',
          'MEDIUM',
          {
            momentum: input.momentum.momentum,
          },
        ),
      );
    }

    if (
      input.trend.trend === 'DECLINING' ||
      input.momentum.momentum === 'NEGATIVE' ||
      input.momentum.momentum === 'VERY_NEGATIVE'
    ) {
      addRecommendation(
        this.createRecommendation(
          'IMPROVE_WEEKLY_CONSISTENCY',
          'Improve weekly consistency.',
          'Week-to-week stability is too weak to sustain progress.',
          'HIGH',
          {
            weeklyConsistency: input.consistency.weeklyConsistency,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'REDUCE_INACTIVITY',
          'Reduce inactivity.',
          'Inactivity is reducing the probability of continued progress.',
          'HIGH',
          {
            inactivityDays: input.inactivityDays,
          },
        ),
      );
    }

    if (
      input.consistency.overallConsistency === 'LOW' ||
      input.consistency.monthlyConsistency === 'LOW'
    ) {
      addRecommendation(
        this.createRecommendation(
          'IMPROVE_RECOVERY_CONSISTENCY',
          'Improve recovery consistency.',
          'Recovery signals are not stable enough to support smoother progression.',
          'MEDIUM',
          {
            consistency: input.consistency.overallConsistency,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'STABILIZE_NUTRITION_AND_RECOVERY',
          'Stabilize nutrition and recovery.',
          'Cross-domain consistency is limiting longer-term evolution.',
          'MEDIUM',
          {
            nutritionStatus: this.readString(
              input.nutritionExpert?.nutritionStatus,
            ),
            recoveryStatus: this.readString(
              input.recoveryExpert?.recoveryStatus,
            ),
          },
        ),
      );
    }

    if (
      input.overallProgress === 'STABLE' ||
      input.overallProgress === 'GOOD' ||
      input.overallProgress === 'EXCELLENT'
    ) {
      addRecommendation(
        this.createRecommendation(
          'MAINTAIN_CURRENT_MOMENTUM',
          'Maintain current momentum.',
          'The current trajectory is sufficiently stable to preserve.',
          'LOW',
          {
            overallProgress: input.overallProgress,
          },
        ),
      );
    }

    if (recommendations.size === 0) {
      addRecommendation(
        this.createRecommendation(
          'FOCUS_ON_LONG_TERM_CONSISTENCY',
          'Focus on long-term consistency.',
          'The available signals do not justify a more specific progression adjustment.',
          'MEDIUM',
          {
            overallProgress: input.overallProgress,
          },
        ),
      );
    }

    const uniqueCodes = [...recommendations.keys()].sort((left, right) => {
      const leftPriority = this.resolveRecommendationPriority(left);
      const rightPriority = this.resolveRecommendationPriority(right);

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left) - RECOMMENDATION_ORDER.indexOf(right)
      );
    });

    return uniqueCodes.map(
      (code) => recommendations.get(code) as ProgressRecommendation,
    );
  }

  private buildConfidence(input: {
    healthContext: NonNullable<CoachExpertContext['healthContext']>;
    progressContext: ProgressContext;
    workoutHistory: readonly WorkoutHistoryLike[];
    checkInHistory: readonly CheckInHistoryLike[];
    workoutExpert: ExpertSnapshot | undefined;
    nutritionExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
  }): ProgressConfidence {
    let score = 0;

    if (input.progressContext.weeklySummary) {
      score += 2;
    }

    if (input.progressContext.monthlySummary) {
      score += 2;
    }

    if (input.workoutHistory.length >= 7) {
      score += 1;
    }

    if (input.checkInHistory.length >= 7) {
      score += 1;
    }

    if (input.healthContext.recentWorkoutLogs.length > 0) {
      score += 1;
    }

    if (input.workoutExpert) {
      score += 1;
    }

    if (input.nutritionExpert) {
      score += 1;
    }

    if (input.recoveryExpert) {
      score += 1;
    }

    if (input.goalExpert) {
      score += 1;
    }

    if (input.habitExpert) {
      score += 1;
    }

    if (score >= 8) {
      return 'HIGH';
    }

    if (score >= 5) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private buildSummary(input: {
    overallProgress: ProgressStatus;
    trend: ProgressTrendAssessment;
    momentum: ProgressMomentumAssessment;
    plateau: ProgressPlateauAssessment;
    regression: ProgressRegressionAssessment;
    consistency: ProgressConsistencyAssessment;
    confidence: ProgressConfidence;
    recommendation: ProgressRecommendation;
  }): string {
    return [
      `overall=${input.overallProgress}`,
      `trend=${input.trend.trend}`,
      `momentum=${input.momentum.momentum}`,
      `plateau=${input.plateau.plateau}`,
      `regression=${input.regression.regression}`,
      `consistency=${input.consistency.overallConsistency}`,
      `confidence=${input.confidence}`,
      `recommendation=${input.recommendation.code}`,
    ].join('; ');
  }

  private buildTrendSummary(
    trend: ProgressTrend,
    factors: readonly string[],
  ): string {
    void factors;
    if (factors.length === 0) {
      return `Progress trend is ${trend.toLowerCase()}.`;
    }

    return `Progress trend is ${trend.toLowerCase()}.`;
  }

  private buildMomentumSummary(
    momentum: ProgressMomentum,
    factors: readonly string[],
  ): string {
    void factors;
    return `Progress momentum is ${momentum.toLowerCase()}.`;
  }

  private buildPlateauSummary(
    plateau: ProgressPlateau,
    factors: readonly string[],
  ): string {
    void factors;
    if (plateau === 'NONE') {
      return 'No plateau detected.';
    }

    return `Progress plateau is ${plateau.toLowerCase()}.`;
  }

  private buildRegressionSummary(
    regression: ProgressRegression,
    factors: readonly string[],
  ): string {
    void factors;
    if (regression === 'NONE') {
      return 'No regression detected.';
    }

    return `Progress regression is ${regression.toLowerCase()}.`;
  }

  private buildRiskSummary(
    level: ProgressRiskLevel,
    factors: readonly string[],
  ): string {
    void factors;
    if (factors.length === 0) {
      return `Progress risk is ${level.toLowerCase()}.`;
    }

    return `Progress risk is ${level.toLowerCase()}.`;
  }

  private normalizeWorkoutHistory(
    workoutHistory: readonly WorkoutHistoryLike[],
  ): readonly WorkoutHistoryLike[] {
    return [...workoutHistory].sort((left, right) => {
      const leftValue = this.resolveDateValue(left.date, left.createdAt);
      const rightValue = this.resolveDateValue(right.date, right.createdAt);

      return leftValue - rightValue;
    });
  }

  private normalizeCheckInHistory(
    checkInHistory: readonly CheckInHistoryLike[],
  ): readonly CheckInHistoryLike[] {
    return [...checkInHistory].sort((left, right) => {
      const leftValue = this.resolveDateValue(left.createdAt);
      const rightValue = this.resolveDateValue(right.createdAt);

      return leftValue - rightValue;
    });
  }

  private buildSummaryFromWorkoutHistory(
    workoutHistory: readonly WorkoutHistoryLike[],
    period: 'week' | 'month',
  ): ProgressSummaryLike {
    const windowSize =
      period === 'week' ? RECENT_WINDOW_DAYS : HISTORY_WINDOW_DAYS;
    const window = workoutHistory.slice(-windowSize);
    const workoutsCompleted = window.length;
    const totalDurationMinutes = window.reduce(
      (total, workout) => total + workout.durationMinutes,
      0,
    );
    const averageDurationMinutes =
      workoutsCompleted === 0
        ? 0
        : this.roundToTwoDecimals(totalDurationMinutes / workoutsCompleted);
    const lastWorkoutDate = window.reduce<string | null>(
      (latest, workout) =>
        latest === null || workout.date > latest ? workout.date : latest,
      null,
    );

    return {
      period,
      workoutsCompleted,
      totalDurationMinutes,
      averageDurationMinutes,
      lastWorkoutDate,
      currentStreak: this.calculateStreak(window),
    };
  }

  private compareWindows(
    workoutHistory: readonly WorkoutHistoryLike[],
  ): ProgressWindowComparison {
    if (workoutHistory.length < RECENT_WINDOW_DAYS) {
      return {
        recentCount: workoutHistory.length,
        previousCount: 0,
        recentDuration: workoutHistory.reduce(
          (total, workout) => total + workout.durationMinutes,
          0,
        ),
        previousDuration: 0,
        recentAverageDuration:
          workoutHistory.length === 0
            ? 0
            : this.roundToTwoDecimals(
                workoutHistory.reduce(
                  (total, workout) => total + workout.durationMinutes,
                  0,
                ) / workoutHistory.length,
              ),
        previousAverageDuration: 0,
        recentRate:
          workoutHistory.length === 0
            ? null
            : workoutHistory.length / RECENT_WINDOW_DAYS,
        previousRate: null,
        countDelta: workoutHistory.length,
        durationDelta: workoutHistory.reduce(
          (total, workout) => total + workout.durationMinutes,
          0,
        ),
      };
    }

    const recentWindow = workoutHistory.slice(-RECENT_WINDOW_DAYS);
    const previousWindow = workoutHistory.slice(
      Math.max(0, workoutHistory.length - RECENT_WINDOW_DAYS * 2),
      workoutHistory.length - RECENT_WINDOW_DAYS,
    );
    const recentCount = recentWindow.length;
    const previousCount = previousWindow.length;
    const recentDuration = recentWindow.reduce(
      (total, workout) => total + workout.durationMinutes,
      0,
    );
    const previousDuration = previousWindow.reduce(
      (total, workout) => total + workout.durationMinutes,
      0,
    );
    const recentAverageDuration =
      recentCount === 0
        ? 0
        : this.roundToTwoDecimals(recentDuration / recentCount);
    const previousAverageDuration =
      previousCount === 0
        ? 0
        : this.roundToTwoDecimals(previousDuration / previousCount);

    return {
      recentCount,
      previousCount,
      recentDuration,
      previousDuration,
      recentAverageDuration,
      previousAverageDuration,
      recentRate: recentCount / RECENT_WINDOW_DAYS,
      previousRate:
        previousCount === 0 ? null : previousCount / RECENT_WINDOW_DAYS,
      countDelta: recentCount - previousCount,
      durationDelta: recentDuration - previousDuration,
    };
  }

  private compareRecentCheckInWindows(
    checkInHistory: readonly CheckInHistoryLike[],
  ): {
    delta: number;
    recentAverage: number | null;
    previousAverage: number | null;
  } {
    if (checkInHistory.length < RECENT_WINDOW_DAYS * 2) {
      return {
        delta: 0,
        recentAverage: null,
        previousAverage: null,
      };
    }

    const recentWindow = checkInHistory.slice(-RECENT_WINDOW_DAYS);
    const previousWindow = checkInHistory.slice(
      Math.max(0, checkInHistory.length - RECENT_WINDOW_DAYS * 2),
      checkInHistory.length - RECENT_WINDOW_DAYS,
    );
    const recentAverage = this.roundToTwoDecimals(
      recentWindow.reduce((total, item) => total + this.scoreCheckIn(item), 0) /
        recentWindow.length,
    );
    const previousAverage = this.roundToTwoDecimals(
      previousWindow.reduce(
        (total, item) => total + this.scoreCheckIn(item),
        0,
      ) / previousWindow.length,
    );

    return {
      delta: this.roundToWhole(recentAverage - previousAverage),
      recentAverage,
      previousAverage,
    };
  }

  private resolveAdherencePercentage(
    summary: ProgressSummaryLike | undefined,
    weeklyFrequency: number | undefined,
    periodDays: number,
  ): number | null {
    if (
      !summary ||
      !Number.isFinite(weeklyFrequency ?? Number.NaN) ||
      (weeklyFrequency ?? 0) <= 0
    ) {
      return null;
    }

    const expectedWorkouts = this.roundToTwoDecimals(
      (weeklyFrequency as number) * (periodDays / RECENT_WINDOW_DAYS),
    );

    if (expectedWorkouts <= 0) {
      return null;
    }

    return this.roundToTwoDecimals(
      Math.min(100, (summary.workoutsCompleted / expectedWorkouts) * 100),
    );
  }

  private resolveInactivityDays(input: {
    weeklySummary: ProgressSummaryLike;
    monthlySummary: ProgressSummaryLike;
    workoutHistory: readonly WorkoutHistoryLike[];
    healthContext: NonNullable<CoachExpertContext['healthContext']>;
  }): number | null {
    const latestDate =
      input.weeklySummary.lastWorkoutDate ??
      input.monthlySummary.lastWorkoutDate ??
      input.workoutHistory.at(-1)?.date ??
      null;

    if (!latestDate) {
      return input.healthContext.recentWorkoutLogs.length === 0 ? null : 0;
    }

    const latest = new Date(`${latestDate}T00:00:00.000Z`);
    const now = input.healthContext.generatedAt;
    const diffMs = now.getTime() - latest.getTime();
    if (!Number.isFinite(diffMs) || diffMs < 0) {
      return 0;
    }

    return Math.floor(diffMs / 86400000);
  }

  private resolveConsistencyLevel(
    percentage: number | null,
  ): ProgressConsistencyLevel {
    if (percentage === null) {
      return 'UNKNOWN';
    }

    if (percentage >= 80) {
      return 'HIGH';
    }

    if (percentage >= 55) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveHistoricalConsistency(input: {
    comparison: ProgressWindowComparison;
    checkInHistory: readonly CheckInHistoryLike[];
    inactivityDays: number | null;
    workoutExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
  }): ProgressConsistencyLevel {
    if (
      input.comparison.previousRate === null &&
      input.checkInHistory.length === 0 &&
      !input.workoutExpert &&
      !input.recoveryExpert &&
      !input.habitExpert
    ) {
      return 'UNKNOWN';
    }

    const scoreSignals: number[] = [];
    if (
      this.isRateFlat(
        input.comparison.recentRate,
        input.comparison.previousRate,
      )
    ) {
      scoreSignals.push(1);
    } else if (
      input.comparison.previousRate !== null &&
      input.comparison.recentRate !== null &&
      input.comparison.recentRate > input.comparison.previousRate
    ) {
      scoreSignals.push(2);
    } else if (
      input.comparison.previousRate !== null &&
      input.comparison.recentRate !== null &&
      input.comparison.recentRate < input.comparison.previousRate
    ) {
      scoreSignals.push(0);
    }

    const checkInComparison = this.compareRecentCheckInWindows(
      input.checkInHistory,
    );
    if (checkInComparison.delta >= 1) {
      scoreSignals.push(2);
    } else if (checkInComparison.delta <= -1) {
      scoreSignals.push(0);
    }

    if ((input.inactivityDays ?? 0) >= 14) {
      scoreSignals.push(0);
    } else if ((input.inactivityDays ?? 0) === 0) {
      scoreSignals.push(2);
    }

    if (this.readString(input.habitExpert?.trend) === 'IMPROVING') {
      scoreSignals.push(2);
    } else if (this.readString(input.habitExpert?.trend) === 'DECLINING') {
      scoreSignals.push(0);
    }

    if (this.readString(input.recoveryExpert?.recoveryStatus) === 'OPTIMAL') {
      scoreSignals.push(2);
    } else if (
      this.readString(input.recoveryExpert?.recoveryStatus) === 'CRITICAL'
    ) {
      scoreSignals.push(0);
    }

    if (scoreSignals.length === 0) {
      return 'UNKNOWN';
    }

    const average =
      scoreSignals.reduce((total, value) => total + value, 0) /
      scoreSignals.length;

    if (average >= 1.7) {
      return 'HIGH';
    }

    if (average >= 1.0) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveOverallConsistency(
    levels: readonly ProgressConsistencyLevel[],
  ): ProgressConsistencyLevel {
    const counts = levels.reduce(
      (acc, level) => {
        acc[level] += 1;
        return acc;
      },
      { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 } as Record<
        ProgressConsistencyLevel,
        number
      >,
    );

    if (counts.HIGH >= 2 && counts.LOW === 0) {
      return 'HIGH';
    }

    if (counts.LOW >= 2) {
      return 'LOW';
    }

    if (counts.HIGH >= 1 || counts.MEDIUM >= 2) {
      return 'MEDIUM';
    }

    if (counts.LOW === 1 && counts.HIGH === 0) {
      return 'LOW';
    }

    return 'UNKNOWN';
  }

  private resolveTrendFromScore(score: number): ProgressTrend {
    if (score >= 4) {
      return 'STRONGLY_IMPROVING';
    }

    if (score >= 2) {
      return 'IMPROVING';
    }

    if (score >= -2) {
      return 'STABLE';
    }

    if (score >= -4) {
      return 'DECLINING';
    }

    return 'REGRESSING';
  }

  private resolveMomentumFromScore(score: number): ProgressMomentum {
    if (score >= 5) {
      return 'HIGH';
    }

    if (score >= 2) {
      return 'POSITIVE';
    }

    if (score >= -1) {
      return 'NEUTRAL';
    }

    if (score >= -4) {
      return 'NEGATIVE';
    }

    return 'VERY_NEGATIVE';
  }

  private resolveRegressionFromScore(score: number): ProgressRegression {
    if (score >= 5) {
      return 'SEVERE';
    }

    if (score >= 4) {
      return 'MODERATE';
    }

    if (score >= 1) {
      return 'MINOR';
    }

    return 'NONE';
  }

  private resolveOverallProgress(input: {
    trend: ProgressTrendAssessment;
    momentum: ProgressMomentumAssessment;
    plateau: ProgressPlateauAssessment;
    regression: ProgressRegressionAssessment;
    consistency: ProgressConsistencyAssessment;
    inactivityDays: number | null;
  }): ProgressStatus {
    if (
      input.regression.regression === 'SEVERE' ||
      input.momentum.momentum === 'VERY_NEGATIVE' ||
      (input.inactivityDays ?? 0) >= 21
    ) {
      return 'REGRESSION';
    }

    if (
      input.plateau.plateau === 'LONG' ||
      (input.plateau.plateau === 'MODERATE' && input.trend.trend === 'STABLE')
    ) {
      return 'PLATEAU';
    }

    if (
      input.trend.trend === 'DECLINING' ||
      input.regression.regression === 'MODERATE'
    ) {
      return 'DECLINING';
    }

    if (
      input.trend.trend === 'STRONGLY_IMPROVING' &&
      input.consistency.weeklyConsistency === 'HIGH' &&
      input.momentum.momentum !== 'NEGATIVE' &&
      input.regression.regression === 'NONE'
    ) {
      return 'EXCELLENT';
    }

    if (
      input.trend.trend === 'STRONGLY_IMPROVING' &&
      input.consistency.overallConsistency === 'HIGH' &&
      input.regression.regression === 'NONE'
    ) {
      return 'EXCELLENT';
    }

    if (
      input.trend.trend === 'IMPROVING' &&
      input.momentum.momentum !== 'NEGATIVE'
    ) {
      return 'GOOD';
    }

    if (
      input.trend.trend === 'STABLE' &&
      input.consistency.overallConsistency !== 'LOW' &&
      input.regression.regression === 'NONE'
    ) {
      return 'STABLE';
    }

    if (input.regression.regression === 'MINOR') {
      return 'DECLINING';
    }

    return 'UNKNOWN';
  }

  private compareRecentWindows(
    workoutHistory: readonly WorkoutHistoryLike[],
  ): ProgressWindowComparison {
    return this.compareWindows(workoutHistory);
  }

  private isRateFlat(
    recentRate: number | null,
    previousRate: number | null,
  ): boolean {
    if (recentRate === null || previousRate === null) {
      return false;
    }

    const baseline = Math.max(previousRate, 0.001);
    return Math.abs(recentRate - previousRate) / baseline <= 0.1;
  }

  private isSameLoadPattern(
    workoutHistory: readonly WorkoutHistoryLike[],
  ): boolean {
    if (workoutHistory.length < RECENT_WINDOW_DAYS * 2) {
      return false;
    }

    const comparison = this.compareRecentWindows(workoutHistory);
    return (
      Math.abs(comparison.countDelta) <= 1 &&
      Math.abs(comparison.durationDelta) <= 20 &&
      this.isRateFlat(comparison.recentRate, comparison.previousRate)
    );
  }

  private isStagnantCrossDomain(
    workoutExpert: ExpertSnapshot | undefined,
    goalExpert: ExpertSnapshot | undefined,
    habitExpert: ExpertSnapshot | undefined,
  ): boolean {
    const signals = [
      this.readString(workoutExpert?.trainingStatus),
      this.readString(goalExpert?.progressTrend),
      this.readString(goalExpert?.goalStatus),
      this.readString(habitExpert?.trend),
      this.readString(habitExpert?.habitStatus),
    ];

    return signals.every(
      (signal) => signal === 'STABLE' || signal === 'UNKNOWN',
    );
  }

  private readExpertSnapshot(value: unknown): ExpertSnapshot | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as ExpertSnapshot;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private readTrendSignal(
    value: unknown,
    signals: {
      positive: readonly string[];
      negative: readonly string[];
    },
  ): number {
    const normalized = this.readString(value);

    if (!normalized) {
      return 0;
    }

    if (signals.positive.includes(normalized)) {
      return 1;
    }

    if (signals.negative.includes(normalized)) {
      return -1;
    }

    return 0;
  }

  private readMomentumSignal(
    value: unknown,
    signals: {
      positive: readonly string[];
      negative: readonly string[];
    },
  ): number {
    return this.readTrendSignal(value, signals);
  }

  private readRegressionSignal(
    value: unknown,
    signals: {
      positive: readonly string[];
      negative: readonly string[];
    },
  ): number {
    const normalized = this.readString(value);

    if (!normalized) {
      return 0;
    }

    if (signals.positive.includes(normalized)) {
      return 0;
    }

    if (signals.negative.includes(normalized)) {
      return 1;
    }

    return 0;
  }

  private resolveRecommendationPriority(
    code: ProgressRecommendationCode,
  ): number {
    switch (code) {
      case 'REDUCE_INACTIVITY':
      case 'REBUILD_BASELINE_ROUTINE':
        return RECOMMENDATION_PRIORITY.CRITICAL;
      case 'BREAK_CURRENT_PLATEAU':
      case 'IMPROVE_WEEKLY_CONSISTENCY':
      case 'IMPROVE_RECOVERY_CONSISTENCY':
      case 'STABILIZE_NUTRITION_AND_RECOVERY':
        return RECOMMENDATION_PRIORITY.HIGH;
      case 'REVIEW_TRAINING_PROGRESSION':
      case 'INCREASE_PROGRESSIVE_OVERLOAD':
      case 'FOCUS_ON_LONG_TERM_CONSISTENCY':
        return RECOMMENDATION_PRIORITY.MEDIUM;
      case 'MAINTAIN_CURRENT_MOMENTUM':
      case 'MAINTAIN_CURRENT_PROGRESSION':
      default:
        return RECOMMENDATION_PRIORITY.LOW;
    }
  }

  private createRecommendation(
    code: ProgressRecommendationCode,
    summary: string,
    reason: string,
    priority: ProgressPriority,
    metadata: Readonly<Record<string, unknown>>,
  ): ProgressRecommendation {
    return Object.freeze({
      code,
      summary,
      reason,
      priority,
      metadata: Object.freeze(metadata),
    });
  }

  private selectPrimaryRecommendation(
    recommendations: readonly ProgressRecommendation[],
  ): ProgressRecommendation {
    return [...recommendations].sort((left, right) => {
      const leftPriority = this.resolveRecommendationPriority(left.code);
      const rightPriority = this.resolveRecommendationPriority(right.code);

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOMMENDATION_ORDER.indexOf(right.code)
      );
    })[0] as ProgressRecommendation;
  }

  private escalateRisk(
    current: ProgressRiskLevel,
    next: ProgressRiskLevel,
  ): ProgressRiskLevel {
    const ranking: Record<ProgressRiskLevel, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    return ranking[next] > ranking[current] ? next : current;
  }

  private countNegativeDomains(
    workoutExpert: ExpertSnapshot | undefined,
    nutritionExpert: ExpertSnapshot | undefined,
    recoveryExpert: ExpertSnapshot | undefined,
    goalExpert: ExpertSnapshot | undefined,
    habitExpert: ExpertSnapshot | undefined,
  ): number {
    const values = [
      this.readString(workoutExpert?.trainingStatus),
      this.readString(nutritionExpert?.nutritionStatus),
      this.readString(recoveryExpert?.recoveryStatus),
      this.readString(recoveryExpert?.trend),
      this.readString(goalExpert?.goalStatus),
      this.readString(goalExpert?.progressTrend),
      this.readString(habitExpert?.habitStatus),
      this.readString(habitExpert?.trend),
    ];

    let count = 0;
    for (const value of values) {
      if (
        value === 'skipped' ||
        value === 'unavailable' ||
        value === 'MISSED' ||
        value === 'NO_PLAN' ||
        value === 'NO_PROFILE' ||
        value === 'POOR' ||
        value === 'CRITICAL' ||
        value === 'BEHIND' ||
        value === 'AT_RISK' ||
        value === 'BROKEN' ||
        value === 'DECLINING' ||
        value === 'REGRESSING'
      ) {
        count += 1;
      }
    }

    return count;
  }

  private scoreCheckIn(checkIn: CheckInHistoryLike): number {
    const energy = this.normalizeScaleValue(checkIn.energyLevel);
    const sleep = this.normalizeScaleValue(checkIn.sleepQuality);
    const soreness = this.normalizeScaleValue(checkIn.muscleSoreness);
    const motivation = this.normalizeScaleValue(checkIn.motivationLevel);
    return energy + sleep + motivation - soreness;
  }

  private normalizeScaleValue(value: number): number {
    return Number.isFinite(value) ? value : 0;
  }

  private calculateStreak(
    workoutHistory: readonly WorkoutHistoryLike[],
  ): number {
    if (workoutHistory.length === 0) {
      return 0;
    }

    let streak = 0;
    let expectedDate = new Date(
      `${workoutHistory.at(-1)?.date ?? ''}T00:00:00.000Z`,
    );

    for (let index = workoutHistory.length - 1; index >= 0; index -= 1) {
      const workout = workoutHistory[index];
      const workoutDate = new Date(`${workout.date}T00:00:00.000Z`);

      if (
        workoutDate.toISOString().slice(0, 10) !==
        expectedDate.toISOString().slice(0, 10)
      ) {
        break;
      }

      streak += 1;
      expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
    }

    return streak;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private roundToWhole(value: number): number {
    return Math.round(value);
  }

  private resolveDateValue(date: string, createdAt?: string | Date): number {
    const source =
      typeof createdAt === 'string'
        ? createdAt
        : createdAt instanceof Date
          ? createdAt.toISOString()
          : `${date}T00:00:00.000Z`;

    const value = new Date(source).getTime();
    return Number.isFinite(value) ? value : 0;
  }
}
