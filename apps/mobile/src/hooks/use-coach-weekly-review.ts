import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  BehavioralPattern,
  ConsistencySummary,
  GetCurrentGoalResponse,
  GoalProgressSnapshot,
  HabitSnapshot,
  PersonalizationSnapshot,
  ProgressSummaryResponse,
  RecoverySnapshot,
  TrainingPlanResponse,
} from '@elev9/types';
import { formatGoalType } from '@elev9/ui';

import { apiClient } from '../api/client';
import { useDashboard } from './use-dashboard';
import {
  buildCoachIntelligence,
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

type ProgressSummary = ProgressSummaryResponse['summary'];
type TrainingPlan = TrainingPlanResponse['trainingPlan'];
type CurrentGoalResponse = GetCurrentGoalResponse;

export type WeeklyReviewWin = {
  id: string;
  title: string;
  detail: string;
};

export type WeeklyReviewOpportunity = {
  id: string;
  title: string;
  detail: string;
};

export type WeeklyReviewTrend = {
  id: string;
  pattern: string;
  explanation: string;
  whyItMatters: string;
};

export type WeeklyReviewFocus = {
  title: string;
  reason: string;
  ctaLabel: string;
  target: 'training' | 'nutrition' | 'conversation' | 'goals';
};

export type WeeklyReviewAction = {
  id:
    | 'training'
    | 'nutrition'
    | 'conversation'
    | 'goals'
    | 'notifications'
    | 'dashboard';
  label: string;
  target:
    | 'training'
    | 'nutrition'
    | 'conversation'
    | 'goals'
    | 'notifications'
    | 'dashboard';
  isEnabled: boolean;
};

export type CoachWeeklyReviewModel = {
  subtitle: string;
  weekSummary: string;
  currentFocus: string;
  focus: CoachFocus | null;
  currentRisk: string;
  confidence: string;
  riskLevel: CoachRiskLevel | null;
  confidenceLevel: CoachConfidenceLevel | null;
  supportingEvidenceSummary: string;
  wins: WeeklyReviewWin[];
  opportunities: WeeklyReviewOpportunity[];
  trends: WeeklyReviewTrend[];
  reflection: string;
  nextFocus: WeeklyReviewFocus;
  quickActions: WeeklyReviewAction[];
  accessibilityLabel: string;
  topRecommendation: string;
  evidence: CoachUnifiedCoachIntelligence['evidence'];
};

export type CoachWeeklyReviewResult = {
  model: CoachWeeklyReviewModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  trainingPlanId: string | null;
  todaysWorkout: TrainingPlan['weeklySchedule'][number] | null;
  refresh: () => Promise<void>;
};

type WeeklyReviewState = {
  progressSummary: ProgressSummary | null;
  trainingPlan: TrainingPlan | null;
  recoveryHistory: RecoverySnapshot[];
  currentGoal: CurrentGoalResponse | null;
  goalHistory: GoalProgressSnapshot[];
  habitHistory: HabitSnapshot[];
  consistencySummary: ConsistencySummary | null;
  personalizationHistory: PersonalizationSnapshot[];
  behavioralPatterns: BehavioralPattern[];
};

const INITIAL_STATE: WeeklyReviewState = {
  progressSummary: null,
  trainingPlan: null,
  recoveryHistory: [],
  currentGoal: null,
  goalHistory: [],
  habitHistory: [],
  consistencySummary: null,
  personalizationHistory: [],
  behavioralPatterns: [],
};

export function useCoachWeeklyReview(): CoachWeeklyReviewResult {
  const dashboard = useDashboard();
  const [state, setState] = useState<WeeklyReviewState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage(null);

    const [
      progressResult,
      trainingResult,
      recoveryResult,
      currentGoalResult,
      goalHistoryResult,
      habitHistoryResult,
      consistencyResult,
      personalizationResult,
      patternsResult,
    ] = await Promise.allSettled([
      apiClient.progress.getSummary('week'),
      apiClient.training.getCurrentPlan(),
      apiClient.recovery.getRecoveryHistory({ limit: 7 }),
      apiClient.goals.getCurrentGoal(),
      apiClient.goals.getGoalHistory({ limit: 7 }),
      apiClient.habits.getHabitHistory({ limit: 7 }),
      apiClient.habits.getConsistencySummary(),
      apiClient.personalization.getPersonalizationHistory({ limit: 7 }),
      apiClient.personalization.getBehavioralPatterns(),
    ]);

    const results = [
      progressResult,
      trainingResult,
      recoveryResult,
      currentGoalResult,
      goalHistoryResult,
      habitHistoryResult,
      consistencyResult,
      personalizationResult,
      patternsResult,
    ];

    if (
      results.every((result) => result.status === 'rejected') &&
      !isCoachOptionalEmptyState(progressResult.reason, [
        'TRAINING_PLAN_NOT_FOUND',
      ])
    ) {
      setState(INITIAL_STATE);
      setErrorMessage('Unable to prepare your weekly review.');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setState({
      progressSummary:
        progressResult.status === 'fulfilled'
          ? progressResult.value.summary
          : null,
      trainingPlan:
        trainingResult.status === 'fulfilled'
          ? trainingResult.value.trainingPlan
          : null,
      recoveryHistory:
        recoveryResult.status === 'fulfilled'
          ? recoveryResult.value.recoverySnapshots
          : [],
      currentGoal:
        currentGoalResult.status === 'fulfilled'
          ? currentGoalResult.value
          : null,
      goalHistory:
        goalHistoryResult.status === 'fulfilled'
          ? goalHistoryResult.value.goalProgressSnapshots
          : [],
      habitHistory:
        habitHistoryResult.status === 'fulfilled'
          ? habitHistoryResult.value.habitSnapshots
          : [],
      consistencySummary:
        consistencyResult.status === 'fulfilled'
          ? consistencyResult.value.consistencySummary
          : null,
      personalizationHistory:
        personalizationResult.status === 'fulfilled'
          ? personalizationResult.value.personalizationSnapshots
          : [],
      behavioralPatterns:
        patternsResult.status === 'fulfilled'
          ? patternsResult.value.behavioralPatterns
          : [],
    });
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const model = useMemo(() => {
    const intelligence =
      buildCoachIntelligence({
        coachDecision: dashboard.coach.data,
        currentGoal: state.currentGoal?.goal ?? null,
        goalProgressSnapshot: state.goalHistory.at(-1) ?? undefined,
        habitSnapshot: state.habitHistory.at(-1) ?? undefined,
        consistencySummary: state.consistencySummary,
        personalizationSnapshot:
          state.personalizationHistory.at(-1) ?? undefined,
        recoverySnapshot: state.recoveryHistory.at(-1) ?? undefined,
        progressSummary: state.progressSummary,
        workout: getTodayWorkout(state.trainingPlan),
      }) ?? null;
    const insight = mapUnifiedCoachInsight({
      intelligence,
      fallbackHeadline: state.currentGoal
        ? formatGoalType(state.currentGoal.goal.type)
        : 'Weekly review',
      fallbackSummary: state.consistencySummary
        ? `Consistency score ${state.consistencySummary.score}.`
        : undefined,
    });

    return buildWeeklyReviewModel(state, intelligence, insight);
  }, [dashboard.coach.data, state]);
  const hasSignals =
    Boolean(state.progressSummary) ||
    Boolean(state.trainingPlan) ||
    state.recoveryHistory.length > 0 ||
    Boolean(state.currentGoal) ||
    state.goalHistory.length > 0 ||
    state.habitHistory.length > 0 ||
    Boolean(state.consistencySummary) ||
    state.personalizationHistory.length > 0 ||
    state.behavioralPatterns.length > 0;

  return {
    model,
    isLoading,
    isRefreshing,
    errorMessage,
    isEmpty: !isLoading && !errorMessage && !model && !hasSignals,
    trainingPlanId: state.trainingPlan?.id ?? null,
    todaysWorkout: getTodayWorkout(state.trainingPlan),
    refresh: async () => {
      await dashboard.refresh();
      await load({ refresh: true });
    },
  };
}

function buildWeeklyReviewModel(
  state: WeeklyReviewState,
  intelligence: CoachUnifiedCoachIntelligence | null,
  insight: ReturnType<typeof mapUnifiedCoachInsight>,
): CoachWeeklyReviewModel | null {
  const wins = buildWins(state);
  const opportunities = buildOpportunities(state);
  const trends = buildTrends(state);

  if (wins.length === 0 && opportunities.length === 0 && trends.length === 0) {
    return null;
  }

  const nextFocus = buildNextFocus(state, opportunities);
  const weekSummary = buildWeekSummary(state, wins, opportunities);
  const reflection = buildReflection({
    wins,
    opportunities,
    trends,
    nextFocus,
  });

  return {
    subtitle: "Here's what we achieved together.",
    currentFocus: insight.currentFocus
      ? getCoachFocusLabel(insight.currentFocus)
      : 'Coach',
    focus: insight.currentFocus ?? null,
    currentRisk: insight.currentRisk
      ? getCoachRiskLabel(insight.currentRisk.level)
      : 'No major risk',
    confidence: insight.confidence
      ? getCoachConfidenceLabel(insight.confidence.level)
      : 'Low confidence',
    riskLevel: insight.currentRisk?.level ?? null,
    confidenceLevel: insight.confidence?.level ?? null,
    supportingEvidenceSummary: insight.supportingEvidenceSummary,
    weekSummary,
    wins,
    opportunities,
    trends,
    reflection,
    nextFocus,
    topRecommendation: insight.topRecommendation?.title ?? weekSummary,
    evidence: insight.evidence,
    quickActions: [
      {
        id: 'training',
        label: 'Training',
        target: 'training',
        isEnabled: Boolean(state.trainingPlan),
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
        id: 'goals',
        label: 'Goal Guidance',
        target: 'goals',
        isEnabled: true,
      },
      {
        id: 'notifications',
        label: 'Next Week Reminders',
        target: 'notifications',
        isEnabled: true,
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        target: 'dashboard',
        isEnabled: true,
      },
    ],
    accessibilityLabel: `Weekly Review. ${insight.headline}. ${insight.supportingEvidenceSummary}.`,
  };
}

function buildWins(state: WeeklyReviewState): WeeklyReviewWin[] {
  const wins: WeeklyReviewWin[] = [];

  if (state.progressSummary?.workoutsCompleted) {
    const planned = state.trainingPlan?.weeklySchedule.length ?? 0;
    wins.push({
      id: 'workouts',
      title:
        planned > 0 && state.progressSummary.workoutsCompleted >= planned
          ? 'Completed all planned workouts.'
          : `Completed ${state.progressSummary.workoutsCompleted} workouts.`,
      detail: 'You created a clear training signal this week.',
    });
  }

  if ((state.progressSummary?.currentStreak ?? 0) >= 3) {
    wins.push({
      id: 'streak',
      title: `Built a ${state.progressSummary?.currentStreak}-day streak.`,
      detail: 'Repeated action is becoming easier to trust.',
    });
  }

  if (getRecoveryTrend(state.recoveryHistory) === 'improving') {
    wins.push({
      id: 'recovery',
      title: 'Recovery improved.',
      detail: 'Your body is responding better to the week.',
    });
  }

  if (state.consistencySummary?.trend === 'improving') {
    wins.push({
      id: 'consistency',
      title: 'Consistency improved.',
      detail: 'Your habits are moving in the right direction.',
    });
  }

  if (state.currentGoal?.progressSnapshot.trend === 'improving') {
    wins.push({
      id: 'goal',
      title: `${formatGoalType(state.currentGoal.goal.type)} progress improved.`,
      detail: 'Your goal signal strengthened this week.',
    });
  }

  if (
    wins.length < 3 &&
    state.personalizationHistory.some(
      (snapshot) => snapshot.trend === 'improving',
    )
  ) {
    wins.push({
      id: 'engagement',
      title: 'You stayed engaged with your coaching.',
      detail: 'That gives the coach better context for next week.',
    });
  }

  return wins.slice(0, 5);
}

function buildOpportunities(
  state: WeeklyReviewState,
): WeeklyReviewOpportunity[] {
  const opportunities: WeeklyReviewOpportunity[] = [];
  const recoveryTrend = getRecoveryTrend(state.recoveryHistory);

  if (recoveryTrend === 'declining') {
    opportunities.push({
      id: 'recovery',
      title: 'Recovery needs a little more protection.',
      detail:
        'A steadier sleep and recovery rhythm can improve training quality.',
    });
  }

  if (state.consistencySummary?.trend === 'declining') {
    opportunities.push({
      id: 'consistency',
      title: 'Consistency can be easier next week.',
      detail:
        'Pick one repeatable action instead of trying to fix everything at once.',
    });
  }

  if (state.currentGoal?.progressSnapshot.trend === 'declining') {
    opportunities.push({
      id: 'goal',
      title: 'Goal progress needs attention.',
      detail:
        'Small adjustments to training or nutrition can bring the trend back.',
    });
  }

  if ((state.progressSummary?.workoutsCompleted ?? 0) === 0) {
    opportunities.push({
      id: 'training',
      title: 'Training rhythm can restart gently.',
      detail: 'A short first session is enough to rebuild momentum.',
    });
  }

  if (opportunities.length === 0) {
    opportunities.push({
      id: 'nutrition',
      title: 'Keep nutrition steady around training.',
      detail: 'Post-workout meals are a simple way to support recovery.',
    });
  }

  return opportunities.slice(0, 3);
}

function buildTrends(state: WeeklyReviewState): WeeklyReviewTrend[] {
  const trends: WeeklyReviewTrend[] = [];
  const recoveryTrend = getRecoveryTrend(state.recoveryHistory);

  if (recoveryTrend !== 'stable') {
    trends.push({
      id: 'recovery',
      pattern:
        recoveryTrend === 'improving'
          ? 'Recovery improved across the week.'
          : 'Recovery softened across the week.',
      explanation:
        recoveryTrend === 'improving'
          ? 'Your recent check-ins suggest your body handled the workload better.'
          : 'Your recent recovery signals suggest the week carried more fatigue.',
      whyItMatters:
        recoveryTrend === 'improving'
          ? 'This can support stronger sessions next week.'
          : 'Protecting recovery now helps future performance.',
    });
  }

  if (state.consistencySummary) {
    trends.push({
      id: 'consistency',
      pattern: getConsistencyPattern(state.consistencySummary),
      explanation: getConsistencyExplanation(state.consistencySummary),
      whyItMatters: 'Consistency makes progress easier to repeat.',
    });
  }

  const pattern = state.behavioralPatterns[0];

  if (pattern) {
    trends.push({
      id: 'behavior',
      pattern: getBehaviorPatternLabel(pattern),
      explanation:
        'Your coaching history shows this pattern is becoming meaningful.',
      whyItMatters: 'The coach can use this to personalize next week.',
    });
  }

  return trends.slice(0, 3);
}

function buildNextFocus(
  state: WeeklyReviewState,
  opportunities: WeeklyReviewOpportunity[],
): WeeklyReviewFocus {
  const firstOpportunity = opportunities[0];

  if (firstOpportunity?.id === 'recovery') {
    return {
      title: 'Recovery',
      reason:
        'This is the highest-leverage focus for better training quality next week.',
      ctaLabel: 'Continue Coaching',
      target: 'conversation',
    };
  }

  if (firstOpportunity?.id === 'nutrition') {
    return {
      title: 'Nutrition consistency',
      reason: 'Steady meals around training can improve energy and recovery.',
      ctaLabel: 'Prepare Next Week',
      target: 'nutrition',
    };
  }

  if (
    state.trainingPlan &&
    (state.progressSummary?.workoutsCompleted ?? 0) > 0
  ) {
    return {
      title: 'Progressive overload',
      reason:
        'You have enough training momentum to review the next step carefully.',
      ctaLabel: 'Review Training Plan',
      target: 'training',
    };
  }

  if (state.currentGoal) {
    return {
      title: formatGoalType(state.currentGoal.goal.type),
      reason:
        'Keeping the next week tied to your goal will make the plan clearer.',
      ctaLabel: 'Continue Coaching',
      target: 'conversation',
    };
  }

  return {
    title: 'Consistency',
    reason: 'A simple repeatable week is the best next step.',
    ctaLabel: 'Continue Coaching',
    target: 'conversation',
  };
}

function buildWeekSummary(
  state: WeeklyReviewState,
  wins: WeeklyReviewWin[],
  opportunities: WeeklyReviewOpportunity[],
): string {
  if (
    state.consistencySummary?.trend === 'improving' &&
    getRecoveryTrend(state.recoveryHistory) === 'improving'
  ) {
    return 'Recovery improved while your consistency also moved in the right direction.';
  }

  if ((state.progressSummary?.workoutsCompleted ?? 0) > 0 && wins.length >= 3) {
    return 'You maintained meaningful consistency and gave your coach useful progress signals.';
  }

  if (opportunities.some((item) => item.id === 'recovery')) {
    return 'This week showed solid effort, with recovery now deserving more attention.';
  }

  if (state.currentGoal?.progressSnapshot.trend === 'improving') {
    return 'Your goal progress improved because the week had enough consistent action.';
  }

  return 'This week created useful coaching context and a clearer focus for what comes next.';
}

function buildReflection(input: {
  wins: WeeklyReviewWin[];
  opportunities: WeeklyReviewOpportunity[];
  trends: WeeklyReviewTrend[];
  nextFocus: WeeklyReviewFocus;
}): string {
  const firstWin = input.wins[0]?.title ?? 'You kept building useful momentum.';
  const firstTrend =
    input.trends[0]?.pattern ??
    'The week gave your coach a clearer view of your rhythm.';
  const firstOpportunity =
    input.opportunities[0]?.title ?? 'The next step is staying consistent.';

  return `${firstWin}\n\n${firstTrend}\n\n${firstOpportunity}\n\nLet's build next week around ${input.nextFocus.title.toLowerCase()}.`;
}

function getTodayWorkout(
  trainingPlan: TrainingPlan | null,
): TrainingPlan['weeklySchedule'][number] | null {
  if (!trainingPlan) {
    return null;
  }

  const today = new Date().getDay();
  const dayIndex = today === 0 ? 6 : today - 1;

  return (
    trainingPlan.weeklySchedule.find(
      (workout) => workout.dayIndex === dayIndex,
    ) ??
    trainingPlan.weeklySchedule[0] ??
    null
  );
}

function getRecoveryTrend(
  history: RecoverySnapshot[],
): 'improving' | 'stable' | 'declining' {
  if (history.length === 0) {
    return 'stable';
  }

  const improving = history.filter(
    (snapshot) => snapshot.recoveryTrend === 'improving',
  ).length;
  const declining = history.filter(
    (snapshot) => snapshot.recoveryTrend === 'declining',
  ).length;

  if (improving > declining) {
    return 'improving';
  }

  if (declining > improving) {
    return 'declining';
  }

  return 'stable';
}

function getConsistencyPattern(summary: ConsistencySummary): string {
  switch (summary.trend) {
    case 'improving':
      return 'Your consistency strengthened this week.';
    case 'declining':
      return 'Your consistency became harder to maintain.';
    case 'stable':
    default:
      return 'Your consistency stayed steady.';
  }
}

function getConsistencyExplanation(summary: ConsistencySummary): string {
  if (summary.currentStreak >= 3) {
    return `You held a ${summary.currentStreak}-day streak, which shows repeatable follow-through.`;
  }

  if (summary.riskLevel === 'high') {
    return 'The week suggests your routine needs fewer points of friction.';
  }

  return 'Your habits gave the coach a useful view of what is repeatable.';
}

function getBehaviorPatternLabel(pattern: BehavioralPattern): string {
  switch (pattern.type) {
    case 'morning_engagement':
      return 'You respond well earlier in the day.';
    case 'evening_engagement':
      return 'You engage more consistently later in the day.';
    case 'responds_to_recovery_guidance':
      return 'Recovery guidance appears useful for you.';
    case 'responds_to_goals':
      return 'Goal-focused coaching helps you stay engaged.';
    case 'responds_to_streaks':
      return 'Streaks help reinforce your routine.';
    case 'consistent_check_in_behavior':
      return 'Check-ins are becoming part of your rhythm.';
    case 'responds_to_notifications':
      return 'Timely reminders help you follow through.';
    case 'ignores_low_priority_reminders':
      return 'Only important reminders deserve your attention.';
    case 'high_dismissal_behavior':
      return 'Lower-friction coaching will likely work better for you.';
    default:
      return 'Your coaching pattern became clearer this week.';
  }
}

export function trackCoachWeeklyReviewEvent(
  _event:
    | 'coach_weekly_review_opened'
    | 'coach_weekly_review_cta_selected'
    | 'coach_weekly_win_opened'
    | 'coach_next_week_focus_selected',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
