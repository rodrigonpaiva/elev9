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

export type DailyBriefingPriority = {
  id: string;
  title: string;
  reason: string;
  benefit: string;
};

export type DailyBriefingReadinessItem = {
  id: string;
  label: string;
  value: string;
};

export type DailyBriefingScheduleItem = {
  id: string;
  label: string;
  detail: string;
};

export type DailyBriefingPrimaryAction = {
  label: string;
  target: 'workout' | 'nutrition' | 'recovery' | 'conversation';
  isEnabled: boolean;
};

export type CoachDailyBriefingModel = {
  greeting: string;
  subtitle: string;
  summary: string;
  interpretation: string;
  priorities: DailyBriefingPriority[];
  readiness: DailyBriefingReadinessItem[];
  schedule: DailyBriefingScheduleItem[];
  motivation: string;
  primaryAction: DailyBriefingPrimaryAction;
  accessibilityLabel: string;
};

export type CoachDailyBriefingResult = {
  model: CoachDailyBriefingModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  trainingPlanId: string | null;
  workout: ReturnType<typeof useDashboard>['workout']['todaysWorkout'];
  refresh: () => Promise<void>;
};

const USER_NAME = 'Rodrigo';

export function useCoachDailyBriefing(): CoachDailyBriefingResult {
  const dashboard = useDashboard();
  const [currentGoal, setCurrentGoal] = useState<CurrentGoal | null>(null);
  const [habitSnapshot, setHabitSnapshot] = useState<HabitSnapshot | null>(null);
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
      setExtraError("Unable to prepare today's briefing.");
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

    return buildDailyBriefingModel({
      coachDecision: dashboard.coach.data,
      currentGoal,
      habitSnapshot,
      personalizationSnapshot,
      recoveryScore: dashboard.recovery.data?.readinessScore,
      hasWorkout: Boolean(dashboard.workout.todaysWorkout),
      workoutTitle: dashboard.workout.todaysWorkout?.title,
      workoutFocus: dashboard.workout.todaysWorkout?.focus,
      nextMealTitle: dashboard.nutrition.data?.nextMeal?.title,
      nutritionFocus: dashboard.nutrition.data?.nutritionFocus,
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

  const hasCoreData =
    Boolean(dashboard.coach.data) ||
    Boolean(dashboard.recovery.data) ||
    Boolean(dashboard.workout.data) ||
    Boolean(dashboard.nutrition.data);
  const errorMessage =
    dashboard.error ||
    (!dashboard.coach.data && dashboard.coach.errorMessage
      ? "Unable to prepare today's briefing."
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
    isEmpty: !dashboard.isLoading && !model && !errorMessage && !hasCoreData,
    trainingPlanId: dashboard.workout.data?.id ?? null,
    workout: dashboard.workout.todaysWorkout,
    refresh,
  };
}

function buildDailyBriefingModel(input: {
  coachDecision: CoachDecision;
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  personalizationSnapshot: PersonalizationSnapshot | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  workoutTitle?: string;
  workoutFocus?: string;
  nextMealTitle?: string;
  nutritionFocus?: string;
  workoutsCompleted?: number;
}): CoachDailyBriefingModel {
  const priorities = buildPriorities(input.coachDecision);
  const summary = getSummary(input);

  return {
    greeting: `${getGreeting()}, ${USER_NAME}.`,
    subtitle: getSubtitle(input.personalizationSnapshot),
    summary,
    interpretation: getInterpretation(input),
    priorities,
    readiness: buildReadiness(input),
    schedule: buildSchedule(input),
    motivation: getMotivation(input),
    primaryAction: getPrimaryAction(input),
    accessibilityLabel: `Daily briefing. ${summary}. ${priorities.length} priorities available today.`,
  };
}

function buildPriorities(coachDecision: CoachDecision): DailyBriefingPriority[] {
  const items =
    coachDecision.actionItems.length > 0
      ? coachDecision.actionItems
      : [getFallbackPriority(coachDecision.priority)];

  return items
    .filter((item) => item.trim().length > 0)
    .slice(0, 3)
    .map((item, index) => ({
      id: `${coachDecision.id}-${index}`,
      title: normalizeSentence(item),
      reason: getPriorityReason(coachDecision, index),
      benefit: getExpectedBenefit(coachDecision.priority),
    }));
}

function buildReadiness(input: {
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  nextMealTitle?: string;
  nutritionFocus?: string;
  coachDecision: CoachDecision;
}): DailyBriefingReadinessItem[] {
  return [
    {
      id: 'recovery',
      label: 'Recovery',
      value: getRecoveryLabel(input.recoveryScore),
    },
    {
      id: 'training',
      label: 'Training',
      value: input.hasWorkout ? 'Workout planned' : 'Rest day',
    },
    {
      id: 'nutrition',
      label: 'Nutrition',
      value: input.nextMealTitle || input.nutritionFocus ? 'On track' : 'Plan ready',
    },
    {
      id: 'habits',
      label: 'Habits',
      value: getHabitLabel(input.habitSnapshot),
    },
    {
      id: 'goal',
      label: 'Goal',
      value: input.currentGoal
        ? formatGoalType(input.currentGoal.type)
        : getPriorityGoalLabel(input.coachDecision.priority),
    },
  ];
}

function buildSchedule(input: {
  hasWorkout: boolean;
  workoutTitle?: string;
  workoutFocus?: string;
  nextMealTitle?: string;
  recoveryScore?: number;
}): DailyBriefingScheduleItem[] {
  const schedule: DailyBriefingScheduleItem[] = [];

  if (input.hasWorkout) {
    schedule.push({
      id: 'workout',
      label: 'Workout',
      detail: input.workoutTitle || input.workoutFocus || 'Planned today',
    });
  }

  if (input.nextMealTitle) {
    schedule.push({
      id: 'nutrition',
      label: 'Nutrition',
      detail: input.nextMealTitle,
    });
  }

  if (input.recoveryScore !== undefined && input.recoveryScore < 70) {
    schedule.push({
      id: 'recovery',
      label: 'Recovery',
      detail: 'Stretch after training',
    });
  }

  return schedule.slice(0, 3);
}

function getSummary(input: {
  coachDecision: CoachDecision;
  recoveryScore?: number;
  hasWorkout: boolean;
}): string {
  if (input.coachDecision.headline.trim()) {
    return limitLines(input.coachDecision.headline.trim());
  }

  if (input.recoveryScore !== undefined && input.recoveryScore >= 75) {
    return input.hasWorkout
      ? "You're ready for a productive training day."
      : "You're ready for a steady day.";
  }

  if (input.recoveryScore !== undefined && input.recoveryScore < 60) {
    return 'Recovery deserves attention today.';
  }

  return 'Focus on consistency today.';
}

function getInterpretation(input: {
  coachDecision: CoachDecision;
  recoveryScore?: number;
  hasWorkout: boolean;
  nutritionFocus?: string;
  workoutsCompleted?: number;
  habitSnapshot: HabitSnapshot | null;
}): string {
  const summary = input.coachDecision.summary.trim();

  if (summary.length > 0) {
    return stripRawMetricLanguage(summary);
  }

  if (input.habitSnapshot?.trend === 'improving') {
    return input.hasWorkout
      ? 'Your recent consistency is improving, which makes today a good opportunity to complete the planned session with intent.'
      : 'Your recent consistency is improving. Keep the day simple and protect the habits that are working.';
  }

  if (input.recoveryScore !== undefined && input.recoveryScore < 60) {
    return 'Your recovery signals suggest keeping today controlled. The goal is to leave your body better prepared for the next session.';
  }

  if (input.nutritionFocus) {
    return 'Your nutrition plan gives today a clear structure. Keep meals steady so training and recovery stay supported.';
  }

  return "Your coach has reviewed today's training, recovery, nutrition, and progress signals. The best next step is to keep momentum simple and repeatable.";
}

function getPrimaryAction(input: {
  hasWorkout: boolean;
  nextMealTitle?: string;
  recoveryScore?: number;
}): DailyBriefingPrimaryAction {
  if (input.hasWorkout) {
    return {
      label: "View Today's Workout",
      target: 'workout',
      isEnabled: true,
    };
  }

  if (input.nextMealTitle) {
    return {
      label: 'View Nutrition',
      target: 'nutrition',
      isEnabled: true,
    };
  }

  if (input.recoveryScore !== undefined && input.recoveryScore < 70) {
    return {
      label: 'Review Recovery',
      target: 'recovery',
      isEnabled: true,
    };
  }

  return {
    label: 'Open Coach Conversation',
    target: 'conversation',
    isEnabled: true,
  };
}

function getSubtitle(personalization: PersonalizationSnapshot | null): string {
  if (personalization?.sourceContext.activityHourDistribution?.morning) {
    return "Here's today's coaching briefing.";
  }

  return "Let's make today count.";
}

function getMotivation(input: {
  habitSnapshot: HabitSnapshot | null;
  personalizationSnapshot: PersonalizationSnapshot | null;
}): string {
  if (input.habitSnapshot && input.habitSnapshot.streakDays >= 3) {
    return "You've been building great momentum.";
  }

  if (input.personalizationSnapshot?.preferredCoachingStyle === 'direct') {
    return 'Do the next useful thing well.';
  }

  return 'Consistency beats perfection.';
}

function getPriorityReason(coachDecision: CoachDecision, index: number): string {
  const influence = coachDecision.influences[index] ?? coachDecision.influences[0];

  return influence?.label || coachDecision.summary || "This supports today's coaching focus.";
}

function getExpectedBenefit(priority: CoachDecision['priority']): string {
  switch (priority) {
    case 'recovery':
      return 'Better readiness tomorrow.';
    case 'nutrition':
      return 'More consistent energy today.';
    case 'training':
      return 'A stronger training signal.';
    case 'consistency':
      return 'Keeps your momentum intact.';
    case 'motivation':
    default:
      return 'A clearer next step.';
  }
}

function getFallbackPriority(priority: CoachDecision['priority']): string {
  switch (priority) {
    case 'recovery':
      return 'Protect recovery today.';
    case 'nutrition':
      return 'Prioritize protein after training.';
    case 'training':
      return "Complete today's workout.";
    case 'consistency':
      return 'Complete one planned action today.';
    case 'motivation':
    default:
      return 'Take the next small step.';
  }
}

function getRecoveryLabel(score?: number): string {
  if (score === undefined || score >= 80) {
    return 'Ready';
  }

  if (score >= 60) {
    return 'Steady';
  }

  return 'Recovery focus';
}

function getHabitLabel(habitSnapshot: HabitSnapshot | null): string {
  if (!habitSnapshot) {
    return 'Consistent';
  }

  switch (habitSnapshot.trend) {
    case 'improving':
      return 'Improving';
    case 'declining':
      return 'Needs attention';
    case 'stable':
    default:
      return 'Consistent';
  }
}

function getPriorityGoalLabel(priority: CoachDecision['priority']): string {
  switch (priority) {
    case 'recovery':
      return 'Improve recovery';
    case 'nutrition':
      return 'Nutrition consistency';
    case 'training':
      return 'Training progress';
    case 'consistency':
      return 'Improve consistency';
    case 'motivation':
    default:
      return 'Personal progress';
  }
}

function normalizeSentence(value: string): string {
  const trimmed = value.trim();

  if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function stripRawMetricLanguage(value: string): string {
  return value.replace(/\b\d+(\.\d+)?%?\b/g, '').replace(/\s{2,}/g, ' ').trim();
}

function limitLines(value: string): string {
  const sentence = value.split(/\n+/).filter(Boolean).slice(0, 2).join(' ');

  return sentence.length > 96 ? `${sentence.slice(0, 93).trim()}...` : sentence;
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
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

export function trackCoachDailyBriefingEvent(
  _event:
    | 'coach_daily_briefing_opened'
    | 'coach_daily_briefing_action_selected'
    | 'coach_daily_briefing_refreshed',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
