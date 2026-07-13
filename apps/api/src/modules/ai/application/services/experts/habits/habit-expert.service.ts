import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import { HabitConsistencyCalculatorService } from '../../../../../habits/application/services/habit-consistency-calculator.service';
import type {
  HabitAnalysis,
  HabitConfidence,
  HabitConsistencyAssessment,
  HabitExpertContribution,
  HabitPatternAssessment,
  HabitPatternCode,
  HabitPriority,
  HabitRecommendation,
  HabitRecommendationCode,
  HabitRiskAssessment,
  HabitStatus,
  HabitTrend,
} from './habit-expert.types';

const COACH_EXPERT_VERSION = '1.0.0';
const HABIT_EXPERT_ID = 'HabitExpert';
const HISTORY_WINDOW_DAYS = 30;
const RECENT_WINDOW_DAYS = 7;

const RECOMMENDATION_PRIORITY: Record<HabitPriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const RECOMMENDATION_ORDER: readonly HabitRecommendationCode[] = Object.freeze([
  'REDUCE_INACTIVITY_PERIODS',
  'REBUILD_WORKOUT_ROUTINE',
  'RE_ESTABLISH_NUTRITION_CONSISTENCY',
  'RECOVER_CONSISTENCY_BEFORE_INCREASING_WORKLOAD',
  'REDUCE_SKIPPED_DAYS',
  'IMPROVE_DAILY_CONSISTENCY',
  'FOCUS_ON_ONE_HABIT_AT_A_TIME',
  'RESTORE_WEEKLY_RHYTHM',
  'MAINTAIN_CURRENT_STREAK',
  'MAINTAIN_CURRENT_ROUTINE',
]);

type HabitSnapshotLike = {
  date: string;
  consistencyScore: number;
  streakDays: number;
  adherenceScore: number;
  trend: { value?: string } | string;
  sourceContext?: Readonly<Record<string, unknown>>;
  generatedAt?: Date | string;
};

type ExpertSnapshotLike = Readonly<Record<string, unknown>>;

type HabitSummaryLike = Readonly<{
  currentStreak?: number;
  longestStreak?: number;
  trend?: string;
}>;

type HabitRiskSignalLike = Readonly<{
  type: string;
}>;

export class HabitExpert extends BaseCoachExpert {
  private static readonly habitConsistencyCalculator =
    new HabitConsistencyCalculatorService();

  constructor() {
    super({
      id: HABIT_EXPERT_ID,
      displayName: 'Habit Expert',
      version: COACH_EXPERT_VERSION,
      category: 'HABITS',
      supportedIntents: [
        'HABITS',
        'PROGRESS',
        'TRAINING',
        'NUTRITION',
        'RECOVERY',
        'GOALS',
        'PERSONALIZATION',
        'DASHBOARD',
        'MOTIVATION',
        'PLANNING',
      ],
      supportedDomains: [
        'habits',
        'progress',
        'training',
        'nutrition',
        'recovery',
        'goals',
        'personalization',
      ],
      estimatedCost: 2,
      estimatedLatencyMs: 14,
      priority: 80,
      capabilities: ['HABIT_SPECIALIST', 'COACH_ROUTING', 'CONTEXT_SYNTHESIS'],
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
        habitExpert: Object.freeze({
          expertId: this.metadata.id,
          habitStatus: analysis.habitStatus,
          consistency: analysis.consistency.dailyConsistency,
          trend: analysis.trend.trend,
          riskLevel: analysis.risks[0]?.level ?? 'LOW',
          confidence: analysis.confidence,
          recommendationCodes: analysis.recommendations.map(
            (recommendation) => recommendation.code,
          ),
          patternCodes: analysis.patterns.patterns,
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
        habitStatus: contribution.habitStatus,
        consistency: contribution.consistency,
        patterns: contribution.patterns,
        trend: contribution.trend,
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

  private buildAnalysis(context: CoachExpertContext): HabitAnalysis {
    const healthContext = context.healthContext;

    if (context.policyEvaluation?.decision.blocked || !healthContext) {
      return this.buildUnavailableAnalysis({
        healthContextAvailable: Boolean(healthContext),
        habitAvailable: Boolean(context.habit),
        historyCount: context.habitHistory?.length ?? 0,
      });
    }

    const habit = context.habit ?? null;
    const habitHistory = this.normalizeHistory({
      current: habit?.current as HabitSnapshotLike | undefined,
      history: context.habitHistory ?? [],
    });
    const summary = (habit?.summary ?? null) as HabitSummaryLike | null;
    const riskSignals = (habit?.riskSignals ??
      []) as readonly HabitRiskSignalLike[];
    const currentSnapshot = (habit?.current ??
      habitHistory[0] ??
      null) as HabitSnapshotLike | null;
    const trend = this.buildTrendAssessment({
      currentSnapshot,
      habitHistory,
      summary,
    });
    const weeklyAdherence = this.calculateWindowAverage(
      habitHistory,
      RECENT_WINDOW_DAYS,
      'adherenceScore',
    );
    const monthlyAdherence = this.calculateWindowAverage(
      habitHistory,
      HISTORY_WINDOW_DAYS,
      'adherenceScore',
    );
    const currentStreak =
      this.resolveNumber(summary?.currentStreak) ??
      this.resolveNumber(currentSnapshot?.streakDays) ??
      this.resolveNumber(healthContext.currentStreak) ??
      0;
    const longestStreak =
      this.resolveNumber(summary?.longestStreak) ??
      this.resolveLongestStreak(habitHistory, currentStreak);
    const inactivityDays = this.resolveInactivityDays({
      currentSnapshot,
      habitHistory,
      referenceDate: healthContext.generatedAt,
    });
    const consistency = this.buildConsistencyAssessment({
      currentSnapshot,
      weeklyAdherence,
      monthlyAdherence,
      currentStreak,
      longestStreak,
      summary,
      trend,
    });
    const crossDomain = this.buildCrossDomainInterpretation(context);
    const patterns = this.buildPatternAssessment({
      habitHistory,
      currentSnapshot,
      weeklyAdherence,
      monthlyAdherence,
      trend,
      inactivityDays,
      crossDomain,
      riskSignals,
    });
    const recommendations = this.buildRecommendations({
      habitStatus: this.resolveHabitStatus({
        currentSnapshot,
        consistency,
        patterns,
        trend,
        inactivityDays,
        riskSignals,
        crossDomain,
      }),
      consistency,
      patterns,
      trend,
      inactivityDays,
      crossDomain,
    });
    const habitStatus = this.resolveHabitStatus({
      currentSnapshot,
      consistency,
      patterns,
      trend,
      inactivityDays,
      riskSignals,
      crossDomain,
    });
    const risks = [
      this.buildRiskAssessment({
        habitStatus,
        consistency,
        patterns,
        trend,
        inactivityDays,
        riskSignals,
        crossDomain,
        habitHistory,
      }),
    ];
    const confidence = this.buildConfidence({
      habit,
      habitHistory,
      summary,
      riskSignals,
      crossDomain,
    });
    const activeHabitCount = currentSnapshot ? 1 : 0;
    const completedHabitCount = this.countCompletedHabits(habitHistory);
    const missedHabitCount = this.countMissedHabits(habitHistory);
    const skippedHabitCount = this.countSkippedHabits({
      riskSignals,
      crossDomain,
      habitHistory,
    });
    const sourceCoverage = {
      currentHabitPresent: Boolean(currentSnapshot),
      habitHistoryPresent: habitHistory.length > 0,
      habitSummaryPresent: Boolean(summary),
      expertSignalsPresent:
        Boolean(context.runtimeMetadata.workoutExpert) ||
        Boolean(context.runtimeMetadata.nutritionExpert) ||
        Boolean(context.runtimeMetadata.recoveryExpert) ||
        Boolean(context.runtimeMetadata.goalExpert),
    } as const;
    const summaryText = this.buildSummary({
      habitStatus,
      consistency,
      patterns,
      trend,
      risk: risks[0],
      recommendation: recommendations[0],
      confidence,
    });

    return Object.freeze({
      habitStatus,
      consistency,
      patterns,
      trend,
      recommendations: Object.freeze(recommendations),
      risks: Object.freeze(risks),
      confidence,
      summary: summaryText,
      activeHabitCount,
      completedHabitCount,
      missedHabitCount,
      skippedHabitCount,
      currentStreak,
      longestStreak,
      weeklyAdherence,
      monthlyAdherence,
      inactivityDays,
      recentHistoryCount: habitHistory.length,
      sourceCoverage: Object.freeze(sourceCoverage),
      crossDomain,
    });
  }

  private buildUnavailableAnalysis(input: {
    healthContextAvailable: boolean;
    habitAvailable: boolean;
    historyCount: number;
  }): HabitAnalysis {
    const patterns = Object.freeze<readonly HabitPatternCode[]>([]);
    const consistency = Object.freeze<HabitConsistencyAssessment>({
      dailyConsistency: 'UNKNOWN',
      weeklyConsistency: 'UNKNOWN',
      monthlyConsistency: 'UNKNOWN',
      streakQuality: 'UNKNOWN',
      summary: 'Habit consistency is unavailable.',
      metadata: Object.freeze({
        reason: 'unavailable',
      }),
    });
    const trend = Object.freeze({
      trend: 'UNKNOWN' as const,
      summary: 'Habit trend is unavailable.',
      factors: Object.freeze([]),
      metadata: Object.freeze({
        reason: 'unavailable',
      }),
    });
    const risk = Object.freeze<HabitRiskAssessment>({
      level: 'CRITICAL',
      summary: 'Habit analysis is unavailable.',
      factors: Object.freeze([
        input.healthContextAvailable
          ? 'habit_context_missing'
          : 'health_context_missing',
      ]),
      metadata: Object.freeze({
        reason: 'unavailable',
      }),
    });
    const recommendation = Object.freeze<HabitRecommendation>({
      code: 'FOCUS_ON_ONE_HABIT_AT_A_TIME',
      summary: 'Focus on one habit at a time.',
      reason:
        'Insufficient trusted habit data is available for a more specific recommendation.',
      priority: 'HIGH',
      metadata: Object.freeze({
        reason: 'unavailable',
      }),
    });

    return Object.freeze({
      habitStatus: 'UNKNOWN',
      consistency,
      patterns: Object.freeze({
        patterns,
        summary: 'No deterministic habit pattern could be confirmed.',
        metadata: Object.freeze({
          reason: 'unavailable',
        }),
      }),
      trend,
      recommendations: Object.freeze([recommendation]),
      risks: Object.freeze([risk]),
      confidence: input.habitAvailable ? 'LOW' : 'LOW',
      summary:
        'status=UNKNOWN; consistency=UNKNOWN; trend=UNKNOWN; risk=CRITICAL; confidence=LOW; recommendation=FOCUS_ON_ONE_HABIT_AT_A_TIME',
      activeHabitCount: 0,
      completedHabitCount: 0,
      missedHabitCount: 0,
      skippedHabitCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      weeklyAdherence: null,
      monthlyAdherence: null,
      inactivityDays: null,
      recentHistoryCount: input.historyCount,
      sourceCoverage: Object.freeze({
        currentHabitPresent: false,
        habitHistoryPresent: input.historyCount > 0,
        habitSummaryPresent: input.habitAvailable,
        expertSignalsPresent: false,
      }),
      crossDomain: Object.freeze({
        workoutConsistency: 'UNKNOWN',
        nutritionConsistency: 'UNKNOWN',
        recoveryConsistency: 'UNKNOWN',
        goalConsistency: 'UNKNOWN',
        summary: 'Cross-domain habit interpretation is unavailable.',
        metadata: Object.freeze({
          reason: 'unavailable',
        }),
      }),
    });
  }

  private buildContribution(
    analysis: HabitAnalysis,
    context: CoachExpertContext,
  ): HabitExpertContribution {
    const primaryRecommendation = this.selectPrimaryRecommendation(
      analysis.recommendations,
    );

    return Object.freeze({
      expertId: this.metadata.id,
      summary: analysis.summary,
      analysis,
      habitStatus: analysis.habitStatus,
      consistency: analysis.consistency,
      patterns: analysis.patterns,
      trend: analysis.trend,
      recommendations: analysis.recommendations,
      risks: analysis.risks,
      confidence: analysis.confidence,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        selectionReason: context.selectionReason,
        habitStatus: analysis.habitStatus,
        consistencyLevel: analysis.consistency.dailyConsistency,
        trend: analysis.trend.trend,
        riskLevel: analysis.risks[0]?.level ?? 'LOW',
        confidence: analysis.confidence,
        recommendationCodes: analysis.recommendations.map(
          (recommendation) => recommendation.code,
        ),
        patternCodes: analysis.patterns.patterns,
        priority: analysis.risks[0]?.level ?? 'LOW',
        primaryRecommendation: primaryRecommendation.code,
      }),
    });
  }

  private buildContributions(
    contribution: HabitExpertContribution,
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
          habitContribution: contribution,
          kind: 'analysis',
        }),
      }),
      Object.freeze({
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: primaryRecommendation.summary,
        metadata: Object.freeze({
          habitContribution: contribution,
          kind: 'contribution',
          recommendationCode: primaryRecommendation.code,
        }),
      }),
    ]);
  }

  private buildConsistencyAssessment(input: {
    currentSnapshot: HabitSnapshotLike | null;
    weeklyAdherence: number | null;
    monthlyAdherence: number | null;
    currentStreak: number;
    longestStreak: number;
    summary: HabitSummaryLike | null;
    trend: HabitTrendAssessment;
  }): HabitConsistencyAssessment {
    const daily = this.resolveConsistencyLevel(
      input.currentSnapshot?.consistencyScore ?? null,
    );
    const weekly = this.resolveConsistencyLevel(input.weeklyAdherence);
    const monthly = this.resolveConsistencyLevel(input.monthlyAdherence);
    const streakQuality = this.resolveStreakQuality({
      currentStreak: input.currentStreak,
      longestStreak: input.longestStreak,
    });

    return Object.freeze({
      dailyConsistency: daily,
      weeklyConsistency: weekly,
      monthlyConsistency: monthly,
      streakQuality,
      summary: [
        `daily=${daily}`,
        `weekly=${weekly}`,
        `monthly=${monthly}`,
        `streak=${streakQuality}`,
        `trend=${input.trend.trend}`,
      ].join('; '),
      metadata: Object.freeze({
        currentStreak: input.currentStreak,
        longestStreak: input.longestStreak,
        summaryPresent: Boolean(input.summary),
      }),
    });
  }

  private buildPatternAssessment(input: {
    habitHistory: readonly HabitSnapshotLike[];
    currentSnapshot: HabitSnapshotLike | null;
    weeklyAdherence: number | null;
    monthlyAdherence: number | null;
    trend: HabitTrendAssessment;
    inactivityDays: number | null;
    crossDomain: HabitCrossDomainInterpretation;
    riskSignals: readonly HabitRiskSignalLike[];
  }): HabitPatternAssessment {
    const patterns = new Set<HabitPatternCode>();

    if (input.trend.trend === 'IMPROVING') {
      patterns.add('IMPROVING_CONSISTENCY');
    }

    if (input.trend.trend === 'DECLINING') {
      patterns.add('DECLINING_CONSISTENCY');
    }

    if (this.isWeekendOnlyAdherence(input.habitHistory)) {
      patterns.add('WEEKEND_ONLY_ADHERENCE');
    }

    if (
      this.hasRepeatedMissedDays(input.habitHistory) ||
      this.hasRepeatedMissedSignal(input.riskSignals)
    ) {
      patterns.add('REPEATED_MISSED_DAYS');
    }

    if (
      this.isSkippedWorkoutPattern(input.crossDomain) ||
      this.hasSkippedWorkoutSignal(input.riskSignals)
    ) {
      patterns.add('REPEATED_SKIPPED_WORKOUTS');
    }

    if (this.isRecoveryIrregular(input.crossDomain)) {
      patterns.add('IRREGULAR_RECOVERY');
    }

    if (this.isNutritionIrregular(input.crossDomain)) {
      patterns.add('IRREGULAR_NUTRITION');
    }

    if ((input.inactivityDays ?? 0) >= 7) {
      patterns.add('INACTIVITY_PERIODS');
    }

    if (this.hasBrokenStreak(input.currentSnapshot, input.habitHistory)) {
      patterns.add('BROKEN_STREAKS');
    }

    const orderedPatterns = this.orderPatterns([...patterns]);

    return Object.freeze({
      patterns: Object.freeze(orderedPatterns),
      summary: orderedPatterns.length
        ? orderedPatterns.join(', ')
        : 'No deterministic habit pattern confirmed.',
      metadata: Object.freeze({
        weeklyAdherence: input.weeklyAdherence,
        monthlyAdherence: input.monthlyAdherence,
        patternCount: orderedPatterns.length,
      }),
    });
  }

  private buildTrendAssessment(input: {
    currentSnapshot: HabitSnapshotLike | null;
    habitHistory: readonly HabitSnapshotLike[];
    summary: HabitSummaryLike | null;
  }): HabitTrendAssessment {
    const history = [...input.habitHistory];

    if (history.length >= RECENT_WINDOW_DAYS * 2) {
      const recent = this.calculateWindowAverage(
        history,
        RECENT_WINDOW_DAYS,
        'consistencyScore',
      );
      const previous = this.calculateWindowAverage(
        history.slice(RECENT_WINDOW_DAYS),
        RECENT_WINDOW_DAYS,
        'consistencyScore',
      );
      if (recent === null || previous === null) {
        return Object.freeze({
          trend: 'UNKNOWN',
          summary: 'Habit trend is unknown.',
          factors: Object.freeze([]),
          metadata: Object.freeze({
            source: 'history_window',
            reason: 'insufficient_window_data',
          }),
        });
      }
      const delta = recent - previous;
      const calculatedTrend =
        HabitExpert.habitConsistencyCalculator.calculateTrend(recent, previous);

      if (calculatedTrend === 'improving' || delta >= 5) {
        return Object.freeze({
          trend: 'IMPROVING',
          summary: 'Recent habit consistency is improving.',
          factors: Object.freeze([
            `recent_average=${this.roundToWhole(recent)}`,
            `previous_average=${this.roundToWhole(previous)}`,
          ]),
          metadata: Object.freeze({
            source: 'history_window',
            delta: this.roundToWhole(delta),
          }),
        });
      }

      if (calculatedTrend === 'declining' || delta <= -5) {
        return Object.freeze({
          trend: 'DECLINING',
          summary: 'Recent habit consistency is declining.',
          factors: Object.freeze([
            `recent_average=${this.roundToWhole(recent)}`,
            `previous_average=${this.roundToWhole(previous)}`,
          ]),
          metadata: Object.freeze({
            source: 'history_window',
            delta: this.roundToWhole(delta),
          }),
        });
      }

      return Object.freeze({
        trend: 'STABLE',
        summary: 'Recent habit consistency is stable.',
        factors: Object.freeze([
          `recent_average=${this.roundToWhole(recent)}`,
          `previous_average=${this.roundToWhole(previous)}`,
        ]),
        metadata: Object.freeze({
          source: 'history_window',
          delta: this.roundToWhole(delta),
        }),
      });
    }

    const summaryTrend = this.resolveTrendFromSummary(input.summary?.trend);
    if (summaryTrend !== 'UNKNOWN') {
      return Object.freeze({
        trend: summaryTrend,
        summary: `Habit trend is ${summaryTrend.toLowerCase()}.`,
        factors: Object.freeze([`summary_trend=${summaryTrend.toLowerCase()}`]),
        metadata: Object.freeze({
          source: 'summary',
        }),
      });
    }

    if (input.currentSnapshot) {
      return Object.freeze({
        trend: 'STABLE',
        summary: 'Habit trend is stable.',
        factors: Object.freeze([
          `current_consistency=${this.roundToWhole(
            input.currentSnapshot.consistencyScore,
          )}`,
        ]),
        metadata: Object.freeze({
          source: 'current_snapshot',
        }),
      });
    }

    return Object.freeze({
      trend: 'UNKNOWN',
      summary: 'Habit trend is unknown.',
      factors: Object.freeze([]),
      metadata: Object.freeze({
        source: 'unavailable',
      }),
    });
  }

  private buildRiskAssessment(input: {
    habitStatus: HabitStatus;
    consistency: HabitConsistencyAssessment;
    patterns: HabitPatternAssessment;
    trend: HabitTrendAssessment;
    inactivityDays: number | null;
    riskSignals: readonly HabitRiskSignalLike[];
    crossDomain: HabitCrossDomainInterpretation;
    habitHistory: readonly HabitSnapshotLike[];
  }): HabitRiskAssessment {
    const factors: string[] = [];
    let level: HabitRiskLevel = 'LOW';

    if (input.habitStatus === 'BROKEN') {
      level = 'CRITICAL';
      factors.push('broken_habit_routine');
    }

    if ((input.inactivityDays ?? 0) >= 14) {
      level = 'CRITICAL';
      factors.push(`inactivity_days=${input.inactivityDays}`);
    }

    if (input.trend.trend === 'DECLINING') {
      level = this.escalateRisk(level, 'HIGH');
      factors.push('declining_trend');
    }

    if (
      input.consistency.weeklyConsistency === 'LOW' ||
      input.consistency.monthlyConsistency === 'LOW'
    ) {
      level = this.escalateRisk(level, 'HIGH');
      factors.push('low_weekly_or_monthly_consistency');
    }

    if (
      input.patterns.patterns.includes('REPEATED_MISSED_DAYS') ||
      input.patterns.patterns.includes('REPEATED_SKIPPED_WORKOUTS')
    ) {
      level = this.escalateRisk(level, 'HIGH');
      factors.push('repeated_behavioral_misses');
    }

    if (
      input.patterns.patterns.includes('WEEKEND_ONLY_ADHERENCE') ||
      input.patterns.patterns.includes('IRREGULAR_RECOVERY') ||
      input.patterns.patterns.includes('IRREGULAR_NUTRITION')
    ) {
      level = this.escalateRisk(level, 'MEDIUM');
      factors.push('irregular_cross_domain_pattern');
    }

    if (
      input.crossDomain.goalConsistency === 'LOW' &&
      input.consistency.monthlyConsistency !== 'HIGH'
    ) {
      level = this.escalateRisk(level, 'MEDIUM');
      factors.push('goal_consistency_is_low');
    }

    if (input.habitHistory.length === 0 && level === 'LOW') {
      level = 'MEDIUM';
      factors.push('limited_history');
    }

    if (
      input.habitStatus === 'EXCELLENT' &&
      input.trend.trend !== 'DECLINING' &&
      level === 'LOW'
    ) {
      factors.push('stable_routine');
    }

    return Object.freeze({
      level,
      summary: this.buildRiskSummary(level, factors),
      factors: Object.freeze(factors.length ? factors : ['no_material_risk']),
      metadata: Object.freeze({
        habitStatus: input.habitStatus,
        trend: input.trend.trend,
        inactivityDays: input.inactivityDays,
        riskSignalCount: input.riskSignals.length,
        patternCount: input.patterns.patterns.length,
      }),
    });
  }

  private buildCrossDomainInterpretation(
    context: CoachExpertContext,
  ): HabitCrossDomainInterpretation {
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

    const workoutConsistency = this.resolveCrossDomainConsistency({
      directLevel: this.readString(workoutExpert?.trainingStatus),
      consistencyLevel: this.readString(workoutExpert?.riskLevel),
      summaryLevel: this.readString(workoutExpert?.goalAlignment),
      highSignals: ['completed', 'scheduled'],
      lowSignals: ['skipped', 'unavailable', 'poor', 'critical'],
    });
    const nutritionConsistency = this.resolveCrossDomainConsistency({
      directLevel: this.readString(nutritionExpert?.nutritionStatus),
      consistencyLevel: this.readString(nutritionExpert?.nutritionStatus),
      summaryLevel: this.readString(nutritionExpert?.nutritionStatus),
      highSignals: ['ON_TRACK', 'HIGH', 'good'],
      lowSignals: ['MISSED', 'NO_PLAN', 'NO_PROFILE', 'poor'],
    });
    const recoveryConsistency = this.resolveCrossDomainConsistency({
      directLevel: this.readString(recoveryExpert?.recoveryStatus),
      consistencyLevel: this.readString(recoveryExpert?.trend),
      summaryLevel: this.readString(recoveryExpert?.recoveryStatus),
      highSignals: ['OPTIMAL', 'GOOD', 'IMPROVING', 'STABLE'],
      lowSignals: ['POOR', 'CRITICAL', 'DECLINING'],
    });
    const goalConsistency = this.resolveCrossDomainConsistency({
      directLevel: this.readString(goalExpert?.goalStatus),
      consistencyLevel: this.readString(goalExpert?.consistency),
      summaryLevel: this.readString(goalExpert?.forecastStatus),
      highSignals: ['COMPLETED', 'ON_TRACK', 'LIKELY', 'HIGH'],
      lowSignals: ['AT_RISK', 'BEHIND', 'UNCERTAIN', 'UNLIKELY', 'LOW'],
    });

    return Object.freeze({
      workoutConsistency,
      nutritionConsistency,
      recoveryConsistency,
      goalConsistency,
      summary: [
        `workout=${workoutConsistency}`,
        `nutrition=${nutritionConsistency}`,
        `recovery=${recoveryConsistency}`,
        `goal=${goalConsistency}`,
      ].join('; '),
      metadata: Object.freeze({
        workoutExpertPresent: Boolean(workoutExpert),
        nutritionExpertPresent: Boolean(nutritionExpert),
        recoveryExpertPresent: Boolean(recoveryExpert),
        goalExpertPresent: Boolean(goalExpert),
      }),
    });
  }

  private buildRecommendations(input: {
    habitStatus: HabitStatus;
    consistency: HabitConsistencyAssessment;
    patterns: HabitPatternAssessment;
    trend: HabitTrendAssessment;
    inactivityDays: number | null;
    crossDomain: HabitCrossDomainInterpretation;
  }): readonly HabitRecommendation[] {
    const recommendations = new Map<
      HabitRecommendationCode,
      HabitRecommendation
    >();

    const addRecommendation = (recommendation: HabitRecommendation): void => {
      if (!recommendations.has(recommendation.code)) {
        recommendations.set(recommendation.code, recommendation);
      }
    };

    if (input.habitStatus === 'BROKEN' || (input.inactivityDays ?? 0) >= 14) {
      addRecommendation(
        this.createRecommendation(
          'REDUCE_INACTIVITY_PERIODS',
          'Reduce inactivity periods.',
          'Long inactivity is the strongest driver of broken habit consistency.',
          'CRITICAL',
          {
            inactivityDays: input.inactivityDays,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'REBUILD_WORKOUT_ROUTINE',
          'Rebuild workout routine.',
          'Workout adherence is too unstable to preserve the current routine.',
          'HIGH',
          {
            workoutConsistency: input.crossDomain.workoutConsistency,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'RE_ESTABLISH_NUTRITION_CONSISTENCY',
          'Re-establish nutrition consistency.',
          'Nutrition consistency is too irregular to support long-term habit recovery.',
          'HIGH',
          {
            nutritionConsistency: input.crossDomain.nutritionConsistency,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'RECOVER_CONSISTENCY_BEFORE_INCREASING_WORKLOAD',
          'Recover consistency before increasing workload.',
          'The current pattern does not support load progression.',
          'HIGH',
          {
            trend: input.trend.trend,
          },
        ),
      );
    }

    if (
      input.consistency.dailyConsistency === 'LOW' ||
      input.consistency.weeklyConsistency === 'LOW' ||
      input.consistency.monthlyConsistency === 'LOW'
    ) {
      addRecommendation(
        this.createRecommendation(
          'IMPROVE_DAILY_CONSISTENCY',
          'Improve daily consistency.',
          'The current habit signal is too inconsistent across the day-to-day window.',
          'HIGH',
          {
            dailyConsistency: input.consistency.dailyConsistency,
          },
        ),
      );
      addRecommendation(
        this.createRecommendation(
          'REDUCE_SKIPPED_DAYS',
          'Reduce skipped days.',
          'Skipped days are pulling the weekly average down.',
          'MEDIUM',
          {
            weeklyConsistency: input.consistency.weeklyConsistency,
          },
        ),
      );
    }

    if (input.patterns.patterns.includes('WEEKEND_ONLY_ADHERENCE')) {
      addRecommendation(
        this.createRecommendation(
          'RESTORE_WEEKLY_RHYTHM',
          'Restore weekly rhythm.',
          'Weekday adherence is weaker than weekend adherence.',
          'MEDIUM',
          {
            pattern: 'WEEKEND_ONLY_ADHERENCE',
          },
        ),
      );
    }

    if (
      input.patterns.patterns.includes('REPEATED_MISSED_DAYS') ||
      input.patterns.patterns.includes('REPEATED_SKIPPED_WORKOUTS')
    ) {
      addRecommendation(
        this.createRecommendation(
          'FOCUS_ON_ONE_HABIT_AT_A_TIME',
          'Focus on one habit at a time.',
          'Repeated misses indicate the plan is too broad for current consistency.',
          'HIGH',
          {
            patterns: input.patterns.patterns,
          },
        ),
      );
    }

    if (input.trend.trend === 'IMPROVING') {
      addRecommendation(
        this.createRecommendation(
          'MAINTAIN_CURRENT_STREAK',
          'Maintain current streak.',
          'Recent habit behavior is improving and the current pattern should be preserved.',
          'LOW',
          {
            trend: input.trend.trend,
          },
        ),
      );
    }

    if (input.habitStatus === 'GOOD' || input.habitStatus === 'EXCELLENT') {
      addRecommendation(
        this.createRecommendation(
          'MAINTAIN_CURRENT_ROUTINE',
          'Maintain current routine.',
          'The current habit structure is supporting stable long-term progress.',
          'LOW',
          {
            habitStatus: input.habitStatus,
          },
        ),
      );
    }

    if (
      input.habitStatus === 'INCONSISTENT' &&
      input.crossDomain.goalConsistency !== 'HIGH'
    ) {
      addRecommendation(
        this.createRecommendation(
          'FOCUS_ON_ONE_HABIT_AT_A_TIME',
          'Focus on one habit at a time.',
          'Habit load should be simplified until consistency stabilizes.',
          'HIGH',
          {
            goalConsistency: input.crossDomain.goalConsistency,
          },
        ),
      );
    }

    if (!recommendations.size) {
      addRecommendation(
        this.createRecommendation(
          'MAINTAIN_CURRENT_ROUTINE',
          'Maintain current routine.',
          'No stronger adjustment is required from the available backend data.',
          'LOW',
          {},
        ),
      );
    }

    return this.orderRecommendations([...recommendations.values()]);
  }

  private resolveHabitStatus(input: {
    currentSnapshot: HabitSnapshotLike | null;
    consistency: HabitConsistencyAssessment;
    patterns: HabitPatternAssessment;
    trend: HabitTrendAssessment;
    inactivityDays: number | null;
    riskSignals: readonly HabitRiskSignalLike[];
    crossDomain: HabitCrossDomainInterpretation;
  }): HabitStatus {
    if (
      !input.currentSnapshot &&
      input.riskSignals.length === 0 &&
      input.crossDomain.workoutConsistency === 'UNKNOWN' &&
      input.crossDomain.nutritionConsistency === 'UNKNOWN' &&
      input.crossDomain.recoveryConsistency === 'UNKNOWN' &&
      input.crossDomain.goalConsistency === 'UNKNOWN'
    ) {
      return 'UNKNOWN';
    }

    if (
      (input.inactivityDays ?? 0) >= 14 ||
      input.patterns.patterns.includes('BROKEN_STREAKS')
    ) {
      return 'BROKEN';
    }

    if (
      input.consistency.dailyConsistency === 'HIGH' &&
      input.consistency.weeklyConsistency === 'HIGH' &&
      input.consistency.monthlyConsistency === 'HIGH' &&
      input.consistency.streakQuality === 'HIGH' &&
      input.trend.trend !== 'DECLINING' &&
      input.patterns.patterns.every(
        (pattern) => pattern === 'IMPROVING_CONSISTENCY',
      )
    ) {
      return 'EXCELLENT';
    }

    if (
      input.consistency.dailyConsistency === 'HIGH' ||
      input.consistency.weeklyConsistency === 'HIGH'
    ) {
      if (
        input.trend.trend !== 'DECLINING' &&
        !input.patterns.patterns.includes('REPEATED_MISSED_DAYS') &&
        !input.patterns.patterns.includes('INACTIVITY_PERIODS')
      ) {
        return 'GOOD';
      }
    }

    if (
      input.consistency.dailyConsistency === 'LOW' &&
      input.consistency.weeklyConsistency === 'LOW' &&
      input.consistency.monthlyConsistency === 'LOW'
    ) {
      return input.trend.trend === 'DECLINING' ? 'POOR' : 'INCONSISTENT';
    }

    if (
      input.trend.trend === 'DECLINING' ||
      input.patterns.patterns.includes('REPEATED_MISSED_DAYS') ||
      input.patterns.patterns.includes('REPEATED_SKIPPED_WORKOUTS')
    ) {
      return 'POOR';
    }

    return 'INCONSISTENT';
  }

  private buildConfidence(input: {
    habit: NonNullable<CoachExpertContext['habit']> | null;
    habitHistory: readonly HabitSnapshotLike[];
    summary: HabitSummaryLike | null;
    riskSignals: readonly HabitRiskSignalLike[];
    crossDomain: HabitCrossDomainInterpretation;
  }): HabitConfidence {
    const evidenceCount =
      (input.habit ? 1 : 0) +
      input.habitHistory.length +
      (input.summary ? 1 : 0) +
      input.riskSignals.length +
      [
        input.crossDomain.workoutConsistency,
        input.crossDomain.nutritionConsistency,
        input.crossDomain.recoveryConsistency,
        input.crossDomain.goalConsistency,
      ].filter((value) => value !== 'UNKNOWN').length;

    if (evidenceCount >= 8) {
      return 'HIGH';
    }

    if (evidenceCount >= 4) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private selectPrimaryRecommendation(
    recommendations: readonly HabitRecommendation[],
  ): HabitRecommendation {
    return [...recommendations].sort((left, right) => {
      const priorityDelta =
        RECOMMENDATION_PRIORITY[right.priority] -
        RECOMMENDATION_PRIORITY[left.priority];

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return (
        RECOMMENDATION_ORDER.indexOf(left.code) -
        RECOMMENDATION_ORDER.indexOf(right.code)
      );
    })[0];
  }

  private orderRecommendations(
    recommendations: readonly HabitRecommendation[],
  ): readonly HabitRecommendation[] {
    return Object.freeze(
      [...recommendations].sort((left, right) => {
        const priorityDelta =
          RECOMMENDATION_PRIORITY[right.priority] -
          RECOMMENDATION_PRIORITY[left.priority];

        if (priorityDelta !== 0) {
          return priorityDelta;
        }

        return (
          RECOMMENDATION_ORDER.indexOf(left.code) -
          RECOMMENDATION_ORDER.indexOf(right.code)
        );
      }),
    );
  }

  private createRecommendation(
    code: HabitRecommendationCode,
    summary: string,
    reason: string,
    priority: HabitPriority,
    metadata: Readonly<Record<string, unknown>>,
  ): HabitRecommendation {
    return Object.freeze({
      code,
      summary,
      reason,
      priority,
      metadata: Object.freeze({
        ...metadata,
        code,
      }),
    });
  }

  private buildSummary(input: {
    habitStatus: HabitStatus;
    consistency: HabitConsistencyAssessment;
    patterns: HabitPatternAssessment;
    trend: HabitTrendAssessment;
    risk: HabitRiskAssessment;
    recommendation: HabitRecommendation;
    confidence: HabitConfidence;
  }): string {
    return [
      `status=${input.habitStatus}`,
      `consistency=${input.consistency.dailyConsistency}`,
      `weekly=${input.consistency.weeklyConsistency}`,
      `monthly=${input.consistency.monthlyConsistency}`,
      `trend=${input.trend.trend}`,
      `risk=${input.risk.level}`,
      `confidence=${input.confidence}`,
      `recommendation=${input.recommendation.code}`,
      `patterns=${input.patterns.patterns.length}`,
    ].join('; ');
  }

  private resolveConsistencyLevel(
    value: number | null | undefined,
  ): HabitConsistencyAssessment['dailyConsistency'] {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 'UNKNOWN';
    }

    if (value >= 80) {
      return 'HIGH';
    }

    if (value >= 55) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveStreakQuality(input: {
    currentStreak: number;
    longestStreak: number;
  }): HabitConsistencyAssessment['streakQuality'] {
    if (input.currentStreak <= 0 && input.longestStreak <= 0) {
      return 'UNKNOWN';
    }

    if (
      input.currentStreak >= 7 ||
      input.currentStreak >= input.longestStreak
    ) {
      return 'HIGH';
    }

    if (input.currentStreak >= 3) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private resolveTrendFromSummary(trend: unknown): HabitTrend {
    if (trend === 'improving' || trend === 'IMPROVING') {
      return 'IMPROVING';
    }

    if (trend === 'declining' || trend === 'DECLINING') {
      return 'DECLINING';
    }

    if (trend === 'stable' || trend === 'STABLE') {
      return 'STABLE';
    }

    return 'UNKNOWN';
  }

  private buildRiskSummary(
    level: HabitRiskLevel,
    factors: readonly string[],
  ): string {
    if (level === 'CRITICAL') {
      return 'Habit behavior is at critical risk.';
    }

    if (level === 'HIGH') {
      return 'Habit behavior is at high risk.';
    }

    if (level === 'MEDIUM') {
      return 'Habit behavior is moderately inconsistent.';
    }

    if (factors.includes('stable_routine')) {
      return 'Habit behavior is stable and low risk.';
    }

    return 'Habit behavior is low risk.';
  }

  private normalizeHistory(input: {
    current?: HabitSnapshotLike;
    history: readonly HabitSnapshotLike[];
  }): HabitSnapshotLike[] {
    const snapshots: HabitSnapshotLike[] = [];
    const map = new Map<string, HabitSnapshotLike>();

    for (const snapshot of [
      ...input.history,
      ...(input.current ? [input.current] : []),
    ]) {
      const dateKey = snapshot.date;
      if (!map.has(dateKey)) {
        map.set(dateKey, snapshot);
      }
    }

    for (const snapshot of map.values()) {
      snapshots.push(snapshot);
    }

    return snapshots.sort((left, right) => right.date.localeCompare(left.date));
  }

  private calculateWindowAverage(
    history: readonly HabitSnapshotLike[],
    windowSize: number,
    field: 'consistencyScore' | 'adherenceScore',
  ): number | null {
    if (history.length === 0) {
      return null;
    }

    const window = history.slice(0, windowSize);

    if (window.length === 0) {
      return null;
    }

    return this.roundToWhole(
      window.reduce((sum, snapshot) => sum + snapshot[field], 0) /
        window.length,
    );
  }

  private resolveLongestStreak(
    history: readonly HabitSnapshotLike[],
    fallback: number,
  ): number {
    if (history.length === 0) {
      return fallback;
    }

    return history.reduce(
      (longest, snapshot) => Math.max(longest, snapshot.streakDays),
      fallback,
    );
  }

  private resolveInactivityDays(input: {
    currentSnapshot: HabitSnapshotLike | null;
    habitHistory: readonly HabitSnapshotLike[];
    referenceDate: Date;
  }): number | null {
    const candidateDates = [
      input.currentSnapshot?.date,
      ...input.habitHistory.map((snapshot) => snapshot.date),
    ].filter((date): date is string => Boolean(date));

    if (candidateDates.length === 0) {
      return null;
    }

    const latestDate = candidateDates.sort((left, right) =>
      right.localeCompare(left),
    )[0];
    const latest = new Date(`${latestDate}T00:00:00.000Z`);
    const today = input.referenceDate;

    return Math.max(
      0,
      Math.floor((today.getTime() - latest.getTime()) / 86_400_000),
    );
  }

  private countCompletedHabits(history: readonly HabitSnapshotLike[]): number {
    return history.filter((snapshot) => snapshot.adherenceScore >= 90).length;
  }

  private countMissedHabits(history: readonly HabitSnapshotLike[]): number {
    return history.filter((snapshot) => snapshot.adherenceScore < 40).length;
  }

  private countSkippedHabits(input: {
    riskSignals: readonly HabitRiskSignalLike[];
    crossDomain: HabitCrossDomainInterpretation;
    habitHistory: readonly HabitSnapshotLike[];
  }): number {
    const skippedBySignal = input.riskSignals.filter(
      (signal) =>
        signal.type === 'streak_at_risk' ||
        signal.type === 'dropout_risk' ||
        signal.type === 'inactivity_pattern',
    ).length;

    const skippedByWorkout =
      input.crossDomain.workoutConsistency === 'LOW' ? 1 : 0;

    return skippedBySignal + skippedByWorkout;
  }

  private hasRepeatedMissedDays(
    history: readonly HabitSnapshotLike[],
  ): boolean {
    if (history.length < 3) {
      return false;
    }

    const recent = history.slice(0, 7);
    const lowDays = recent.filter((snapshot) => snapshot.adherenceScore < 50);

    return lowDays.length >= 3;
  }

  private hasRepeatedMissedSignal(
    riskSignals: readonly HabitRiskSignalLike[],
  ): boolean {
    return riskSignals.some(
      (signal) =>
        signal.type.includes('dropout') || signal.type.includes('inactivity'),
    );
  }

  private hasSkippedWorkoutSignal(
    riskSignals: readonly HabitRiskSignalLike[],
  ): boolean {
    return riskSignals.some(
      (signal) =>
        signal.type === 'streak_at_risk' || signal.type === 'dropout_risk',
    );
  }

  private isWeekendOnlyAdherence(
    history: readonly HabitSnapshotLike[],
  ): boolean {
    if (history.length < 4) {
      return false;
    }

    const weekend = history.filter((snapshot) => this.isWeekend(snapshot.date));
    const weekday = history.filter(
      (snapshot) => !this.isWeekend(snapshot.date),
    );

    if (weekend.length === 0 || weekday.length === 0) {
      return false;
    }

    const weekendAverage =
      weekend.reduce((sum, snapshot) => sum + snapshot.adherenceScore, 0) /
      weekend.length;
    const weekdayAverage =
      weekday.reduce((sum, snapshot) => sum + snapshot.adherenceScore, 0) /
      weekday.length;

    return weekendAverage >= 70 && weekdayAverage <= 50;
  }

  private hasBrokenStreak(
    currentSnapshot: HabitSnapshotLike | null,
    history: readonly HabitSnapshotLike[],
  ): boolean {
    const currentStreak = currentSnapshot?.streakDays ?? 0;

    if (currentStreak === 0) {
      return history.some((snapshot) => snapshot.streakDays >= 5);
    }

    return false;
  }

  private isSkippedWorkoutPattern(
    crossDomain: HabitCrossDomainInterpretation,
  ): boolean {
    return crossDomain.workoutConsistency === 'LOW';
  }

  private isRecoveryIrregular(
    crossDomain: HabitCrossDomainInterpretation,
  ): boolean {
    return (
      crossDomain.recoveryConsistency === 'LOW' ||
      crossDomain.recoveryConsistency === 'MEDIUM'
    );
  }

  private isNutritionIrregular(
    crossDomain: HabitCrossDomainInterpretation,
  ): boolean {
    return (
      crossDomain.nutritionConsistency === 'LOW' ||
      crossDomain.nutritionConsistency === 'MEDIUM'
    );
  }

  private orderPatterns(patterns: HabitPatternCode[]): HabitPatternCode[] {
    const order: HabitPatternCode[] = [
      'BROKEN_STREAKS',
      'INACTIVITY_PERIODS',
      'DECLINING_CONSISTENCY',
      'REPEATED_MISSED_DAYS',
      'REPEATED_SKIPPED_WORKOUTS',
      'IRREGULAR_RECOVERY',
      'IRREGULAR_NUTRITION',
      'WEEKEND_ONLY_ADHERENCE',
      'IMPROVING_CONSISTENCY',
    ];

    return patterns.sort(
      (left, right) => order.indexOf(left) - order.indexOf(right),
    );
  }

  private resolveCrossDomainConsistency(input: {
    directLevel?: string | null;
    consistencyLevel?: string | null;
    summaryLevel?: string | null;
    highSignals: readonly string[];
    lowSignals: readonly string[];
  }): HabitConsistencyAssessment['dailyConsistency'] {
    const candidates = [
      input.directLevel,
      input.consistencyLevel,
      input.summaryLevel,
    ]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toUpperCase());

    if (
      candidates.some((value) =>
        [...input.highSignals].some((signal) =>
          value.includes(signal.toUpperCase()),
        ),
      )
    ) {
      return 'HIGH';
    }

    if (
      candidates.some((value) =>
        [...input.lowSignals].some((signal) =>
          value.includes(signal.toUpperCase()),
        ),
      )
    ) {
      return 'LOW';
    }

    if (candidates.length > 0) {
      return 'MEDIUM';
    }

    return 'UNKNOWN';
  }

  private readExpertSnapshot(value: unknown): ExpertSnapshotLike | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as ExpertSnapshotLike;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private resolveNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private roundToWhole(value: number): number {
    return Math.round(value);
  }

  private isWeekend(date: string): boolean {
    const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    return day === 0 || day === 6;
  }

  private escalateRisk(
    current: HabitRiskLevel,
    next: HabitRiskLevel,
  ): HabitRiskLevel {
    const priority: Record<HabitRiskLevel, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };

    return priority[next] > priority[current] ? next : current;
  }
}
