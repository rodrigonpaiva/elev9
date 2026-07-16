import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  GoalAchievement,
  GoalForecast,
  GoalMilestone,
  GoalProgressSnapshot,
  GetCurrentGoalResponse,
  HabitSnapshot,
  PersonalizationSnapshot,
  RecoverySnapshot,
  TrainingPlanResponse,
} from '@elev9/types';
import { formatGoalType } from '@elev9/ui';

import { apiClient } from '../api/client';
import { useDashboard } from './use-dashboard';
import {
  getCoachConfidenceLabel,
  getCoachFocusLabel,
  getCoachRiskLabel,
  isCoachOptionalEmptyState,
  mapUnifiedCoachInsight,
  type CoachConfidenceLevel,
  type CoachFocus,
  type CoachRiskLevel,
  type CoachUnifiedCoachIntelligence,
} from './coach';

type CurrentGoal = GetCurrentGoalResponse['goal'];
type TrainingPlan = TrainingPlanResponse['trainingPlan'];
type DashboardProgress = ReturnType<typeof useDashboard>['progress']['data'];
type DashboardNutrition = ReturnType<typeof useDashboard>['nutrition']['data'];
type NutritionProgress = NonNullable<DashboardNutrition>['progress'];

export type CoachGoalGuidanceHelpingCard = {
  id: string;
  title: string;
  detail: string;
};

export type CoachGoalGuidanceBarrierCard = {
  id: string;
  title: string;
  detail: string;
};

export type CoachGoalGuidanceMilestone = {
  id: string;
  title: string;
  statusLabel: 'Completed' | 'Upcoming';
  detail: string;
  target: 'workout' | 'nutrition' | 'recovery' | 'progress' | 'history';
  isEnabled: boolean;
};

export type CoachGoalGuidanceAction = {
  id: 'workout' | 'nutrition' | 'conversation' | 'weekly-review' | 'dashboard';
  label: string;
  target:
    | 'workout'
    | 'nutrition'
    | 'conversation'
    | 'weekly-review'
    | 'dashboard';
  isEnabled: boolean;
};

export type CoachGoalGuidanceModel = {
  goalTitle: string;
  subtitle: string;
  currentProgress: string;
  currentFocus: string;
  focus: CoachFocus | null;
  currentRisk: string;
  confidence: string;
  riskLevel: CoachRiskLevel | null;
  confidenceLevel: CoachConfidenceLevel | null;
  supportingEvidenceSummary: string;
  helping: CoachGoalGuidanceHelpingCard[];
  barriers: CoachGoalGuidanceBarrierCard[];
  strategy: string;
  forecast: string;
  milestones: CoachGoalGuidanceMilestone[];
  quickActions: CoachGoalGuidanceAction[];
  accessibilityLabel: string;
  topRecommendation: string;
  evidence: CoachUnifiedCoachIntelligence['evidence'];
};

export type CoachGoalGuidanceResult = {
  model: CoachGoalGuidanceModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  trainingPlanId: string | null;
  workout: TrainingPlan['weeklySchedule'][number] | null;
  refresh: () => Promise<void>;
};

type GoalGuidanceState = {
  currentGoal: CurrentGoal | null;
  goalHistory: GoalProgressSnapshot[];
  forecast: GoalForecast | null;
  milestones: GoalMilestone[];
  achievements: GoalAchievement[];
  recoveryHistory: RecoverySnapshot[];
  habitHistory: HabitSnapshot[];
  personalizationHistory: PersonalizationSnapshot[];
};

const INITIAL_STATE: GoalGuidanceState = {
  currentGoal: null,
  goalHistory: [],
  forecast: null,
  milestones: [],
  achievements: [],
  recoveryHistory: [],
  habitHistory: [],
  personalizationHistory: [],
};

export function useCoachGoalGuidance(): CoachGoalGuidanceResult {
  const dashboard = useDashboard();
  const [state, setState] = useState<GoalGuidanceState>(INITIAL_STATE);
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);
  const [extraError, setExtraError] = useState<string | null>(null);

  const loadExtras = useCallback(async () => {
    setExtraError(null);
    setIsLoadingExtras(true);

    const [
      currentGoalResult,
      goalHistoryResult,
      milestonesResult,
      achievementsResult,
      recoveryHistoryResult,
      habitHistoryResult,
      personalizationHistoryResult,
    ] = await Promise.allSettled([
      apiClient.goals.getCurrentGoal(),
      apiClient.goals.getGoalHistory({ limit: 10 }),
      apiClient.goals.getGoalMilestones(),
      apiClient.goals.getGoalAchievementHistory({ limit: 10 }),
      apiClient.recovery.getRecoveryHistory({ limit: 10 }),
      apiClient.habits.getHabitHistory({ limit: 10 }),
      apiClient.personalization.getPersonalizationHistory({ limit: 10 }),
    ]);
    const firstFailureReason =
      currentGoalResult.status === 'rejected'
        ? currentGoalResult.reason
        : goalHistoryResult.status === 'rejected'
          ? goalHistoryResult.reason
          : milestonesResult.status === 'rejected'
            ? milestonesResult.reason
            : achievementsResult.status === 'rejected'
              ? achievementsResult.reason
              : recoveryHistoryResult.status === 'rejected'
                ? recoveryHistoryResult.reason
                : habitHistoryResult.status === 'rejected'
                  ? habitHistoryResult.reason
                  : personalizationHistoryResult.status === 'rejected'
                    ? personalizationHistoryResult.reason
                    : null;

    if (
      [
        currentGoalResult,
        goalHistoryResult,
        milestonesResult,
        achievementsResult,
        recoveryHistoryResult,
        habitHistoryResult,
        personalizationHistoryResult,
      ].every((result) => result.status === 'rejected') &&
      !isCoachOptionalEmptyState(firstFailureReason, [
        'TRAINING_PLAN_NOT_FOUND',
      ])
    ) {
      setState(INITIAL_STATE);
      setExtraError('Unable to prepare your goal guidance.');
      setIsLoadingExtras(false);
      return;
    }

    setState({
      currentGoal:
        currentGoalResult.status === 'fulfilled'
          ? currentGoalResult.value.goal
          : null,
      goalHistory:
        goalHistoryResult.status === 'fulfilled'
          ? goalHistoryResult.value.goalProgressSnapshots
          : [],
      forecast:
        currentGoalResult.status === 'fulfilled'
          ? currentGoalResult.value.forecast
          : null,
      milestones:
        milestonesResult.status === 'fulfilled'
          ? milestonesResult.value.goalMilestones
          : [],
      achievements:
        achievementsResult.status === 'fulfilled'
          ? achievementsResult.value.goalAchievements
          : [],
      recoveryHistory:
        recoveryHistoryResult.status === 'fulfilled'
          ? recoveryHistoryResult.value.recoverySnapshots
          : [],
      habitHistory:
        habitHistoryResult.status === 'fulfilled'
          ? habitHistoryResult.value.habitSnapshots
          : [],
      personalizationHistory:
        personalizationHistoryResult.status === 'fulfilled'
          ? personalizationHistoryResult.value.personalizationSnapshots
          : [],
    });
    setIsLoadingExtras(false);
  }, []);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  const refresh = useCallback(async () => {
    await Promise.all([dashboard.refresh(), loadExtras()]);
  }, [dashboard.refresh, loadExtras]);

  const model = useMemo(() => {
    if (dashboard.coach.mode === 'error' && !dashboard.coach.intelligence) {
      return null;
    }

    const intelligence = dashboard.coach.intelligence;
    const insight = mapUnifiedCoachInsight({
      intelligence,
      fallbackHeadline: dashboard.coach.data?.headline,
      fallbackSummary: dashboard.coach.data?.summary,
    });

    return buildGoalGuidanceModel({
      ...state,
      intelligence,
      insight,
      coachDecision: dashboard.coach.data,
      progressSummary: dashboard.progress.data,
      recoverySnapshot: dashboard.recovery.data,
      workoutPlan: dashboard.workout.data,
      todayWorkout: dashboard.workout.todaysWorkout,
      nutritionProgress: dashboard.nutrition.data?.progress,
      nutritionFocus: dashboard.nutrition.data?.nutritionFocus,
    });
  }, [
    dashboard.coach.data,
    dashboard.coach.intelligence,
    dashboard.coach.mode,
    dashboard.nutrition.data,
    dashboard.progress.data,
    dashboard.recovery.data,
    dashboard.workout.data,
    dashboard.workout.todaysWorkout,
    state,
  ]);

  const errorMessage =
    dashboard.error ||
    (!state.currentGoal && dashboard.coach.errorMessage
      ? 'Unable to prepare your goal guidance.'
      : null) ||
    extraError;

  const hasSignals =
    Boolean(state.currentGoal) ||
    state.goalHistory.length > 0 ||
    state.milestones.length > 0 ||
    state.achievements.length > 0 ||
    state.recoveryHistory.length > 0 ||
    state.habitHistory.length > 0 ||
    state.personalizationHistory.length > 0 ||
    Boolean(dashboard.progress.data) ||
    Boolean(dashboard.workout.data) ||
    Boolean(dashboard.nutrition.data);

  return {
    model,
    isLoading:
      dashboard.isLoading ||
      dashboard.coach.isLoading ||
      (isLoadingExtras && !model),
    isRefreshing: dashboard.isRefreshing || isLoadingExtras,
    errorMessage,
    isEmpty: !dashboard.isLoading && !errorMessage && !model && !hasSignals,
    trainingPlanId: dashboard.workout.data?.id ?? null,
    workout: dashboard.workout.todaysWorkout,
    refresh,
  };
}

function buildGoalGuidanceModel(
  input: GoalGuidanceState & {
    coachDecision: ReturnType<typeof useDashboard>['coach']['data'];
    intelligence: CoachUnifiedCoachIntelligence | null;
    insight: ReturnType<typeof mapUnifiedCoachInsight>;
    progressSummary: DashboardProgress;
    recoverySnapshot: RecoverySnapshot | null;
    workoutPlan: TrainingPlan | null;
    todayWorkout: TrainingPlan['weeklySchedule'][number] | null;
    nutritionProgress?: NutritionProgress;
    nutritionFocus?: string;
  },
): CoachGoalGuidanceModel | null {
  if (!input.currentGoal) {
    return null;
  }

  const helping = buildHelpingCards(input);
  const barriers = buildBarrierCards(input);
  const milestones = buildMilestones(input);
  const goalTitle = formatGoalType(input.currentGoal.type);
  const currentProgress = buildCurrentProgress(input);
  const strategy = buildStrategy(input, helping, barriers);
  const forecast = buildForecast(input);

  return {
    goalTitle,
    subtitle: "Let's keep moving toward your goal.",
    currentProgress,
    currentFocus: input.insight.currentFocus
      ? getCoachFocusLabel(input.insight.currentFocus)
      : 'Coach',
    focus: input.insight.currentFocus ?? null,
    currentRisk: input.insight.currentRisk
      ? getCoachRiskLabel(input.insight.currentRisk.level)
      : 'No major risk',
    confidence: input.insight.confidence
      ? getCoachConfidenceLabel(input.insight.confidence.level)
      : 'Low confidence',
    riskLevel: input.insight.currentRisk?.level ?? null,
    confidenceLevel: input.insight.confidence?.level ?? null,
    supportingEvidenceSummary: input.insight.supportingEvidenceSummary,
    helping,
    barriers,
    strategy,
    forecast,
    milestones,
    topRecommendation: input.insight.topRecommendation?.title ?? strategy,
    evidence: input.insight.evidence,
    quickActions: [
      {
        id: 'workout',
        label: 'Workout',
        target: 'workout',
        isEnabled: Boolean(input.todayWorkout || input.workoutPlan),
      },
      {
        id: 'nutrition',
        label: 'Nutrition',
        target: 'nutrition',
        isEnabled: true,
      },
      {
        id: 'conversation',
        label: 'Coach Conversation',
        target: 'conversation',
        isEnabled: true,
      },
      {
        id: 'weekly-review',
        label: 'Weekly Review',
        target: 'weekly-review',
        isEnabled: true,
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        target: 'dashboard',
        isEnabled: true,
      },
    ],
    accessibilityLabel: `Goal Guidance. ${currentProgress}. ${input.insight.supportingEvidenceSummary}.`,
  };
}

function buildCurrentProgress(
  input: GoalGuidanceState & {
    currentGoal: CurrentGoal;
    goalHistory: GoalProgressSnapshot[];
    progressSummary: DashboardProgress;
    recoverySnapshot: RecoverySnapshot | null;
  },
): string {
  const progressTrend = input.currentGoal.progressSnapshot.trend;
  const historyTrend = getGoalHistoryTrend(input.goalHistory);
  const recoveryTrend = input.recoverySnapshot?.recoveryTrend;

  if (progressTrend === 'improving' && recoveryTrend === 'improving') {
    return 'You are progressing steadily, and recovery is supporting the goal.';
  }

  if (historyTrend === 'improving') {
    return 'Consistency improved recently and the coach has more room to push progress.';
  }

  if (progressTrend === 'declining') {
    return 'Progress is moving slower than ideal, so the next adjustment matters.';
  }

  return 'You are still on track, with steady habits giving the coach a usable signal.';
}

function getGoalHistoryTrend(
  goalHistory: GoalProgressSnapshot[],
): 'improving' | 'stable' | 'declining' {
  if (goalHistory.length < 2) {
    return 'stable';
  }

  const latest = goalHistory[goalHistory.length - 1]?.progressPercentage ?? 0;
  const earliest = goalHistory[0]?.progressPercentage ?? 0;

  if (latest > earliest) {
    return 'improving';
  }

  if (latest < earliest) {
    return 'declining';
  }

  return 'stable';
}

function buildHelpingCards(
  input: GoalGuidanceState & {
    currentGoal: CurrentGoal;
    progressSummary: DashboardProgress;
    recoverySnapshot: RecoverySnapshot | null;
    nutritionProgress?: NutritionProgress;
    nutritionFocus?: string;
  },
): CoachGoalGuidanceHelpingCard[] {
  const cards: CoachGoalGuidanceHelpingCard[] = [];

  if (input.progressSummary?.currentStreak) {
    cards.push({
      id: 'streak',
      title: 'Training consistency',
      detail:
        'Your recent workout rhythm is giving the goal a stronger signal.',
    });
  }

  if (
    typeof input.nutritionProgress?.adherencePercentage === 'number' &&
    input.nutritionProgress.adherencePercentage >= 75
  ) {
    cards.push({
      id: 'nutrition',
      title: 'Protein and meal follow-through',
      detail: 'Nutrition adherence is helping support your current goal.',
    });
  }

  if (input.recoverySnapshot?.recoveryTrend === 'improving') {
    cards.push({
      id: 'recovery',
      title: 'Recovery improvements',
      detail: 'Better recovery gives the coach room to keep building.',
    });
  }

  if (input.habitHistory.some((habit) => habit.trend === 'improving')) {
    cards.push({
      id: 'habits',
      title: 'Healthy routines',
      detail: 'Your habits are becoming easier to repeat across the week.',
    });
  }

  if (
    input.personalizationHistory.some(
      (snapshot) => snapshot.trend === 'improving',
    )
  ) {
    cards.push({
      id: 'engagement',
      title: 'Coach engagement',
      detail:
        'You are staying responsive to coaching, which improves guidance.',
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'goal',
      title: 'Goal clarity',
      detail: 'The coach has enough context to keep the plan focused.',
    });
  }

  return cards.slice(0, 5);
}

function buildBarrierCards(
  input: GoalGuidanceState & {
    currentGoal: CurrentGoal;
    progressSummary: DashboardProgress;
    recoverySnapshot: RecoverySnapshot | null;
    nutritionProgress?: NutritionProgress;
    nutritionFocus?: string;
  },
): CoachGoalGuidanceBarrierCard[] {
  const cards: CoachGoalGuidanceBarrierCard[] = [];

  if (input.recoverySnapshot && input.recoverySnapshot.readinessScore < 60) {
    cards.push({
      id: 'recovery',
      title: 'Recovery quality',
      detail:
        'Lower readiness suggests the goal should be progressed more carefully.',
    });
  }

  if (
    typeof input.nutritionProgress?.adherencePercentage === 'number' &&
    input.nutritionProgress.adherencePercentage < 70
  ) {
    cards.push({
      id: 'nutrition',
      title: 'Meal consistency',
      detail: 'Irregular nutrition can slow the pace of goal progress.',
    });
  }

  if (
    input.goalHistory.length >= 2 &&
    input.goalHistory[input.goalHistory.length - 1]?.trend === 'declining'
  ) {
    cards.push({
      id: 'progress',
      title: 'Slower trend',
      detail: 'The latest goal snapshots suggest momentum needs a reset.',
    });
  }

  if (
    cards.length === 0 &&
    input.currentGoal.progressSnapshot.trend === 'stable'
  ) {
    cards.push({
      id: 'consistency',
      title: 'Consistency gaps',
      detail:
        'The coach is looking for one more repeatable habit to strengthen progress.',
    });
  }

  return cards.slice(0, 3);
}

function buildStrategy(
  input: GoalGuidanceState & {
    currentGoal: CurrentGoal;
    progressSummary: DashboardProgress;
    recoverySnapshot: RecoverySnapshot | null;
    workoutPlan: TrainingPlan | null;
    todayWorkout: TrainingPlan['weeklySchedule'][number] | null;
    nutritionProgress?: NutritionProgress;
    nutritionFocus?: string;
  },
  helping: CoachGoalGuidanceHelpingCard[],
  barriers: CoachGoalGuidanceBarrierCard[],
): string {
  if (input.currentGoal.progressSnapshot.trend === 'improving') {
    return `Your ${formatGoalType(input.currentGoal.type).toLowerCase()} goal is moving in the right direction. The coach should keep reinforcing what is already working, especially ${helping[0]?.title.toLowerCase() ?? 'your strongest habit'}.`;
  }

  if (barriers[0]) {
    return `The next priority is ${barriers[0].title.toLowerCase()}. Fixing that will make the goal easier to sustain without adding more friction.`;
  }

  if (input.todayWorkout) {
    return `Your training is already consistent. The next opportunity is to keep the goal aligned with today's workout and follow it with the right recovery.`;
  }

  return 'The coach should keep the goal simple, focused and repeatable so momentum is easier to protect.';
}

function buildForecast(
  input: GoalGuidanceState & {
    currentGoal: CurrentGoal;
  },
): string {
  if (input.forecast) {
    if (input.forecast.confidence === 'high') {
      return 'You are moving steadily toward your goal, and the forecast is staying aligned with that momentum.';
    }

    if (input.forecast.confidence === 'medium') {
      return 'Your recent habits suggest continued progress if the current routine stays steady.';
    }

    return 'The forecast is cautious, so consistency is still the strongest predictor of progress.';
  }

  if (input.currentGoal.progressSnapshot.trend === 'improving') {
    return 'You are moving steadily toward your goal.';
  }

  return 'Consistency is your strongest predictor right now.';
}

function buildMilestones(
  input: GoalGuidanceState & {
    currentGoal: CurrentGoal;
  },
): CoachGoalGuidanceMilestone[] {
  const milestones: CoachGoalGuidanceMilestone[] = [];

  const merged: GoalMilestone[] = [
    ...input.milestones,
    ...input.achievements.map((achievement) => ({
      goalId: achievement.goalId,
      type: 'custom' as const,
      title: getAchievementTitle(achievement),
      targetValue: achievement.completionPercentage,
      achieved: true,
      achievedAt: achievement.achievedAt,
    })),
  ];

  merged.forEach((milestone) => {
    const resolved = resolveMilestone(milestone);
    if (resolved) {
      milestones.push(resolved);
    }
  });

  if (milestones.length === 0) {
    milestones.push({
      id: 'goal-progress',
      title: 'Goal progress',
      statusLabel: 'Upcoming',
      detail:
        'The coach will surface milestones once more goal activity is logged.',
      target: 'progress',
      isEnabled: true,
    });
  }

  return milestones.slice(0, 6);
}

function resolveMilestone(
  milestone: GoalMilestone,
): CoachGoalGuidanceMilestone | null {
  const target = getMilestoneTarget(milestone.type);

  return {
    id: `${milestone.goalId}-${milestone.type}-${milestone.title}`,
    title: milestone.title,
    statusLabel: milestone.achieved ? 'Completed' : 'Upcoming',
    detail: milestone.achieved
      ? 'This milestone is already part of your progress story.'
      : 'This milestone is still ahead and can guide the next step.',
    target,
    isEnabled: true,
  };
}

function getMilestoneTarget(
  type: GoalMilestone['type'],
): CoachGoalGuidanceMilestone['target'] {
  switch (type) {
    case 'workout_count':
    case 'streak':
      return 'history';
    case 'adherence':
      return 'nutrition';
    case 'recovery':
      return 'recovery';
    case 'weight_target':
    case 'custom':
    default:
      return 'progress';
  }
}

function getAchievementTitle(achievement: GoalAchievement): string {
  return `Goal achievement ${achievement.completionPercentage >= 100 ? 'reached' : 'in progress'}`;
}

export function trackCoachGoalGuidanceEvent(
  _event:
    | 'coach_goal_guidance_opened'
    | 'coach_goal_strategy_read'
    | 'coach_goal_milestone_selected'
    | 'coach_goal_action_selected',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
