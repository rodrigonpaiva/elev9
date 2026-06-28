import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachDecision,
  GetCurrentGoalResponse,
  HabitSnapshot,
  PersonalizationSnapshot,
} from '@elev9/types';
import { formatGoalType } from '@elev9/ui';

import { apiClient } from '../api/client';
import { useDashboard } from './use-dashboard';

type CurrentGoal = GetCurrentGoalResponse['goal'];

export type CoachInsightSignal = {
  id: string;
  label: string;
  value: string;
};

export type CoachInsightAction = {
  id:
    | 'workout'
    | 'nutrition'
    | 'goals'
    | 'conversation'
    | 'memory'
    | 'dashboard';
  label: string;
  target:
    | 'workout'
    | 'nutrition'
    | 'goals'
    | 'conversation'
    | 'memory'
    | 'dashboard';
  isEnabled: boolean;
};

export type CoachInsightsModel = {
  recommendation: string;
  explanation: string;
  signals: CoachInsightSignal[];
  benefits: string[];
  alternative: string;
  confidence: string;
  actions: CoachInsightAction[];
  accessibilityLabel: string;
};

export type CoachInsightsResult = {
  model: CoachInsightsModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  trainingPlanId: string | null;
  workout: ReturnType<typeof useDashboard>['workout']['todaysWorkout'];
  refresh: () => Promise<void>;
};

export function useCoachInsights(): CoachInsightsResult {
  const dashboard = useDashboard();
  const [currentGoal, setCurrentGoal] = useState<CurrentGoal | null>(null);
  const [habitSnapshot, setHabitSnapshot] = useState<HabitSnapshot | null>(
    null,
  );
  const [personalizationSnapshot, setPersonalizationSnapshot] =
    useState<PersonalizationSnapshot | null>(null);
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);
  const [extraError, setExtraError] = useState<string | null>(null);

  const loadExtras = useCallback(async () => {
    setExtraError(null);
    setIsLoadingExtras(true);

    const [goalResult, habitResult, personalizationResult] =
      await Promise.allSettled([
        apiClient.goals.getCurrentGoal(),
        apiClient.habits.getTodayHabits(),
        apiClient.personalization.getTodayPersonalization(),
      ]);

    if (goalResult.status === 'fulfilled') {
      setCurrentGoal(goalResult.value.goal);
    } else if (isOptionalEmptyState(goalResult.reason)) {
      setCurrentGoal(null);
    }

    if (habitResult.status === 'fulfilled') {
      setHabitSnapshot(habitResult.value.habitSnapshot);
    } else if (isOptionalEmptyState(habitResult.reason)) {
      setHabitSnapshot(null);
    }

    if (personalizationResult.status === 'fulfilled') {
      setPersonalizationSnapshot(
        personalizationResult.value.personalizationSnapshot,
      );
    } else if (isOptionalEmptyState(personalizationResult.reason)) {
      setPersonalizationSnapshot(null);
    }

    if (
      goalResult.status === 'rejected' &&
      habitResult.status === 'rejected' &&
      personalizationResult.status === 'rejected' &&
      !isOptionalEmptyState(goalResult.reason)
    ) {
      setExtraError("Unable to explain today's recommendation.");
    }

    setIsLoadingExtras(false);
  }, []);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  const refresh = useCallback(async () => {
    await Promise.all([dashboard.refresh(), loadExtras()]);
  }, [dashboard.refresh, loadExtras]);

  const model = useMemo(() => {
    if (!dashboard.coach.data) {
      return null;
    }

    return buildInsightsModel({
      coachDecision: dashboard.coach.data,
      currentGoal,
      habitSnapshot,
      personalizationSnapshot,
      recoveryScore: dashboard.recovery.data?.readinessScore,
      hasWorkout: Boolean(dashboard.workout.todaysWorkout),
      nutritionFocus: dashboard.nutrition.data?.nutritionFocus,
      nextMealTitle: dashboard.nutrition.data?.nextMeal?.title,
      workoutsCompleted: dashboard.progress.data?.workoutsCompleted,
    });
  }, [
    currentGoal,
    dashboard.coach.data,
    dashboard.nutrition.data,
    dashboard.progress.data,
    dashboard.recovery.data,
    dashboard.workout.todaysWorkout,
    habitSnapshot,
    personalizationSnapshot,
  ]);

  const errorMessage =
    dashboard.error ||
    (!dashboard.coach.data && dashboard.coach.errorMessage
      ? "Unable to explain today's recommendation."
      : null) ||
    extraError;

  return {
    model,
    isLoading:
      dashboard.isLoading ||
      dashboard.coach.isLoading ||
      (isLoadingExtras && !model),
    isRefreshing: dashboard.isRefreshing || isLoadingExtras,
    errorMessage,
    isEmpty: !dashboard.isLoading && !model && !errorMessage,
    trainingPlanId: dashboard.workout.data?.id ?? null,
    workout: dashboard.workout.todaysWorkout,
    refresh,
  };
}

function buildInsightsModel(input: {
  coachDecision: CoachDecision;
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  personalizationSnapshot: PersonalizationSnapshot | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  nutritionFocus?: string;
  nextMealTitle?: string;
  workoutsCompleted?: number;
}): CoachInsightsModel {
  const recommendation = getRecommendation(input.coachDecision);
  const explanation = getExplanation(input);
  const signals = buildSignals(input);
  const benefits = getBenefits(input.coachDecision.priority);

  return {
    recommendation,
    explanation,
    signals,
    benefits,
    alternative: getAlternative(input.coachDecision.priority, input.hasWorkout),
    confidence: getConfidence(input),
    actions: [
      {
        id: 'workout',
        label: 'Start Workout',
        target: 'workout',
        isEnabled: input.hasWorkout,
      },
      {
        id: 'nutrition',
        label: "Today's Nutrition",
        target: 'nutrition',
        isEnabled: true,
      },
      {
        id: 'goals',
        label: 'Goal Guidance',
        target: 'goals',
        isEnabled: true,
      },
      {
        id: 'conversation',
        label: 'Continue Conversation',
        target: 'conversation',
        isEnabled: true,
      },
      {
        id: 'memory',
        label: 'View Memory',
        target: 'memory',
        isEnabled: true,
      },
      {
        id: 'dashboard',
        label: 'Dashboard',
        target: 'dashboard',
        isEnabled: true,
      },
    ],
    accessibilityLabel: `Coach Insight. ${signals[0]?.value ?? recommendation}. Recommendation: ${recommendation}.`,
  };
}

function getRecommendation(coachDecision: CoachDecision): string {
  if (coachDecision.headline.trim()) {
    return limitText(coachDecision.headline.trim(), 92);
  }

  switch (coachDecision.priority) {
    case 'recovery':
      return "Today's focus is recovery.";
    case 'training':
      return 'Strength training is your highest priority.';
    case 'nutrition':
      return 'Nutrition consistency is your highest priority.';
    case 'consistency':
      return 'Consistency is the main focus today.';
    case 'motivation':
    default:
      return 'Your next small step matters most today.';
  }
}

function getExplanation(input: {
  coachDecision: CoachDecision;
  recoveryScore?: number;
  hasWorkout: boolean;
  nutritionFocus?: string;
  habitSnapshot: HabitSnapshot | null;
}): string {
  const influenceText = input.coachDecision.influences
    .slice(0, 3)
    .map((influence) => influence.label)
    .filter(Boolean);

  if (influenceText.length > 0) {
    return [
      influenceText.join('\n\n'),
      getPriorityRationale(input.coachDecision.priority),
    ].join('\n\n');
  }

  if (input.coachDecision.summary.trim()) {
    return stripRawMetricLanguage(input.coachDecision.summary.trim());
  }

  if (input.recoveryScore !== undefined && input.recoveryScore < 60) {
    return "Recent fatigue suggests lowering today's intensity.\n\nProtecting recovery now helps future performance.";
  }

  if (input.hasWorkout && input.nutritionFocus) {
    return 'Your workout is scheduled and nutrition has a clear focus today.\n\nThat makes follow-through the most useful coaching priority.';
  }

  if (input.habitSnapshot?.trend === 'improving') {
    return 'Your consistency has been improving.\n\nThe coach is recommending a next step that keeps that momentum easy to repeat.';
  }

  return "Today's recommendation is based on your latest training, recovery, nutrition, goal and habit signals.\n\nThe coach is choosing the next step most likely to help you stay consistent.";
}

function buildSignals(input: {
  coachDecision: CoachDecision;
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  nutritionFocus?: string;
  nextMealTitle?: string;
  workoutsCompleted?: number;
}): CoachInsightSignal[] {
  const signals: CoachInsightSignal[] = [];

  if (input.recoveryScore !== undefined) {
    signals.push({
      id: 'recovery',
      label: 'Recovery',
      value: getRecoverySignal(input.recoveryScore),
    });
  }

  if (input.hasWorkout) {
    signals.push({
      id: 'workout',
      label: 'Workout',
      value: 'Scheduled today',
    });
  }

  if (input.nextMealTitle || input.nutritionFocus) {
    signals.push({
      id: 'nutrition',
      label: 'Nutrition',
      value: 'Consistent',
    });
  }

  if (input.currentGoal) {
    signals.push({
      id: 'goal',
      label: 'Goal',
      value: formatGoalType(input.currentGoal.type),
    });
  }

  if (input.habitSnapshot) {
    signals.push({
      id: 'habits',
      label: 'Habits',
      value: getHabitSignal(input.habitSnapshot),
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: 'coach',
      label: 'Coach focus',
      value: getPrioritySignal(input.coachDecision.priority),
    });
  }

  return signals.slice(0, 5);
}

function getBenefits(priority: CoachDecision['priority']): string[] {
  switch (priority) {
    case 'recovery':
      return [
        'Better recovery',
        'Improved workout quality',
        'Reduced injury risk',
      ];
    case 'nutrition':
      return ['Steadier energy', 'Better recovery', 'Higher consistency'];
    case 'training':
      return [
        'Improved workout quality',
        'Stronger progress signal',
        'Higher consistency',
      ];
    case 'consistency':
      return [
        'Higher consistency',
        'Clearer momentum',
        'Easier follow-through',
      ];
    case 'motivation':
    default:
      return ['Clearer next step', 'Higher consistency', 'Less friction today'];
  }
}

function getAlternative(
  priority: CoachDecision['priority'],
  hasWorkout: boolean,
): string {
  switch (priority) {
    case 'recovery':
      return 'Take a short walk, stretch gently, and focus on hydration.';
    case 'nutrition':
      return hasWorkout
        ? "Prioritize nutrition even if you shorten today's workout."
        : 'Anchor the day with one planned meal and steady hydration.';
    case 'training':
      return 'Complete a light recovery session instead if the full workout is not realistic.';
    case 'consistency':
      return 'Choose one small action you can complete today without forcing it.';
    case 'motivation':
    default:
      return 'Start with a short walk or one simple check-in to rebuild momentum.';
  }
}

function getConfidence(input: {
  coachDecision: CoachDecision;
  habitSnapshot: HabitSnapshot | null;
  personalizationSnapshot: PersonalizationSnapshot | null;
}): string {
  if (input.habitSnapshot?.trend === 'improving') {
    return "I'm confident this recommendation matches your recent progress.";
  }

  if (input.personalizationSnapshot?.engagementProfile === 'high') {
    return 'Based on your recent consistency, this is the strongest recommendation today.';
  }

  if (input.coachDecision.influences.length >= 2) {
    return "I'm confident because multiple recent signals point in the same direction.";
  }

  return "This is the clearest recommendation based on today's available coaching signals.";
}

function getPriorityRationale(priority: CoachDecision['priority']): string {
  switch (priority) {
    case 'recovery':
      return 'That is why the coach is prioritizing recovery instead of adding more stress today.';
    case 'nutrition':
      return 'That is why nutrition is the most useful lever for today.';
    case 'training':
      return 'That makes today a good opportunity to follow through on training.';
    case 'consistency':
      return 'That is why the coach is keeping the next step simple and repeatable.';
    case 'motivation':
    default:
      return 'That is why the coach is focusing on a small action that rebuilds momentum.';
  }
}

function getRecoverySignal(score: number): string {
  if (score >= 80) {
    return 'Recovered';
  }

  if (score >= 60) {
    return 'Steady';
  }

  return 'Needs care';
}

function getHabitSignal(habitSnapshot: HabitSnapshot): string {
  switch (habitSnapshot.trend) {
    case 'improving':
      return 'Excellent consistency';
    case 'declining':
      return 'Needs attention';
    case 'stable':
    default:
      return 'Consistent';
  }
}

function getPrioritySignal(priority: CoachDecision['priority']): string {
  switch (priority) {
    case 'recovery':
      return 'Recovery focus';
    case 'nutrition':
      return 'Nutrition focus';
    case 'training':
      return 'Training focus';
    case 'consistency':
      return 'Consistency focus';
    case 'motivation':
    default:
      return 'Momentum focus';
  }
}

function stripRawMetricLanguage(value: string): string {
  return value
    .replace(/\b\d+(\.\d+)?%?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function limitText(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 3).trim()}...`
    : value;
}

function isOptionalEmptyState(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    [
      'USER_PROFILE_NOT_FOUND',
      'GOAL_NOT_FOUND',
      'HABIT_SNAPSHOT_NOT_FOUND',
      'PERSONALIZATION_SNAPSHOT_NOT_FOUND',
      'NOT_FOUND',
    ].includes(error.code)
  );
}

export function trackCoachInsightsEvent(
  _event:
    | 'coach_insight_opened'
    | 'coach_explanation_read'
    | 'coach_alternative_selected'
    | 'coach_recommendation_followed',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
