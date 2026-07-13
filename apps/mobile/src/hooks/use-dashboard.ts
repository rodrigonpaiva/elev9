import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '@elev9/api-client';
import type {
  CoachDecision,
  ProgressSummaryResponse,
  RecoverySnapshot,
  TodayNutrition,
  TodayWorkout,
  TrainingPlanResponse,
} from '@elev9/types';

import { apiClient } from '../api/client';
import type { RecoveryStatus } from '../components/dashboard/todays-workout-card';
import {
  buildCoachExplanation,
  buildCoachIntelligence,
  buildCoachPersonaGuidance,
  getCoachBadgeLabel,
  getCoachConfidenceLabel,
  getCoachFocusLabel,
  getCoachRecommendationTarget,
  mapUnifiedCoachInsight,
  type CoachExplanation,
  type CoachPersonaProfile,
  type CoachUnifiedCoachIntelligence,
} from './coach';

type TrainingPlan = TrainingPlanResponse['trainingPlan'];
type ProgressSummary = ProgressSummaryResponse['summary'];
type DashboardDomain =
  | 'coach'
  | 'recovery'
  | 'workout'
  | 'nutrition'
  | 'progress';
export type DashboardCoachActionTarget =
  | 'workout'
  | 'nutrition'
  | 'coach'
  | 'check_in';

type DomainState<TData> = {
  data: TData | null;
  isLoading: boolean;
  errorMessage: string | null;
};

type DashboardDomainResult<TData> = DomainState<TData> & {
  retry: () => Promise<void>;
};

type CoachDisplay = {
  badgeLabel: string;
  recommendedAction: string;
  ctaLabel: string;
  actionTarget: DashboardCoachActionTarget;
  currentFocus: string | null;
  currentRiskLabel: string | null;
  confidenceLabel: string | null;
  supportingEvidenceSummary: string;
};

export type UseDashboardResult = {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  userName: string | null;
  coach: DashboardDomainResult<CoachDecision> &
    CoachDisplay & {
      intelligence: CoachUnifiedCoachIntelligence | null;
      persona: CoachPersonaProfile | null;
      explanation: CoachExplanation | null;
    };
  recovery: DashboardDomainResult<RecoverySnapshot> & {
    status: RecoveryStatus | null;
  };
  workout: DashboardDomainResult<TrainingPlan> & {
    todaysWorkout: TodayWorkout | null;
    plannedWorkoutCount: number;
  };
  nutrition: DashboardDomainResult<TodayNutrition>;
  progress: DashboardDomainResult<ProgressSummary>;
  refresh: () => Promise<void>;
};

const INTRO_LOADING_DURATION_MS = 450;
const REFRESH_DURATION_MS = 1000;

export function useDashboard(): UseDashboardResult {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [coach, setCoach] = useState<DomainState<CoachDecision>>(
    createInitialDomainState(),
  );
  const [recovery, setRecovery] = useState<DomainState<RecoverySnapshot>>(
    createInitialDomainState(),
  );
  const [workout, setWorkout] = useState<DomainState<TrainingPlan>>(
    createInitialDomainState(),
  );
  const [nutrition, setNutrition] = useState<DomainState<TodayNutrition>>(
    createInitialDomainState(),
  );
  const [progress, setProgress] = useState<DomainState<ProgressSummary>>(
    createInitialDomainState(),
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, INTRO_LOADING_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

  const loadDomain = useCallback(
    async (domain: DashboardDomain, options?: { refresh?: boolean }) => {
      setError(null);
      setDomainLoading(domain, !options?.refresh);
      setDomainError(domain, null);

      const result = await Promise.allSettled([fetchDashboardDomain(domain)]);
      const settledResult = result[0];

      applyDomainResult(domain, settledResult);
      setDomainLoading(domain, false);
    },
    [],
  );

  const loadDashboardData = useCallback(
    async (options?: { refresh?: boolean }) => {
      if (options?.refresh) {
        setIsRefreshing(true);
      }

      setError(null);
      clearDomainErrors();

      const domains: DashboardDomain[] = [
        'coach',
        'recovery',
        'workout',
        'nutrition',
        'progress',
      ];
      const [results, dashboardResult] = await Promise.all([
        Promise.allSettled(
          domains.map((domain) => fetchDashboardDomain(domain)),
        ),
        apiClient.dashboard
          .getHome()
          .then((response) => response.dashboard.user.name)
          .catch(() => null),
        options?.refresh ? wait(REFRESH_DURATION_MS) : Promise.resolve(),
      ]);

      setUserName(
        typeof dashboardResult === 'string'
          ? dashboardResult.trim() || null
          : null,
      );

      results.forEach((result, index) => {
        applyDomainResult(domains[index], result);
      });

      if (results.every((result) => result.status === 'rejected')) {
        setError('Unable to load dashboard.');
      }

      if (options?.refresh) {
        setIsRefreshing(false);
      }
    },
    [],
  );

  const refresh = useCallback(
    () => loadDashboardData({ refresh: true }),
    [loadDashboardData],
  );

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const todaysWorkout = useMemo(
    () => resolveTodaysWorkout(workout.data),
    [workout.data],
  );
  const plannedWorkoutCount = useMemo(
    () => resolveWeeklyPlannedWorkoutCount(workout.data),
    [workout.data],
  );
  const recoveryStatus = useMemo(
    () => resolveRecoveryStatus(recovery.data),
    [recovery.data],
  );
  const coachIntelligence = useMemo(
    () =>
      buildCoachIntelligence({
        coachDecision: coach.data,
        currentGoal: null,
        recoverySnapshot: recovery.data,
        workout: todaysWorkout,
        nutrition: nutrition.data,
        progressSummary: progress.data,
      }),
    [coach.data, nutrition.data, progress.data, recovery.data, todaysWorkout],
  );
  const coachPersona = useMemo(
    () =>
      buildCoachPersonaGuidance({
        intelligence: coachIntelligence,
        personalizationSnapshot: null,
        currentGoal: null,
      }),
    [coachIntelligence],
  );
  const coachExplanation = useMemo(
    () =>
      buildCoachExplanation({
        intelligence: coachIntelligence,
        persona: coachPersona,
      }),
    [coachIntelligence, coachPersona],
  );
  const coachDisplay = useMemo(
    () =>
      resolveCoachInsightDisplay(coach.data, todaysWorkout, coachIntelligence),
    [coach.data, coachIntelligence, todaysWorkout],
  );

  const retryCoach = useCallback(() => loadDomain('coach'), [loadDomain]);
  const retryRecovery = useCallback(() => loadDomain('recovery'), [loadDomain]);
  const retryWorkout = useCallback(() => loadDomain('workout'), [loadDomain]);
  const retryNutrition = useCallback(
    () => loadDomain('nutrition'),
    [loadDomain],
  );
  const retryProgress = useCallback(() => loadDomain('progress'), [loadDomain]);

  return {
    isLoading,
    isRefreshing,
    error,
    userName,
    coach: {
      ...coach,
      ...coachDisplay,
      intelligence: coachIntelligence,
      persona: coachPersona,
      explanation: coachExplanation,
      retry: retryCoach,
    },
    recovery: {
      ...recovery,
      status: recoveryStatus,
      retry: retryRecovery,
    },
    workout: {
      ...workout,
      todaysWorkout,
      plannedWorkoutCount,
      retry: retryWorkout,
    },
    nutrition: {
      ...nutrition,
      retry: retryNutrition,
    },
    progress: {
      ...progress,
      retry: retryProgress,
    },
    refresh,
  };

  function setDomainLoading(domain: DashboardDomain, isDomainLoading: boolean) {
    updateDomainState(domain, (current) => ({
      ...current,
      isLoading: isDomainLoading,
    }));
  }

  function setDomainError(
    domain: DashboardDomain,
    errorMessage: string | null,
  ) {
    updateDomainState(domain, (current) => ({
      ...current,
      errorMessage,
    }));
  }

  function clearDomainErrors() {
    (
      ['coach', 'recovery', 'workout', 'nutrition', 'progress'] as const
    ).forEach((domain) => {
      setDomainError(domain, null);
    });
  }

  function applyDomainResult(
    domain: DashboardDomain,
    result: PromiseSettledResult<DashboardDomainData>,
  ) {
    if (result.status === 'fulfilled') {
      updateDomainState(domain, () => ({
        data: result.value as never,
        isLoading: false,
        errorMessage: null,
      }));
      return;
    }

    updateDomainState(domain, () => ({
      data: null,
      isLoading: false,
      errorMessage: getDomainErrorMessage(domain, result.reason),
    }));
  }

  function updateDomainState<TData>(
    domain: DashboardDomain,
    updater: (current: DomainState<TData>) => DomainState<TData>,
  ) {
    switch (domain) {
      case 'coach':
        setCoach(
          (current) =>
            updater(
              current as DomainState<TData>,
            ) as DomainState<CoachDecision>,
        );
        return;
      case 'recovery':
        setRecovery(
          (current) =>
            updater(
              current as DomainState<TData>,
            ) as DomainState<RecoverySnapshot>,
        );
        return;
      case 'workout':
        setWorkout(
          (current) =>
            updater(current as DomainState<TData>) as DomainState<TrainingPlan>,
        );
        return;
      case 'nutrition':
        setNutrition(
          (current) =>
            updater(
              current as DomainState<TData>,
            ) as DomainState<TodayNutrition>,
        );
        return;
      case 'progress':
        setProgress(
          (current) =>
            updater(
              current as DomainState<TData>,
            ) as DomainState<ProgressSummary>,
        );
        return;
    }
  }
}

type DashboardDomainData =
  | CoachDecision
  | RecoverySnapshot
  | TrainingPlan
  | TodayNutrition
  | ProgressSummary
  | null;

function createInitialDomainState<TData>(): DomainState<TData> {
  return {
    data: null,
    isLoading: true,
    errorMessage: null,
  };
}

async function fetchDashboardDomain(
  domain: DashboardDomain,
): Promise<DashboardDomainData> {
  switch (domain) {
    case 'coach':
      return fetchCoachInsight();
    case 'recovery':
      return fetchRecovery();
    case 'workout':
      return fetchWorkout();
    case 'nutrition':
      return fetchNutrition();
    case 'progress':
      return fetchProgress();
  }
}

async function fetchCoachInsight(): Promise<CoachDecision | null> {
  try {
    const response = await apiClient.ai.getTodayCoachDecision();
    return response.coachDecision ?? null;
  } catch (error) {
    if (isEmptyStateError(error, ['USER_PROFILE_NOT_FOUND'])) {
      return null;
    }

    throw error;
  }
}

async function fetchRecovery(): Promise<RecoverySnapshot | null> {
  try {
    const response = await apiClient.recovery.getTodayRecovery();
    return response.recoverySnapshot ?? null;
  } catch (error) {
    if (isEmptyStateError(error, ['USER_PROFILE_NOT_FOUND'])) {
      return null;
    }

    throw error;
  }
}

async function fetchWorkout(): Promise<TrainingPlan | null> {
  try {
    const response = await apiClient.training.getCurrentPlan();
    return response.trainingPlan;
  } catch (error) {
    if (isEmptyStateError(error, ['TRAINING_PLAN_NOT_FOUND'])) {
      return null;
    }

    throw error;
  }
}

async function fetchNutrition(): Promise<TodayNutrition | null> {
  try {
    const response = await apiClient.nutrition.getTodayNutrition();
    return response.todayNutrition ?? null;
  } catch (error) {
    if (
      isEmptyStateError(error, [
        'NUTRITION_PLAN_NOT_FOUND',
        'TODAY_NUTRITION_DAY_NOT_FOUND',
      ])
    ) {
      return null;
    }

    throw error;
  }
}

async function fetchProgress(): Promise<ProgressSummary | null> {
  try {
    const response = await apiClient.progress.getSummary('week');
    return response.summary ?? null;
  } catch (error) {
    if (isEmptyStateError(error, ['USER_PROFILE_NOT_FOUND'])) {
      return null;
    }

    throw error;
  }
}

function isEmptyStateError(error: unknown, codes: string[]): boolean {
  return error instanceof ApiClientError && codes.includes(error.code);
}

function getDomainErrorMessage(
  domain: DashboardDomain,
  error: unknown,
): string {
  switch (domain) {
    case 'coach':
      return 'Coach insight unavailable.';
    case 'recovery':
      return error instanceof ApiClientError
        ? 'Try again in a moment.'
        : 'Try again in a moment.';
    case 'workout':
      return 'Workout unavailable.';
    case 'nutrition':
      return 'Nutrition data unavailable.';
    case 'progress':
      return 'Progress data unavailable.';
  }
}

function resolveRecoveryStatus(
  recoverySnapshot: RecoverySnapshot | null,
): RecoveryStatus | null {
  if (!recoverySnapshot) {
    return null;
  }

  if (recoverySnapshot.readinessScore >= 80) {
    return 'ready';
  }

  if (recoverySnapshot.readinessScore >= 60) {
    return 'moderate';
  }

  return 'recovery_needed';
}

function resolveTodaysWorkout(
  trainingPlan: TrainingPlan | null,
): TodayWorkout | null {
  if (!trainingPlan) {
    return null;
  }

  const todayIndex = getUtcDayIndex(new Date());
  const matchingDay = trainingPlan.weeklySchedule.find(
    (day) => day.dayIndex === todayIndex,
  );

  if (!matchingDay) {
    return null;
  }

  return {
    dayIndex: matchingDay.dayIndex,
    title: matchingDay.title,
    focus: matchingDay.focus,
    format: matchingDay.format,
    intensity: matchingDay.intensity,
    exercises: matchingDay.exercises,
  };
}

function getUtcDayIndex(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function resolveWeeklyPlannedWorkoutCount(trainingPlan: TrainingPlan | null) {
  if (!trainingPlan) {
    return 5;
  }

  return trainingPlan.weeklySchedule.filter((day) => day.exercises.length > 0)
    .length;
}

function resolveCoachInsightDisplay(
  coachDecision: CoachDecision | null,
  workout: TodayWorkout | null,
  intelligence: CoachUnifiedCoachIntelligence | null,
): CoachDisplay {
  if (!coachDecision) {
    return {
      badgeLabel: 'Coach Insight',
      recommendedAction: 'Open Coach',
      ctaLabel: 'Open Coach',
      actionTarget: 'coach',
      currentFocus: null,
      currentRiskLabel: null,
      confidenceLabel: null,
      supportingEvidenceSummary: '',
    };
  }

  const recommendation = intelligence?.topRecommendation ?? null;
  const recommendedAction =
    recommendation?.title?.trim() ||
    coachDecision.actionItems
      .find((action) => action.trim().length > 0)
      ?.trim() ||
    getCoachRecommendedAction(coachDecision.priority, workout);
  const actionTarget = recommendation
    ? getCoachRecommendationTarget(recommendation)
    : getCoachActionTarget(coachDecision.priority, workout);
  const insight = mapUnifiedCoachInsight({
    intelligence,
    fallbackHeadline: coachDecision.headline,
    fallbackSummary: coachDecision.summary,
  });

  return {
    badgeLabel: getCoachBadgeLabel(
      intelligence?.primaryExpert ??
        mapCoachPriorityToExpert(coachDecision.priority),
      insight.currentRisk,
    ),
    recommendedAction,
    ctaLabel: getCoachCtaLabel(actionTarget),
    actionTarget,
    currentFocus: insight.currentFocus
      ? getCoachFocusLabel(insight.currentFocus)
      : null,
    currentRiskLabel: insight.currentRisk ? insight.currentRisk.title : null,
    confidenceLabel: insight.confidence
      ? getCoachConfidenceLabel(insight.confidence.level)
      : null,
    supportingEvidenceSummary: insight.supportingEvidenceSummary,
  };
}

function getCoachRecommendedAction(
  priority: CoachDecisionPriority,
  workout: TodayWorkout | null,
): string {
  switch (priority) {
    case 'recovery':
      return 'Prioritize Sleep';
    case 'nutrition':
      return 'Nutrition Recommendations';
    case 'training':
      return workout ? "Start Today's Workout" : 'Open Coach';
    case 'consistency':
      return workout ? "Start Today's Workout" : 'Complete Daily Check-In';
    case 'motivation':
    default:
      return 'Open Coach';
  }
}

function getCoachActionTarget(
  priority: CoachDecisionPriority,
  workout: TodayWorkout | null,
): DashboardCoachActionTarget {
  if (
    workout &&
    (priority === 'training' ||
      priority === 'consistency' ||
      priority === 'motivation')
  ) {
    return 'workout';
  }

  if (priority === 'recovery') {
    return 'check_in';
  }

  if (priority === 'nutrition') {
    return 'nutrition';
  }

  return 'coach';
}

function getCoachCtaLabel(target: DashboardCoachActionTarget): string {
  switch (target) {
    case 'workout':
      return 'Start Workout';
    case 'check_in':
      return 'Complete Check-In';
    case 'nutrition':
      return 'Nutrition Recommendations';
    case 'coach':
    default:
      return 'Ask Coach';
  }
}

function mapCoachPriorityToExpert(
  priority: CoachDecision['priority'],
):
  | 'Workout'
  | 'Nutrition'
  | 'Recovery'
  | 'Goal'
  | 'Habit'
  | 'Progress'
  | 'Motivation' {
  switch (priority) {
    case 'training':
      return 'Workout';
    case 'nutrition':
      return 'Nutrition';
    case 'recovery':
      return 'Recovery';
    case 'consistency':
      return 'Habit';
    case 'motivation':
    default:
      return 'Motivation';
  }
}

function wait(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
