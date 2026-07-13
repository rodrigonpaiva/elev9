import { BaseCoachExpert } from '../coach-expert.base';
import type {
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { UserHealthContext } from '../../context-builder/build-user-health-context.service';
import type { GoalAchievement } from '../../../../../goals/domain/entities/goal-achievement.entity';
import type { GoalMilestone } from '../../../../../goals/domain/entities/goal-milestone.entity';
import type { GoalProgressSnapshot } from '../../../../../goals/domain/entities/goal-progress-snapshot.entity';
import type { WorkoutLog } from '../../../../../progress/domain/entities/workout-log.entity';
import type {
  MotivationAnalysis,
  MotivationConfidence,
  MotivationExpertContribution,
  MotivationEvidenceCode,
  MotivationExpertRequest,
  MotivationOpportunity,
  MotivationRecommendation,
  MotivationRecommendationCode,
  MotivationRisk,
  MotivationRiskAssessment,
  MotivationRuntimeExpertSnapshot,
  MotivationState,
  MotivationStrategy,
  MotivationSupportingEvidence,
} from './motivation-expert.types';

const COACH_EXPERT_VERSION = '1.0.0';
const MOTIVATION_EXPERT_ID = 'MotivationExpert';

const RECOMMENDATION_ORDER: readonly MotivationRecommendationCode[] =
  Object.freeze([
    'ACKNOWLEDGE_RECENT_PROGRESS',
    'HIGHLIGHT_NEXT_MILESTONE',
    'REINFORCE_DAILY_ROUTINE',
    'ENCOURAGE_SMALL_WINS',
    'FOCUS_ON_RECOVERY',
    'PROMOTE_CONSISTENCY',
    'REDUCE_EXPECTATIONS',
    'MAINTAIN_CURRENT_PATH',
    'REBUILD_FOUNDATION',
    'MAINTAIN_CURRENT_MOMENTUM',
  ]);

const STRATEGY_RECOMMENDATIONS: Record<
  MotivationStrategy,
  readonly MotivationRecommendationCode[]
> = {
  REINFORCE_PROGRESS: [
    'ACKNOWLEDGE_RECENT_PROGRESS',
    'HIGHLIGHT_NEXT_MILESTONE',
  ],
  CELEBRATE_CONSISTENCY: ['PROMOTE_CONSISTENCY', 'MAINTAIN_CURRENT_PATH'],
  FOCUS_NEXT_STEP: ['HIGHLIGHT_NEXT_MILESTONE', 'ENCOURAGE_SMALL_WINS'],
  REBUILD_ROUTINE: ['REBUILD_FOUNDATION', 'REINFORCE_DAILY_ROUTINE'],
  ENCOURAGE_COMEBACK: ['ENCOURAGE_SMALL_WINS', 'PROMOTE_CONSISTENCY'],
  HIGHLIGHT_IMPROVEMENT: [
    'ACKNOWLEDGE_RECENT_PROGRESS',
    'MAINTAIN_CURRENT_PATH',
  ],
  PROMOTE_RECOVERY: ['FOCUS_ON_RECOVERY', 'REDUCE_EXPECTATIONS'],
  REDUCE_OVERLOAD: ['REDUCE_EXPECTATIONS', 'FOCUS_ON_RECOVERY'],
  MAINTAIN_MOMENTUM: ['MAINTAIN_CURRENT_PATH', 'MAINTAIN_CURRENT_MOMENTUM'],
};

type ExpertSnapshot = Readonly<Record<string, unknown>>;

type GoalContextLike = NonNullable<CoachExpertContext['goalContext']>;
type HabitContextLike = NonNullable<CoachExpertContext['habit']>;
type ProgressContextLike = NonNullable<CoachExpertContext['progress']>;

export class MotivationExpert extends BaseCoachExpert {
  constructor() {
    super({
      id: MOTIVATION_EXPERT_ID,
      displayName: 'Motivation Expert',
      version: COACH_EXPERT_VERSION,
      category: 'MOTIVATION',
      supportedIntents: [
        'MOTIVATION',
        'GENERAL_CHAT',
        'TRAINING',
        'NUTRITION',
        'RECOVERY',
        'GOALS',
        'HABITS',
        'PROGRESS',
        'DASHBOARD',
        'PLANNING',
      ],
      supportedDomains: [
        'goals',
        'progress',
        'training',
        'recovery',
        'habits',
        'nutrition',
        'personalization',
      ],
      estimatedCost: 1,
      estimatedLatencyMs: 12,
      priority: 70,
      capabilities: [
        'MOTIVATION_SPECIALIST',
        'GENERAL_COACH_SUPPORT',
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
        motivationExpert: Object.freeze<MotivationRuntimeExpertSnapshot>({
          expertId: this.metadata.id,
          motivationState: analysis.motivationState,
          motivationOpportunity: analysis.motivationOpportunity,
          strategy: analysis.strategy,
          riskLevel: analysis.risk.level,
          confidence: analysis.confidence,
          recommendationCodes: analysis.recommendations.map(
            (recommendation) => recommendation.code,
          ),
          evidenceCodes: analysis.supportingEvidence.map(
            (evidence) => evidence.code,
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
        priority: contribution.risk.level,
        intent: input.intent,
        selectedDomainCount: input.selectedDomains.length,
        selectionReason: context.selectionReason,
        runtimeMode: 'deterministic-domain-specialist',
        analysis: contribution.analysis,
        recommendations: contribution.recommendations,
        risk: contribution.risk,
        motivationState: contribution.motivationState,
        motivationOpportunity: contribution.motivationOpportunity,
        strategy: contribution.strategy,
        confidence: contribution.confidence,
        supportingEvidence: contribution.supportingEvidence,
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

  private buildAnalysis(context: CoachExpertContext): MotivationAnalysis {
    const healthContext = context.healthContext;

    if (context.policyEvaluation?.decision.blocked || !healthContext) {
      return this.buildUnavailableAnalysis({
        healthContextAvailable: Boolean(healthContext),
        policyBlocked: Boolean(context.policyEvaluation?.decision.blocked),
      });
    }

    const goalContext = context.goalContext;
    const habit = (context.habit ?? null) as HabitContextLike | null;
    const progress = (context.progress ?? {}) as ProgressContextLike;
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
    const progressExpert = this.readExpertSnapshot(
      context.runtimeMetadata.progressExpert,
    );

    const currentGoal = goalContext?.currentGoal ?? null;
    const progressSnapshot = goalContext?.progressSnapshot ?? null;
    const forecast = goalContext?.forecast ?? null;
    const achievementHistory = goalContext?.achievementHistory ?? [];
    const milestones = goalContext?.milestones ?? [];
    const progressHistory = this.normalizeWorkoutHistory(
      progress.workoutHistory,
    );
    const latestWorkoutDate = this.resolveLatestWorkoutDate(
      progressHistory,
      healthContext.recentWorkoutLogs,
    );
    const latestActivityDate = this.resolveLatestActivityDate({
      latestWorkoutDate,
      achievementHistory,
    });
    const inactivityDays = this.resolveDaysSince(
      latestActivityDate,
      healthContext.generatedAt,
    );
    const currentStreak = this.resolveCurrentStreak({
      healthContext,
      habit,
      progressHistory,
    });
    const longestStreak = this.resolveLongestStreak({
      habit,
      progressHistory,
      currentStreak,
    });
    const weeklyAdherence = this.resolveWeeklyAdherence({
      healthContext,
      habit,
      progress,
    });
    const monthlyAdherence = this.resolveMonthlyAdherence({
      healthContext,
      habit,
      progress,
    });
    const checkInMotivationLevel =
      healthContext.latestCheckIn?.motivationLevel ?? null;
    const goalProgressPercentage =
      progressSnapshot?.progressPercentage ??
      this.resolveGoalProgressPercentage(currentGoal, progressSnapshot);

    const evidence: MotivationSupportingEvidence[] = [];
    let positiveScore = 0;
    let negativeScore = 0;

    const recentAchievement = this.resolveRecentAchievement({
      achievementHistory,
      progressSnapshot,
      forecast,
      milestones,
      referenceDate: healthContext.generatedAt,
    });
    if (recentAchievement) {
      positiveScore += 3;
      evidence.push(
        this.createEvidence('RECENT_ACHIEVEMENT', 'goalContext', {
          achievedAt: recentAchievement.achievedAt.toISOString?.() ?? null,
          completionPercentage: recentAchievement.completionPercentage,
        }),
      );
    }

    const milestoneClose = this.resolveMilestoneProximity({
      progressGoalPercentage: goalProgressPercentage,
      forecast,
      milestones,
    });
    if (milestoneClose) {
      positiveScore += 2;
      evidence.push(
        this.createEvidence('MILESTONE_CLOSE', 'goalContext', milestoneClose),
      );
    }

    const comeback = this.resolveComeback({
      progressHistory,
      healthContext,
      inactivityDays,
    });
    if (comeback) {
      positiveScore += 2;
      evidence.push(
        this.createEvidence('COMEBACK_AFTER_INACTIVITY', 'progressContext', {
          gapDays: comeback.gapDays,
          latestWorkoutDate: comeback.latestWorkoutDate,
          previousWorkoutDate: comeback.previousWorkoutDate,
        }),
      );
    }

    if (currentStreak >= 5) {
      positiveScore += 1;
      evidence.push(
        this.createEvidence('STREAK_EXTENSION', 'healthContext', {
          currentStreak,
        }),
      );
    }

    const progressTrend = this.readString(progressExpert?.trend);
    if (progressTrend === 'STRONGLY_IMPROVING') {
      positiveScore += 2;
      evidence.push(
        this.createEvidence('GOAL_PROGRESS_IMPROVING', 'progressExpert', {
          trend: progressTrend,
        }),
      );
    } else if (progressTrend === 'IMPROVING') {
      positiveScore += 1;
      evidence.push(
        this.createEvidence('GOAL_PROGRESS_IMPROVING', 'progressExpert', {
          trend: progressTrend,
        }),
      );
    } else if (
      progressTrend === 'DECLINING' ||
      progressTrend === 'REGRESSING'
    ) {
      negativeScore += progressTrend === 'REGRESSING' ? 3 : 2;
      evidence.push(
        this.createEvidence('GOAL_PROGRESS_DECLINING', 'progressExpert', {
          trend: progressTrend,
        }),
      );
    }

    const progressMomentum = this.readString(progressExpert?.momentum);
    if (progressMomentum === 'HIGH' || progressMomentum === 'POSITIVE') {
      positiveScore += progressMomentum === 'HIGH' ? 2 : 1;
    } else if (
      progressMomentum === 'NEGATIVE' ||
      progressMomentum === 'VERY_NEGATIVE'
    ) {
      negativeScore += progressMomentum === 'VERY_NEGATIVE' ? 3 : 2;
    }

    const progressPlateau = this.readString(progressExpert?.plateau);
    if (
      progressPlateau &&
      progressPlateau !== 'NONE' &&
      progressPlateau !== 'UNKNOWN'
    ) {
      negativeScore +=
        progressPlateau === 'LONG' ? 3 : progressPlateau === 'MODERATE' ? 2 : 1;
      evidence.push(
        this.createEvidence('PLATEAU_ACTIVE', 'progressExpert', {
          plateau: progressPlateau,
        }),
      );
    }

    const progressRegression = this.readString(progressExpert?.regression);
    if (
      progressRegression &&
      progressRegression !== 'NONE' &&
      progressRegression !== 'UNKNOWN'
    ) {
      negativeScore +=
        progressRegression === 'SEVERE'
          ? 4
          : progressRegression === 'MODERATE'
            ? 3
            : 1;
      evidence.push(
        this.createEvidence('REGRESSION_ACTIVE', 'progressExpert', {
          regression: progressRegression,
        }),
      );
    }

    const habitStatus = this.readString(habitExpert?.habitStatus);
    if (habitStatus === 'EXCELLENT' || habitStatus === 'GOOD') {
      positiveScore += habitStatus === 'EXCELLENT' ? 2 : 1;
      evidence.push(
        this.createEvidence('HABIT_STRONG', 'habitExpert', {
          habitStatus,
        }),
      );
    } else if (habitStatus === 'POOR' || habitStatus === 'BROKEN') {
      negativeScore += habitStatus === 'BROKEN' ? 3 : 2;
      evidence.push(
        this.createEvidence('HABIT_WEAK', 'habitExpert', {
          habitStatus,
        }),
      );
    }

    const workoutStatus = this.readString(workoutExpert?.trainingStatus);
    if (
      workoutStatus === 'completed' ||
      workoutStatus === 'partially_completed'
    ) {
      positiveScore += workoutStatus === 'completed' ? 1 : 0;
      evidence.push(
        this.createEvidence('WORKOUT_CONSISTENT', 'workoutExpert', {
          trainingStatus: workoutStatus,
        }),
      );
    } else if (workoutStatus === 'skipped') {
      negativeScore += 2;
      evidence.push(
        this.createEvidence('WORKOUT_INCONSISTENT', 'workoutExpert', {
          trainingStatus: workoutStatus,
        }),
      );
    }

    const nutritionStatus = this.readString(nutritionExpert?.nutritionStatus);
    if (nutritionStatus === 'ON_TRACK') {
      positiveScore += 1;
      evidence.push(
        this.createEvidence('NUTRITION_CONSISTENT', 'nutritionExpert', {
          nutritionStatus,
        }),
      );
    } else if (nutritionStatus === 'PARTIAL') {
      positiveScore += 0;
    } else if (
      nutritionStatus === 'MISSED' ||
      nutritionStatus === 'NO_PLAN' ||
      nutritionStatus === 'NO_PROFILE'
    ) {
      negativeScore += nutritionStatus === 'MISSED' ? 2 : 1;
      evidence.push(
        this.createEvidence('NUTRITION_INCONSISTENT', 'nutritionExpert', {
          nutritionStatus,
        }),
      );
    }

    const recoveryStatus = this.readString(recoveryExpert?.recoveryStatus);
    if (recoveryStatus === 'OPTIMAL' || recoveryStatus === 'GOOD') {
      positiveScore += recoveryStatus === 'OPTIMAL' ? 2 : 1;
      evidence.push(
        this.createEvidence('RECOVERY_IMPROVING', 'recoveryExpert', {
          recoveryStatus,
        }),
      );
    } else if (
      recoveryStatus === 'POOR' ||
      recoveryStatus === 'CRITICAL' ||
      recoveryStatus === 'MODERATE'
    ) {
      negativeScore +=
        recoveryStatus === 'CRITICAL' ? 3 : recoveryStatus === 'POOR' ? 2 : 1;
      evidence.push(
        this.createEvidence('RECOVERY_LIMITED', 'recoveryExpert', {
          recoveryStatus,
        }),
      );
    }

    const goalStatus = this.readGoalStatus(currentGoal, goalExpert);
    if (goalStatus === 'COMPLETED' || goalStatus === 'ON_TRACK') {
      positiveScore += goalStatus === 'COMPLETED' ? 2 : 1;
      evidence.push(
        this.createEvidence('GOAL_PROGRESS_IMPROVING', 'goalExpert', {
          goalStatus,
        }),
      );
    } else if (
      goalStatus === 'BEHIND' ||
      goalStatus === 'AT_RISK' ||
      goalStatus === 'SLIGHTLY_BEHIND'
    ) {
      negativeScore +=
        goalStatus === 'AT_RISK' ? 3 : goalStatus === 'BEHIND' ? 2 : 1;
      evidence.push(
        this.createEvidence('GOAL_PROGRESS_DECLINING', 'goalExpert', {
          goalStatus,
        }),
      );
    }

    if (checkInMotivationLevel !== null) {
      if (checkInMotivationLevel >= 4) {
        positiveScore += 1;
        evidence.push(
          this.createEvidence('CHECKIN_MOTIVATION_HIGH', 'healthContext', {
            motivationLevel: checkInMotivationLevel,
          }),
        );
      } else if (checkInMotivationLevel <= 2) {
        negativeScore += 1;
        evidence.push(
          this.createEvidence('CHECKIN_MOTIVATION_LOW', 'healthContext', {
            motivationLevel: checkInMotivationLevel,
          }),
        );
      }
    }

    if (healthContext.adherenceScore >= 90) {
      positiveScore += 2;
    } else if (healthContext.adherenceScore >= 80) {
      positiveScore += 1;
    } else if (healthContext.adherenceScore <= 50) {
      negativeScore += 1;
    }

    if (healthContext.currentStreak >= 10) {
      positiveScore += 2;
    } else if (healthContext.currentStreak >= 5) {
      positiveScore += 1;
    } else if (healthContext.currentStreak === 0) {
      negativeScore += 1;
    }

    if (inactivityDays !== null) {
      if (inactivityDays >= 21) {
        negativeScore += 4;
        evidence.push(
          this.createEvidence('LONG_INACTIVITY', 'progressContext', {
            inactivityDays,
          }),
        );
      } else if (inactivityDays >= 14) {
        negativeScore += 3;
        evidence.push(
          this.createEvidence('LONG_INACTIVITY', 'progressContext', {
            inactivityDays,
          }),
        );
      } else if (inactivityDays >= 7) {
        negativeScore += 2;
        evidence.push(
          this.createEvidence('LONG_INACTIVITY', 'progressContext', {
            inactivityDays,
          }),
        );
      }
    }

    const motivationState = this.resolveMotivationState({
      positiveScore,
      negativeScore,
      inactivityDays,
      progressRegression,
      habitStatus,
      recoveryStatus,
    });
    const motivationOpportunity = this.resolveMotivationOpportunity({
      recentAchievement,
      comeback,
      milestoneClose,
      progressTrend,
      progressPlateau,
      habitStatus,
      currentStreak,
      progressMomentum,
      recoveryStatus,
    });
    const strategy = this.resolveStrategy({
      motivationState,
      motivationOpportunity,
      progressPlateau,
      progressRegression,
      recoveryStatus,
      habitStatus,
      inactivityDays,
    });
    const recommendations = this.buildRecommendations({
      strategy,
      motivationState,
      motivationOpportunity,
      progressRegression,
      recoveryStatus,
      habitStatus,
      inactivityDays,
    });
    const risk = this.resolveRisk({
      motivationState,
      progressRegression,
      progressPlateau,
      inactivityDays,
      habitStatus,
      recoveryStatus,
      negativeScore,
    });
    const confidence = this.resolveConfidence({
      healthContext,
      goalContext,
      habit,
      progress,
      workoutExpert,
      nutritionExpert,
      recoveryExpert,
      goalExpert,
      habitExpert,
      progressExpert,
      evidence,
    });
    const summary = this.buildSummary({
      motivationState,
      motivationOpportunity,
      strategy,
      risk,
      confidence,
    });

    return Object.freeze({
      summary,
      motivationState,
      motivationOpportunity,
      strategy,
      recommendations: Object.freeze(recommendations),
      risk,
      confidence,
      supportingEvidence: Object.freeze(evidence),
      recentAchievementCount: recentAchievement ? 1 : 0,
      inactivityDays,
      currentStreak,
      longestStreak,
      weeklyAdherence,
      monthlyAdherence,
      goalProgressPercentage,
      goalStatus: goalStatus || 'UNKNOWN',
      goalForecastStatus:
        this.readString(forecast?.confidence?.value ?? forecast?.confidence) ||
        'UNKNOWN',
      progressTrend: progressTrend || 'UNKNOWN',
      progressMomentum: progressMomentum || 'UNKNOWN',
      progressPlateau: progressPlateau || 'UNKNOWN',
      progressRegression: progressRegression || 'UNKNOWN',
      habitStatus: habitStatus || 'UNKNOWN',
      workoutStatus: workoutStatus || 'UNKNOWN',
      nutritionStatus: nutritionStatus || 'UNKNOWN',
      recoveryStatus: recoveryStatus || 'UNKNOWN',
      checkInMotivationLevel,
      sourceCoverage: Object.freeze({
        healthContextPresent: true,
        goalContextPresent: Boolean(goalContext),
        progressContextPresent:
          Boolean(progress.workoutHistory?.length) ||
          Boolean(progress.dailyCheckInHistory?.length),
        habitContextPresent: Boolean(habit),
        workoutExpertPresent: Boolean(workoutExpert),
        nutritionExpertPresent: Boolean(nutritionExpert),
        recoveryExpertPresent: Boolean(recoveryExpert),
        goalExpertPresent: Boolean(goalExpert),
        habitExpertPresent: Boolean(habitExpert),
        progressExpertPresent: Boolean(progressExpert),
        latestCheckInPresent: Boolean(healthContext.latestCheckIn),
      }),
    });
  }

  private buildUnavailableAnalysis(input: {
    healthContextAvailable: boolean;
    policyBlocked: boolean;
  }): MotivationAnalysis {
    const risk = this.buildRisk('CRITICAL', ['analysis_unavailable'], {
      reason: input.policyBlocked ? 'policy_blocked' : 'health_context_missing',
    });
    const recommendation = this.buildRecommendation('MAINTAIN_CURRENT_PATH', {
      reason: 'unavailable',
    });

    return Object.freeze({
      summary:
        'state=UNKNOWN; opportunity=NONE; strategy=MAINTAIN_MOMENTUM; risk=CRITICAL; confidence=LOW',
      motivationState: 'UNKNOWN',
      motivationOpportunity: 'NONE',
      strategy: 'MAINTAIN_MOMENTUM',
      recommendations: Object.freeze([recommendation]),
      risk,
      confidence: 'LOW',
      supportingEvidence: Object.freeze([]),
      recentAchievementCount: 0,
      inactivityDays: null,
      currentStreak: 0,
      longestStreak: 0,
      weeklyAdherence: null,
      monthlyAdherence: null,
      goalProgressPercentage: null,
      goalStatus: 'UNKNOWN',
      goalForecastStatus: 'UNKNOWN',
      progressTrend: 'UNKNOWN',
      progressMomentum: 'UNKNOWN',
      progressPlateau: 'UNKNOWN',
      progressRegression: 'UNKNOWN',
      habitStatus: 'UNKNOWN',
      workoutStatus: 'UNKNOWN',
      nutritionStatus: 'UNKNOWN',
      recoveryStatus: 'UNKNOWN',
      checkInMotivationLevel: null,
      sourceCoverage: Object.freeze({
        healthContextPresent: input.healthContextAvailable,
        goalContextPresent: false,
        progressContextPresent: false,
        habitContextPresent: false,
        workoutExpertPresent: false,
        nutritionExpertPresent: false,
        recoveryExpertPresent: false,
        goalExpertPresent: false,
        habitExpertPresent: false,
        progressExpertPresent: false,
        latestCheckInPresent: false,
      }),
    });
  }

  private buildContribution(
    analysis: MotivationAnalysis,
    context: CoachExpertContext,
  ): MotivationExpertContribution {
    return Object.freeze({
      expertId: this.metadata.id,
      summary: analysis.summary,
      analysis,
      motivationState: analysis.motivationState,
      motivationOpportunity: analysis.motivationOpportunity,
      strategy: analysis.strategy,
      recommendations: analysis.recommendations,
      risk: analysis.risk,
      confidence: analysis.confidence,
      supportingEvidence: analysis.supportingEvidence,
      metadata: Object.freeze({
        expertId: this.metadata.id,
        selectionReason: context.selectionReason,
        priority: analysis.risk.level,
        motivationState: analysis.motivationState,
        motivationOpportunity: analysis.motivationOpportunity,
        strategy: analysis.strategy,
        confidence: analysis.confidence,
        riskLevel: analysis.risk.level,
        recommendationCodes: analysis.recommendations.map(
          (recommendation) => recommendation.code,
        ),
        evidenceCodes: analysis.supportingEvidence.map(
          (evidence) => evidence.code,
        ),
      }),
    });
  }

  private buildContributions(
    contribution: MotivationExpertContribution,
  ): readonly CoachExpertContribution[] {
    const primaryRecommendation = contribution.recommendations[0];

    return Object.freeze([
      Object.freeze({
        expertId: this.metadata.id,
        type: 'ANALYSIS',
        summary: contribution.summary,
        metadata: Object.freeze({
          motivationContribution: contribution,
          kind: 'analysis',
        }),
      }),
      Object.freeze({
        expertId: this.metadata.id,
        type: 'CONTRIBUTION',
        summary: `strategy=${contribution.strategy}; recommendation=${
          primaryRecommendation?.code ?? 'MAINTAIN_CURRENT_PATH'
        }`,
        metadata: Object.freeze({
          motivationContribution: contribution,
          kind: 'contribution',
          recommendationCode:
            primaryRecommendation?.code ?? 'MAINTAIN_CURRENT_PATH',
        }),
      }),
    ]);
  }

  private resolveMotivationState(input: {
    positiveScore: number;
    negativeScore: number;
    inactivityDays: number | null;
    progressRegression: string;
    habitStatus: string;
    recoveryStatus: string;
  }): MotivationState {
    const netScore = input.positiveScore - input.negativeScore;

    if (
      (input.inactivityDays !== null && input.inactivityDays >= 21) ||
      input.progressRegression === 'SEVERE' ||
      (input.habitStatus === 'BROKEN' && input.negativeScore >= 5)
    ) {
      return 'DISENGAGING';
    }

    if (netScore >= 6) {
      return 'HIGHLY_ENGAGED';
    }

    if (netScore >= 2) {
      return 'ENGAGED';
    }

    if (netScore >= -1) {
      return 'STABLE';
    }

    if (
      input.recoveryStatus === 'CRITICAL' ||
      input.habitStatus === 'BROKEN' ||
      netScore <= -5
    ) {
      return 'DISENGAGING';
    }

    return 'NEEDS_SUPPORT';
  }

  private resolveMotivationOpportunity(input: {
    recentAchievement: {
      achievedAt: Date;
      completionPercentage: number;
    } | null;
    comeback: {
      gapDays: number;
      latestWorkoutDate: string | null;
      previousWorkoutDate: string | null;
    } | null;
    milestoneClose: Readonly<Record<string, unknown>> | null;
    progressTrend: string;
    progressPlateau: string;
    habitStatus: string;
    currentStreak: number;
    progressMomentum: string;
    recoveryStatus: string;
  }): MotivationOpportunity {
    if (input.recentAchievement) {
      return 'RECENT_ACHIEVEMENT';
    }

    if (input.comeback) {
      return 'COMEBACK';
    }

    if (input.milestoneClose) {
      return 'MILESTONE_CLOSE';
    }

    if (
      input.currentStreak >= 5 &&
      (input.habitStatus === 'EXCELLENT' || input.habitStatus === 'GOOD')
    ) {
      return 'STREAK_EXTENSION';
    }

    if (
      input.progressTrend === 'STRONGLY_IMPROVING' ||
      input.progressTrend === 'IMPROVING' ||
      input.progressMomentum === 'HIGH' ||
      input.progressMomentum === 'POSITIVE'
    ) {
      return 'GOAL_PROGRESS';
    }

    if (
      input.progressPlateau !== 'NONE' &&
      input.progressPlateau !== 'UNKNOWN'
    ) {
      return 'PLATEAU_BREAK';
    }

    if (input.recoveryStatus === 'OPTIMAL' || input.recoveryStatus === 'GOOD') {
      return 'RECOVERY_SUCCESS';
    }

    if (input.habitStatus === 'EXCELLENT' || input.habitStatus === 'GOOD') {
      return 'CONSISTENCY';
    }

    return 'NONE';
  }

  private resolveStrategy(input: {
    motivationState: MotivationState;
    motivationOpportunity: MotivationOpportunity;
    progressPlateau: string;
    progressRegression: string;
    recoveryStatus: string;
    habitStatus: string;
    inactivityDays: number | null;
  }): MotivationStrategy {
    if (
      input.recoveryStatus === 'CRITICAL' ||
      input.recoveryStatus === 'POOR' ||
      input.progressRegression === 'SEVERE' ||
      (input.inactivityDays !== null && input.inactivityDays >= 21)
    ) {
      return 'REDUCE_OVERLOAD';
    }

    switch (input.motivationOpportunity) {
      case 'RECENT_ACHIEVEMENT':
        return 'REINFORCE_PROGRESS';
      case 'COMEBACK':
        return 'ENCOURAGE_COMEBACK';
      case 'MILESTONE_CLOSE':
      case 'GOAL_PROGRESS':
        return 'FOCUS_NEXT_STEP';
      case 'STREAK_EXTENSION':
      case 'CONSISTENCY':
        return 'CELEBRATE_CONSISTENCY';
      case 'PLATEAU_BREAK':
        return input.progressPlateau === 'LONG' ||
          input.progressRegression !== 'NONE'
          ? 'REBUILD_ROUTINE'
          : 'HIGHLIGHT_IMPROVEMENT';
      case 'RECOVERY_SUCCESS':
        return 'PROMOTE_RECOVERY';
      case 'NONE':
      default:
        return input.motivationState === 'DISENGAGING' ||
          input.motivationState === 'NEEDS_SUPPORT'
          ? 'REBUILD_ROUTINE'
          : 'MAINTAIN_MOMENTUM';
    }
  }

  private buildRecommendations(input: {
    strategy: MotivationStrategy;
    motivationState: MotivationState;
    motivationOpportunity: MotivationOpportunity;
    progressRegression: string;
    recoveryStatus: string;
    habitStatus: string;
    inactivityDays: number | null;
  }): readonly MotivationRecommendation[] {
    const codes = new Set<MotivationRecommendationCode>();
    const strategyRecommendations =
      STRATEGY_RECOMMENDATIONS[input.strategy] ?? [];

    for (const code of strategyRecommendations) {
      codes.add(code);
    }

    if (
      input.motivationState === 'DISENGAGING' ||
      (input.inactivityDays !== null && input.inactivityDays >= 7)
    ) {
      codes.add('REBUILD_FOUNDATION');
    }

    if (
      input.recoveryStatus === 'CRITICAL' ||
      input.recoveryStatus === 'POOR'
    ) {
      codes.add('FOCUS_ON_RECOVERY');
    }

    if (input.habitStatus === 'BROKEN') {
      codes.add('REINFORCE_DAILY_ROUTINE');
    }

    if (
      input.motivationOpportunity === 'MILESTONE_CLOSE' ||
      input.motivationOpportunity === 'GOAL_PROGRESS'
    ) {
      codes.add('HIGHLIGHT_NEXT_MILESTONE');
    }

    if (input.progressRegression !== 'NONE') {
      codes.add('REDUCE_EXPECTATIONS');
    }

    if (codes.size === 0) {
      codes.add('MAINTAIN_CURRENT_PATH');
    }

    return Object.freeze(
      RECOMMENDATION_ORDER.filter((code) => codes.has(code)).map((code) =>
        this.buildRecommendation(code, {
          strategy: input.strategy,
          motivationState: input.motivationState,
          motivationOpportunity: input.motivationOpportunity,
        }),
      ),
    );
  }

  private resolveRisk(input: {
    motivationState: MotivationState;
    progressRegression: string;
    progressPlateau: string;
    inactivityDays: number | null;
    habitStatus: string;
    recoveryStatus: string;
    negativeScore: number;
  }): MotivationRiskAssessment {
    if (
      input.motivationState === 'DISENGAGING' ||
      input.progressRegression === 'SEVERE' ||
      (input.inactivityDays !== null && input.inactivityDays >= 21)
    ) {
      return this.buildRisk('CRITICAL', [
        'disengaging_state',
        input.progressRegression === 'SEVERE'
          ? 'severe_regression'
          : 'prolonged_inactivity',
      ]);
    }

    if (
      input.progressRegression === 'MODERATE' ||
      input.progressPlateau === 'LONG' ||
      input.habitStatus === 'BROKEN' ||
      input.recoveryStatus === 'CRITICAL' ||
      input.recoveryStatus === 'POOR' ||
      input.negativeScore >= 5
    ) {
      return this.buildRisk('HIGH', [
        input.progressRegression === 'MODERATE'
          ? 'moderate_regression'
          : 'negative_domain_signals',
      ]);
    }

    if (
      input.motivationState === 'NEEDS_SUPPORT' ||
      input.progressPlateau === 'MODERATE' ||
      (input.inactivityDays !== null && input.inactivityDays >= 7) ||
      input.habitStatus === 'POOR'
    ) {
      return this.buildRisk('MEDIUM', ['support_needed']);
    }

    return this.buildRisk('LOW', ['stable_engagement']);
  }

  private resolveConfidence(input: {
    healthContext: UserHealthContext;
    goalContext: CoachExpertContext['goalContext'];
    habit: CoachExpertContext['habit'];
    progress: ProgressContextLike;
    workoutExpert: ExpertSnapshot | undefined;
    nutritionExpert: ExpertSnapshot | undefined;
    recoveryExpert: ExpertSnapshot | undefined;
    goalExpert: ExpertSnapshot | undefined;
    habitExpert: ExpertSnapshot | undefined;
    progressExpert: ExpertSnapshot | undefined;
    evidence: readonly MotivationSupportingEvidence[];
  }): MotivationConfidence {
    const sourceCount = [
      Boolean(input.goalContext),
      Boolean(input.habit),
      Boolean(input.progress.workoutHistory?.length),
      Boolean(input.workoutExpert),
      Boolean(input.nutritionExpert),
      Boolean(input.recoveryExpert),
      Boolean(input.goalExpert),
      Boolean(input.habitExpert),
      Boolean(input.progressExpert),
      Boolean(input.healthContext.latestCheckIn),
    ].filter(Boolean).length;

    if (sourceCount >= 6 && input.evidence.length >= 4) {
      return 'HIGH';
    }

    if (sourceCount >= 3 && input.evidence.length >= 2) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  private buildSummary(input: {
    motivationState: MotivationState;
    motivationOpportunity: MotivationOpportunity;
    strategy: MotivationStrategy;
    risk: MotivationRiskAssessment;
    confidence: MotivationConfidence;
  }): string {
    return [
      `state=${input.motivationState}`,
      `opportunity=${input.motivationOpportunity}`,
      `strategy=${input.strategy}`,
      `risk=${input.risk.level}`,
      `confidence=${input.confidence}`,
    ].join('; ');
  }

  private buildRisk(
    level: MotivationRisk,
    factors: readonly string[],
    metadata: Readonly<Record<string, unknown>> = {},
  ): MotivationRiskAssessment {
    return Object.freeze({
      level,
      summary: `risk=${level}; factors=${factors.length}`,
      factors: Object.freeze([...factors]),
      metadata: Object.freeze(metadata),
    });
  }

  private buildRecommendation(
    code: MotivationRecommendationCode,
    metadata: Readonly<Record<string, unknown>>,
  ): MotivationRecommendation {
    return Object.freeze({
      code,
      metadata: Object.freeze(metadata),
    });
  }

  private createEvidence(
    code: MotivationEvidenceCode,
    source: string,
    metadata: Readonly<Record<string, unknown>>,
  ): MotivationSupportingEvidence {
    return Object.freeze({
      code,
      source,
      metadata: Object.freeze(metadata),
    });
  }

  private resolveRecentAchievement(input: {
    achievementHistory: readonly GoalAchievement[];
    progressSnapshot: GoalProgressSnapshot | null;
    forecast: unknown;
    milestones: readonly GoalMilestone[];
    referenceDate: Date;
  }): { achievedAt: Date; completionPercentage: number } | null {
    const latestAchievement = this.resolveLatestAchievement(
      input.achievementHistory,
    );

    if (
      latestAchievement &&
      this.resolveDaysSince(
        latestAchievement.achievedAt,
        input.referenceDate,
      ) !== null
    ) {
      const daysSinceAchievement = this.resolveDaysSince(
        latestAchievement.achievedAt,
        input.referenceDate,
      );

      if (daysSinceAchievement !== null && daysSinceAchievement <= 14) {
        return {
          achievedAt: latestAchievement.achievedAt,
          completionPercentage: latestAchievement.completionPercentage,
        };
      }
    }

    if (
      input.progressSnapshot &&
      input.progressSnapshot.progressPercentage >= 90
    ) {
      return {
        achievedAt: input.referenceDate,
        completionPercentage: input.progressSnapshot.progressPercentage,
      };
    }

    const forecast = this.readObject(input.forecast);

    return null;
  }

  private resolveMilestoneProximity(input: {
    progressGoalPercentage: number | null;
    forecast: unknown;
    milestones: readonly GoalMilestone[];
  }): Readonly<Record<string, unknown>> | null {
    const remainingMilestones = input.milestones.filter(
      (milestone) => !milestone.achieved,
    );
    const achievedMilestones = input.milestones.filter(
      (milestone) => milestone.achieved,
    );

    if (
      input.progressGoalPercentage !== null &&
      input.progressGoalPercentage >= 75 &&
      remainingMilestones.length <= 1
    ) {
      return {
        progressGoalPercentage: input.progressGoalPercentage,
        remainingMilestones: remainingMilestones.length,
        achievedMilestones: achievedMilestones.length,
      };
    }

    const forecast = this.readObject(input.forecast);
    const forecastConfidence = this.readString(
      forecast?.confidence?.value ?? forecast?.confidence,
    );

    if (
      forecastConfidence === 'high' &&
      typeof forecast?.estimatedDaysRemaining === 'number' &&
      forecast.estimatedDaysRemaining <= 21
    ) {
      return {
        forecastConfidence,
        estimatedDaysRemaining: forecast.estimatedDaysRemaining,
      };
    }

    return null;
  }

  private resolveComeback(input: {
    progressHistory: readonly WorkoutLog[];
    healthContext: UserHealthContext;
    inactivityDays: number | null;
  }): {
    gapDays: number;
    latestWorkoutDate: string | null;
    previousWorkoutDate: string | null;
  } | null {
    const history = [...input.progressHistory].sort((left, right) =>
      left.date.localeCompare(right.date),
    );

    if (history.length < 2) {
      return null;
    }

    for (let index = history.length - 1; index >= 1; index -= 1) {
      const latest = history[index];
      const previous = history[index - 1];
      const gapDays = this.resolveDaysBetween(previous.date, latest.date);
      const latestDaysSince = this.resolveDaysSince(
        latest.date,
        input.healthContext.generatedAt,
      );

      if (
        gapDays !== null &&
        gapDays >= 7 &&
        latestDaysSince !== null &&
        latestDaysSince <= 7 &&
        input.healthContext.currentStreak > 0
      ) {
        return {
          gapDays,
          latestWorkoutDate: latest.date,
          previousWorkoutDate: previous.date,
        };
      }
    }

    return null;
  }

  private resolveLatestAchievement(
    achievementHistory: readonly GoalAchievement[],
  ): GoalAchievement | null {
    if (achievementHistory.length === 0) {
      return null;
    }

    return [...achievementHistory].sort(
      (left, right) => right.achievedAt.getTime() - left.achievedAt.getTime(),
    )[0];
  }

  private resolveLatestWorkoutDate(
    progressHistory: readonly WorkoutLog[],
    recentWorkoutLogs: readonly WorkoutLog[],
  ): string | null {
    const candidateDates = [
      ...progressHistory.map((entry) => entry.date),
      ...recentWorkoutLogs.map((entry) => entry.date),
    ].filter((value) => typeof value === 'string' && value.trim().length > 0);

    if (candidateDates.length === 0) {
      return null;
    }

    return [...candidateDates].sort()[candidateDates.length - 1];
  }

  private resolveLatestActivityDate(input: {
    latestWorkoutDate: string | null;
    habitCurrentDate?: string;
    goalProgressDate?: string;
    achievementHistory: readonly GoalAchievement[];
  }): string | null {
    const dates = [
      input.latestWorkoutDate,
      input.habitCurrentDate,
      input.goalProgressDate,
      ...input.achievementHistory.map((achievement) =>
        achievement.achievedAt.toISOString().slice(0, 10),
      ),
    ].filter((value): value is string => Boolean(value));

    if (dates.length === 0) {
      return null;
    }

    return [...dates].sort()[dates.length - 1];
  }

  private resolveDaysSince(
    dateValue: string | Date | null,
    referenceDate: Date,
  ): number | null {
    if (!dateValue) {
      return null;
    }

    const reference = referenceDate.getTime();
    const candidate =
      typeof dateValue === 'string' ? new Date(dateValue) : dateValue;

    if (Number.isNaN(candidate.getTime())) {
      return null;
    }

    return Math.max(
      0,
      Math.floor((reference - candidate.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  private resolveDaysBetween(
    earlierDate: string | Date,
    laterDate: string | Date,
  ): number | null {
    const earlier =
      typeof earlierDate === 'string' ? new Date(earlierDate) : earlierDate;
    const later =
      typeof laterDate === 'string' ? new Date(laterDate) : laterDate;

    if (Number.isNaN(earlier.getTime()) || Number.isNaN(later.getTime())) {
      return null;
    }

    return Math.max(
      0,
      Math.floor((later.getTime() - earlier.getTime()) / (24 * 60 * 60 * 1000)),
    );
  }

  private resolveCurrentStreak(input: {
    healthContext: UserHealthContext;
    habit: HabitContextLike | null;
    progressHistory: readonly WorkoutLog[];
  }): number {
    const habitStreak = input.habit?.summary?.currentStreak;
    if (typeof habitStreak === 'number' && Number.isFinite(habitStreak)) {
      return habitStreak;
    }

    const progressStreak = input.healthContext.currentStreak;
    if (typeof progressStreak === 'number' && Number.isFinite(progressStreak)) {
      return progressStreak;
    }

    if (input.progressHistory.length === 0) {
      return 0;
    }

    return input.progressHistory.length;
  }

  private resolveLongestStreak(input: {
    habit: HabitContextLike | null;
    progressHistory: readonly WorkoutLog[];
    currentStreak: number;
  }): number {
    const habitLongest = input.habit?.summary?.longestStreak;
    if (typeof habitLongest === 'number' && Number.isFinite(habitLongest)) {
      return habitLongest;
    }

    return Math.max(input.currentStreak, input.progressHistory.length);
  }

  private resolveWeeklyAdherence(input: {
    healthContext: UserHealthContext;
    habit: HabitContextLike | null;
    progress: ProgressContextLike;
  }): number | null {
    const habitAdherence = input.habit?.summary?.adherenceRate;
    if (typeof habitAdherence === 'number' && Number.isFinite(habitAdherence)) {
      return habitAdherence;
    }

    const weeklySummary = input.progress.weeklySummary;
    if (weeklySummary && typeof weeklySummary.workoutsCompleted === 'number') {
      const weeklyFrequency = input.healthContext.weeklyFrequency ?? 0;
      if (weeklyFrequency > 0) {
        return Math.min(
          100,
          Math.round((weeklySummary.workoutsCompleted / weeklyFrequency) * 100),
        );
      }
    }

    return input.healthContext.adherenceScore > 0
      ? input.healthContext.adherenceScore
      : null;
  }

  private resolveMonthlyAdherence(input: {
    healthContext: UserHealthContext;
    habit: HabitContextLike | null;
    progress: ProgressContextLike;
  }): number | null {
    const habitAdherence = input.habit?.summary?.adherenceRate;
    if (typeof habitAdherence === 'number' && Number.isFinite(habitAdherence)) {
      return habitAdherence;
    }

    const monthlySummary = input.progress.monthlySummary;
    if (
      monthlySummary &&
      typeof monthlySummary.workoutsCompleted === 'number'
    ) {
      const weeklyFrequency = input.healthContext.weeklyFrequency ?? 0;
      if (weeklyFrequency > 0) {
        return Math.min(
          100,
          Math.round(
            (monthlySummary.workoutsCompleted / (weeklyFrequency * 4)) * 100,
          ),
        );
      }
    }

    return input.healthContext.adherenceScore > 0
      ? input.healthContext.adherenceScore
      : null;
  }

  private resolveGoalStatus(
    currentGoal: GoalContextLike['currentGoal'] | null,
    goalExpert: ExpertSnapshot | undefined,
  ): string {
    const snapshotStatus = this.readString(goalExpert?.goalStatus);
    if (snapshotStatus) {
      return snapshotStatus;
    }

    const goalStatus = this.readString(
      currentGoal?.status?.value ?? currentGoal?.status,
    );
    return goalStatus || 'UNKNOWN';
  }

  private resolveGoalProgressPercentage(
    currentGoal: GoalContextLike['currentGoal'] | null,
    progressSnapshot: GoalContextLike['progressSnapshot'] | null,
  ): number | null {
    if (
      progressSnapshot &&
      typeof progressSnapshot.progressPercentage === 'number'
    ) {
      return progressSnapshot.progressPercentage;
    }

    if (
      currentGoal &&
      typeof currentGoal.targetValue === 'number' &&
      typeof progressSnapshot?.currentValue === 'number' &&
      currentGoal.targetValue > 0
    ) {
      return Math.min(
        100,
        Math.round(
          (progressSnapshot.currentValue / currentGoal.targetValue) * 100,
        ),
      );
    }

    return null;
  }

  private readGoalStatus(
    currentGoal: GoalContextLike['currentGoal'] | null,
    goalExpert: ExpertSnapshot | undefined,
  ): string {
    const snapshotStatus = this.readString(goalExpert?.goalStatus);
    if (snapshotStatus) {
      return snapshotStatus;
    }

    const goalStatus = this.readString(
      currentGoal?.status?.value ?? currentGoal?.status,
    );

    return goalStatus || 'UNKNOWN';
  }

  private readExpertSnapshot(value: unknown): ExpertSnapshot | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as ExpertSnapshot;
  }

  private readString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    return '';
  }

  private readObject(value: unknown): Record<string, any> | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return value as Record<string, any>;
  }

  private normalizeWorkoutHistory(
    history: readonly Readonly<Record<string, unknown>>[] | undefined,
  ): readonly WorkoutLog[] {
    if (!history || history.length === 0) {
      return [];
    }

    return history
      .map((entry) => ({
        id: String((entry as { id?: string }).id ?? ''),
        trainingPlanId: String(
          (entry as { trainingPlanId?: string }).trainingPlanId ?? '',
        ),
        workoutDayIndex: Number(
          (entry as { workoutDayIndex?: number }).workoutDayIndex ?? 0,
        ),
        durationMinutes: Number(
          (entry as { durationMinutes?: number }).durationMinutes ?? 0,
        ),
        completedExercises: ((
          entry as { completedExercises?: WorkoutLog['completedExercises'] }
        ).completedExercises ?? []) as WorkoutLog['completedExercises'],
        feedback: (entry as { feedback?: WorkoutLog['feedback'] }).feedback,
        date: String((entry as { date?: string }).date ?? ''),
        createdAt: new Date(
          (entry as { createdAt?: string | Date }).createdAt ?? new Date(),
        ),
        updatedAt: new Date(
          (entry as { createdAt?: string | Date }).createdAt ?? new Date(),
        ),
      }))
      .filter((entry) => Boolean(entry.date));
  }
}
