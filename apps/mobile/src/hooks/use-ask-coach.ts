import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CoachChatHistoryMessage,
  GetCurrentGoalResponse,
  HabitSnapshot,
  PersonalizationSnapshot,
} from '@elev9/types';

import { apiClient } from '../api/client';
import { useDashboard } from './use-dashboard';
import {
  isCoachOptionalEmptyState,
  mapUnifiedCoachInsight,
} from './coach';
import {
  type AskCoachCategory,
  type AskCoachCategoryId,
  type AskCoachModel,
  type AskCoachPersonalizedSuggestion,
  type AskCoachQuestion,
  type AskCoachQuickAction,
  type AskCoachRecentConversation,
  buildAskCoachModel,
  getDefaultCategory,
} from './coach/ask-coach-helpers';

export type {
  AskCoachCategory,
  AskCoachCategoryId,
  AskCoachModel,
  AskCoachPersonalizedSuggestion,
  AskCoachQuestion,
  AskCoachQuickAction,
  AskCoachRecentConversation,
} from './coach/ask-coach-helpers';

type CurrentGoal = GetCurrentGoalResponse['goal'];

export type AskCoachResult = {
  model: AskCoachModel | null;
  selectedCategory: AskCoachCategoryId;
  setSelectedCategory: (category: AskCoachCategoryId) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
};

type AskCoachExtras = {
  currentGoal: CurrentGoal | null;
  habitSnapshot: HabitSnapshot | null;
  personalizationSnapshot: PersonalizationSnapshot | null;
  chatHistory: CoachChatHistoryMessage[];
};

const EMPTY_EXTRAS: AskCoachExtras = {
  currentGoal: null,
  habitSnapshot: null,
  personalizationSnapshot: null,
  chatHistory: [],
};

export function useAskCoach(): AskCoachResult {
  const dashboard = useDashboard();
  const [extras, setExtras] = useState<AskCoachExtras>(EMPTY_EXTRAS);
  const [selectedCategory, setSelectedCategory] =
    useState<AskCoachCategoryId>('training');
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);
  const [extraError, setExtraError] = useState<string | null>(null);

  const loadExtras = useCallback(async () => {
    setExtraError(null);
    setIsLoadingExtras(true);

    const [chatResult, goalResult, habitResult, personalizationResult] =
      await Promise.allSettled([
        apiClient.ai.getChatHistory({ limit: 20 }),
        apiClient.goals.getCurrentGoal(),
        apiClient.habits.getTodayHabits(),
        apiClient.personalization.getTodayPersonalization(),
      ]);

    if (
      [chatResult, goalResult, habitResult, personalizationResult].every(
        (result) => result.status === 'rejected',
      ) &&
      !isCoachOptionalEmptyState(chatResult.reason)
    ) {
      setExtraError('Unable to prepare coach suggestions.');
    }

    setExtras({
      chatHistory: chatResult.status === 'fulfilled' ? chatResult.value : [],
      currentGoal:
        goalResult.status === 'fulfilled' ? goalResult.value.goal : null,
      habitSnapshot:
        habitResult.status === 'fulfilled'
          ? habitResult.value.habitSnapshot
          : null,
      personalizationSnapshot:
        personalizationResult.status === 'fulfilled'
          ? personalizationResult.value.personalizationSnapshot
          : null,
    });
    setIsLoadingExtras(false);
  }, []);

  useEffect(() => {
    void loadExtras();
  }, [loadExtras]);

  useEffect(() => {
    if (dashboard.coach.data) {
      setSelectedCategory(getDefaultCategory(dashboard.coach.data.priority));
    }
  }, [dashboard.coach.data]);

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

    return buildAskCoachModel({
      coachDecision: dashboard.coach.data,
      intelligence,
      insight,
      currentGoal: extras.currentGoal,
      habitSnapshot: extras.habitSnapshot,
      personalizationSnapshot: extras.personalizationSnapshot,
      chatHistory: extras.chatHistory,
      recoveryScore: dashboard.recovery.data?.readinessScore,
      hasWorkout: Boolean(dashboard.workout.todaysWorkout),
      nutritionFocus: dashboard.nutrition.data?.nutritionFocus,
      nextMealTitle: dashboard.nutrition.data?.nextMeal?.title,
      selectedCategory,
    });
  }, [
    dashboard.coach.data,
    dashboard.coach.intelligence,
    dashboard.coach.mode,
    dashboard.progress.data,
    dashboard.nutrition.data,
    dashboard.recovery.data,
    dashboard.workout.todaysWorkout,
    extras,
    selectedCategory,
  ]);

  const errorMessage =
    dashboard.error ||
    (!dashboard.coach.data && dashboard.coach.errorMessage
      ? 'Unable to prepare coach suggestions.'
      : null) ||
    extraError;
  const hasContext =
    Boolean(dashboard.coach.data) ||
    Boolean(dashboard.recovery.data) ||
    Boolean(dashboard.workout.data) ||
    Boolean(dashboard.nutrition.data) ||
    Boolean(extras.currentGoal) ||
    extras.chatHistory.length > 0;

  return {
    model,
    selectedCategory,
    setSelectedCategory,
    isLoading:
      dashboard.isLoading ||
      dashboard.coach.isLoading ||
      (isLoadingExtras && !model),
    isRefreshing: dashboard.isRefreshing || isLoadingExtras,
    errorMessage,
    isEmpty: !dashboard.isLoading && !model && !errorMessage && !hasContext,
    refresh,
  };
}

export function trackAskCoachEvent(
  _event:
    | 'coach_quick_actions_opened'
    | 'coach_suggestion_selected'
    | 'coach_category_selected'
    | 'coach_recent_conversation_opened',
  _properties?: Record<string, string | number>,
) {
  // Analytics transport can be connected here once the app-level abstraction exists.
}
