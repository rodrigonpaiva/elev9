import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachChatHistoryMessage,
  CoachDecision,
  GetCurrentGoalResponse,
} from '@elev9/types';
import { formatGoalType } from '@elev9/ui';

import { apiClient } from '../api/client';
import { useDashboard } from './use-dashboard';

type CurrentGoal = GetCurrentGoalResponse['goal'];

export type CoachHomeContextItem = {
  id: string;
  label: string;
  value: string;
};

export type CoachHomePriority = {
  id: string;
  title: string;
  reason: string;
  benefit: string;
};

export type CoachHomeAction = {
  id:
    | 'ask'
    | 'insight'
    | 'goals'
    | 'briefing'
    | 'notifications'
    | 'weekly-review'
    | 'memory'
    | 'conversation'
    | 'workout'
    | 'nutrition'
    | 'recovery';
  label: string;
  target:
    | 'ask'
    | 'insight'
    | 'goals'
    | 'briefing'
    | 'notifications'
    | 'weekly-review'
    | 'memory'
    | 'conversation'
    | 'workout'
    | 'nutrition'
    | 'recovery';
  isPrimary: boolean;
  isEnabled: boolean;
};

export type CoachHomeModel = {
  greeting: string;
  subtitle: string;
  mainInsight: string;
  insightSummary: string;
  contextItems: CoachHomeContextItem[];
  priorities: CoachHomePriority[];
  actions: CoachHomeAction[];
  latestMessage: CoachChatHistoryMessage | null;
  statusText: string;
  statusDetail: string;
  accessibilityLabel: string;
};

export type CoachHomeResult = {
  model: CoachHomeModel | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  trainingPlanId: string | null;
  workout: ReturnType<typeof useDashboard>['workout']['todaysWorkout'];
  refresh: () => Promise<void>;
};

const USER_NAME = 'Rodrigo';

export function useCoachHome(): CoachHomeResult {
  const dashboard = useDashboard();
  const [latestMessage, setLatestMessage] =
    useState<CoachChatHistoryMessage | null>(null);
  const [currentGoal, setCurrentGoal] = useState<CurrentGoal | null>(null);
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);
  const [extraError, setExtraError] = useState<string | null>(null);

  const loadExtras = useCallback(async () => {
    setExtraError(null);
    setIsLoadingExtras(true);

    const [chatResult, goalResult] = await Promise.allSettled([
      apiClient.ai.getChatHistory({ limit: 6 }),
      apiClient.goals.getCurrentGoal(),
    ]);

    if (chatResult.status === 'fulfilled') {
      setLatestMessage(resolveLatestAssistantMessage(chatResult.value));
    } else if (!isOptionalEmptyState(chatResult.reason)) {
      setExtraError("Unable to load today's coaching.");
    }

    if (goalResult.status === 'fulfilled') {
      setCurrentGoal(goalResult.value.goal);
    } else if (isOptionalEmptyState(goalResult.reason)) {
      setCurrentGoal(null);
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

    return buildCoachHomeModel({
      coachDecision: dashboard.coach.data,
      latestMessage,
      currentGoal,
      recoveryScore: dashboard.recovery.data?.readinessScore,
      hasWorkout: Boolean(dashboard.workout.todaysWorkout),
      mealsRemaining: getMealsRemaining(dashboard.nutrition.data?.meals.length),
      nutritionFocus: dashboard.nutrition.data?.nutritionFocus,
    });
  }, [
    currentGoal,
    dashboard.coach.data,
    dashboard.nutrition.data,
    dashboard.recovery.data,
    dashboard.workout.todaysWorkout,
    latestMessage,
  ]);

  const hasCoreData =
    Boolean(dashboard.coach.data) ||
    Boolean(dashboard.recovery.data) ||
    Boolean(dashboard.workout.data) ||
    Boolean(dashboard.nutrition.data);
  const errorMessage =
    dashboard.error ||
    (!dashboard.coach.data && dashboard.coach.errorMessage
      ? "Unable to load today's coaching."
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

function buildCoachHomeModel(input: {
  coachDecision: CoachDecision;
  latestMessage: CoachChatHistoryMessage | null;
  currentGoal: CurrentGoal | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  mealsRemaining?: number;
  nutritionFocus?: string;
}): CoachHomeModel {
  const contextItems = buildContextItems(input);
  const priorities = buildPriorities(input.coachDecision);
  const updatedAt = input.coachDecision.updatedAt || input.coachDecision.createdAt;
  const generatedAt = getGeneratedAt(input.coachDecision);

  return {
    greeting: `${getGreeting()}, ${USER_NAME}.`,
    subtitle: "Here's what deserves your attention today.",
    mainInsight: input.coachDecision.headline,
    insightSummary: input.coachDecision.summary,
    contextItems,
    priorities,
    actions: [
      {
        id: 'ask',
        label: 'Ask Coach',
        target: 'ask',
        isPrimary: true,
        isEnabled: true,
      },
      {
        id: 'conversation',
        label: 'Open Coach Conversation',
        target: 'conversation',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'insight',
        label: "Today's Insight",
        target: 'insight',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'goals',
        label: 'Goal Guidance',
        target: 'goals',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'briefing',
        label: "Today's Briefing",
        target: 'briefing',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'notifications',
        label: 'Smart Nudges',
        target: 'notifications',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'weekly-review',
        label: 'Weekly Review',
        target: 'weekly-review',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'memory',
        label: 'Memory',
        target: 'memory',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'workout',
        label: 'View Workout',
        target: 'workout',
        isPrimary: false,
        isEnabled: input.hasWorkout,
      },
      {
        id: 'nutrition',
        label: 'View Nutrition',
        target: 'nutrition',
        isPrimary: false,
        isEnabled: true,
      },
      {
        id: 'recovery',
        label: 'Recovery',
        target: 'recovery',
        isPrimary: false,
        isEnabled: true,
      },
    ],
    latestMessage: input.latestMessage,
    statusText: `Coach updated ${formatRelativeTime(updatedAt)}.`,
    statusDetail: generatedAt
      ? "Today's recommendations are based on your latest workout and nutrition logs."
      : "Today's recommendations are based on the latest signals Elev9 has available.",
    accessibilityLabel: `Coach Home. ${input.coachDecision.headline}. ${priorities.length} priorities available.`,
  };
}

function buildContextItems(input: {
  coachDecision: CoachDecision;
  currentGoal: CurrentGoal | null;
  recoveryScore?: number;
  hasWorkout: boolean;
  mealsRemaining?: number;
  nutritionFocus?: string;
}): CoachHomeContextItem[] {
  return [
    {
      id: 'recovery',
      label: 'Recovery',
      value: getRecoveryLabel(input.recoveryScore),
    },
    {
      id: 'training',
      label: 'Training',
      value: input.hasWorkout ? 'Workout planned' : 'No workout today',
    },
    {
      id: 'nutrition',
      label: 'Nutrition',
      value:
        input.mealsRemaining === undefined
          ? input.nutritionFocus ?? 'Plan ready'
          : `${input.mealsRemaining} meals remaining`,
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

function buildPriorities(coachDecision: CoachDecision): CoachHomePriority[] {
  const sourceItems =
    coachDecision.actionItems.length > 0
      ? coachDecision.actionItems
      : [getFallbackPriority(coachDecision.priority)];

  return sourceItems
    .filter((item) => item.trim().length > 0)
    .slice(0, 3)
    .map((item, index) => ({
      id: `${coachDecision.id}-${index}`,
      title: normalizeSentence(item),
      reason: getPriorityReason(coachDecision, index),
      benefit: getExpectedBenefit(coachDecision.priority),
    }));
}

function resolveLatestAssistantMessage(
  messages: CoachChatHistoryMessage[],
): CoachChatHistoryMessage | null {
  return [...messages].reverse().find((message) => message.role === 'assistant') ?? null;
}

function getMealsRemaining(mealCount?: number): number | undefined {
  if (mealCount === undefined) {
    return undefined;
  }

  return Math.max(0, mealCount);
}

function getRecoveryLabel(score?: number): string {
  if (score === undefined) {
    return 'Ready';
  }

  if (score >= 80) {
    return 'Ready';
  }

  if (score >= 60) {
    return 'Steady';
  }

  return 'Recover';
}

function getPriorityReason(coachDecision: CoachDecision, index: number): string {
  const influence = coachDecision.influences[index] ?? coachDecision.influences[0];

  if (influence?.label) {
    return influence.label;
  }

  return coachDecision.summary;
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
      return 'Prioritize protein at your next meal.';
    case 'training':
      return "Complete today's workout.";
    case 'consistency':
      return 'Complete one planned action today.';
    case 'motivation':
    default:
      return 'Take the next small step.';
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

function getGeneratedAt(coachDecision: CoachDecision): string | null {
  const generatedAt = coachDecision.sourceContext.generatedAt;

  return typeof generatedAt === 'string' ? generatedAt : null;
}

function normalizeSentence(value: string): string {
  const trimmed = value.trim();

  if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
    return trimmed;
  }

  return `${trimmed}.`;
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

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return 'today';
  }

  const minutes = Math.max(0, Math.round(diffMs / 60000));

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  return 'today';
}

function isOptionalEmptyState(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    ['USER_PROFILE_NOT_FOUND', 'GOAL_NOT_FOUND'].includes(error.code)
  );
}
