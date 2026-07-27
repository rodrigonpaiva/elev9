import { useCallback, useRef } from 'react';

import { productAnalytics } from '../../../analytics/product-analytics';
import type {
  DailyCheckInAnalyticsErrorCategory,
  DailyCheckInMode,
  DailyCheckInStep,
} from '../models/daily-check-in-analytics';
import { DAILY_CHECK_IN_TOTAL_STEPS } from '../models/daily-check-in-analytics';

export type DailyCheckInAnalytics = {
  start: (mode: DailyCheckInMode, entryPoint: 'dashboard' | 'other') => void;
  stepViewed: (
    mode: DailyCheckInMode,
    step: DailyCheckInStep,
    index: number,
  ) => void;
  stepCompleted: (
    mode: DailyCheckInMode,
    step: DailyCheckInStep,
    index: number,
  ) => void;
  submitStarted: (mode: DailyCheckInMode) => number;
  submitSucceeded: (mode: DailyCheckInMode, attemptNumber: number) => void;
  submitFailed: (
    mode: DailyCheckInMode,
    attemptNumber: number,
    category: DailyCheckInAnalyticsErrorCategory,
  ) => void;
  retrySelected: (
    mode: DailyCheckInMode,
    category: DailyCheckInAnalyticsErrorCategory,
  ) => void;
  successViewed: (mode: DailyCheckInMode) => void;
  exited: (
    mode: DailyCheckInMode,
    step: DailyCheckInStep,
    completed: boolean,
    hadUnsavedChanges: boolean,
  ) => void;
};

function monotonicNow(): number {
  return typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function createFlowSessionId(): string {
  return `dc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useDailyCheckInAnalytics(): DailyCheckInAnalytics {
  const sessionRef = useRef({
    flowSessionId: createFlowSessionId(),
    startedAt: 0,
    started: false,
    completed: false,
    successViewed: false,
    exited: false,
    attemptNumber: 0,
    lastSubmitStartedAt: 0,
    lastErrorCategory: 'unknown' as DailyCheckInAnalyticsErrorCategory,
    viewedSteps: new Set<string>(),
  });

  const start = useCallback(
    (mode: DailyCheckInMode, entryPoint: 'dashboard' | 'other') => {
      const session = sessionRef.current;
      if (session.started) {
        return;
      }

      session.started = true;
      session.startedAt = monotonicNow();
      productAnalytics.track('daily_check_in_started', {
        mode,
        entryPoint,
        flowSessionId: session.flowSessionId,
      });
    },
    [],
  );

  const stepViewed = useCallback(
    (mode: DailyCheckInMode, step: DailyCheckInStep, index: number) => {
      const session = sessionRef.current;
      const key = `${mode}:${step}:${index}`;
      if (session.viewedSteps.has(key)) {
        return;
      }

      session.viewedSteps.add(key);
      productAnalytics.track('daily_check_in_step_viewed', {
        mode,
        step,
        stepIndex: index,
        totalSteps: DAILY_CHECK_IN_TOTAL_STEPS,
        flowSessionId: session.flowSessionId,
      });
    },
    [],
  );

  const stepCompleted = useCallback(
    (mode: DailyCheckInMode, step: DailyCheckInStep, index: number) => {
      productAnalytics.track('daily_check_in_step_completed', {
        mode,
        step,
        stepIndex: index,
        totalSteps: DAILY_CHECK_IN_TOTAL_STEPS,
        flowSessionId: sessionRef.current.flowSessionId,
      });
    },
    [],
  );

  const submitStarted = useCallback((mode: DailyCheckInMode) => {
    const session = sessionRef.current;
    session.attemptNumber += 1;
    session.lastSubmitStartedAt = monotonicNow();
    productAnalytics.track('daily_check_in_submit_started', {
      mode,
      attemptNumber: session.attemptNumber,
      flowSessionId: session.flowSessionId,
    });
    return session.attemptNumber;
  }, []);

  const submitSucceeded = useCallback(
    (mode: DailyCheckInMode, attemptNumber: number) => {
      const session = sessionRef.current;
      session.completed = true;
      productAnalytics.track('daily_check_in_submit_succeeded', {
        mode,
        attemptNumber,
        durationMs: Math.max(
          0,
          Math.round(monotonicNow() - session.lastSubmitStartedAt),
        ),
        flowSessionId: session.flowSessionId,
      });
    },
    [],
  );

  const submitFailed = useCallback(
    (
      mode: DailyCheckInMode,
      attemptNumber: number,
      category: DailyCheckInAnalyticsErrorCategory,
    ) => {
      const session = sessionRef.current;
      session.lastErrorCategory = category;
      productAnalytics.track('daily_check_in_submit_failed', {
        mode,
        attemptNumber,
        durationMs: Math.max(
          0,
          Math.round(monotonicNow() - session.lastSubmitStartedAt),
        ),
        errorCategory: category,
        flowSessionId: session.flowSessionId,
      });
    },
    [],
  );

  const retrySelected = useCallback(
    (mode: DailyCheckInMode, category: DailyCheckInAnalyticsErrorCategory) => {
      const session = sessionRef.current;
      session.lastErrorCategory = category;
      productAnalytics.track('daily_check_in_retry_selected', {
        mode,
        previousErrorCategory: category,
        attemptNumber: session.attemptNumber + 1,
        flowSessionId: session.flowSessionId,
      });
    },
    [],
  );

  const successViewed = useCallback((mode: DailyCheckInMode) => {
    const session = sessionRef.current;
    if (session.successViewed) {
      return;
    }

    session.successViewed = true;
    productAnalytics.track('daily_check_in_success_viewed', {
      mode,
      flowSessionId: session.flowSessionId,
    });
  }, []);

  const exited = useCallback(
    (
      mode: DailyCheckInMode,
      step: DailyCheckInStep,
      completed: boolean,
      hadUnsavedChanges: boolean,
    ) => {
      const session = sessionRef.current;
      if (session.exited) {
        return;
      }

      session.exited = true;

      productAnalytics.track('daily_check_in_exited', {
        mode,
        lastStep: step,
        completed,
        hadUnsavedChanges,
        elapsedMs: Math.max(0, Math.round(monotonicNow() - session.startedAt)),
        flowSessionId: session.flowSessionId,
      });
    },
    [],
  );

  return {
    start,
    stepViewed,
    stepCompleted,
    submitStarted,
    submitSucceeded,
    submitFailed,
    retrySelected,
    successViewed,
    exited,
  };
}

export function mapDailyCheckInAnalyticsError(
  code: string,
): DailyCheckInAnalyticsErrorCategory {
  switch (code) {
    case 'NETWORK_ERROR':
      return 'network';
    case 'SESSION_EXPIRED':
      return 'authentication';
    case 'PROFILE_UNAVAILABLE':
      return 'profile_unavailable';
    case 'INVALID_INPUT':
      return 'validation';
    case 'RECOVERY_FAILED':
      return 'recovery_processing';
    case 'SERVER_ERROR':
      return 'server';
    default:
      return 'unknown';
  }
}
