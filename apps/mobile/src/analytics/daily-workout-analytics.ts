import { productAnalytics, type ProductAnalytics } from './product-analytics';

export type DailyWorkoutMode = 'real' | 'demo';
export type DailyWorkoutStage = 'home' | 'workout' | 'timer' | 'completion';

export function trackDailyWorkoutError(
  input: {
    mode: DailyWorkoutMode;
    stage: DailyWorkoutStage;
    errorCategory:
      | 'network'
      | 'authentication'
      | 'validation'
      | 'server'
      | 'unknown';
  },
  analytics: ProductAnalytics = productAnalytics,
): void {
  analytics.track('daily_workout_error', input);
}

export function trackDailyWorkoutRetry(
  input: {
    mode: DailyWorkoutMode;
    stage: DailyWorkoutStage;
    retryTarget: 'load' | 'sync' | 'save' | 'recovery';
  },
  analytics: ProductAnalytics = productAnalytics,
): void {
  analytics.track('daily_workout_retry_selected', input);
}

export function trackDailyWorkoutSessionExpired(
  input: {
    mode: DailyWorkoutMode;
    stage: 'workout' | 'timer' | 'completion';
  },
  analytics: ProductAnalytics = productAnalytics,
): void {
  analytics.track('daily_workout_session_expired', input);
}

export function trackDailyWorkoutRecoveryPending(
  mode: DailyWorkoutMode,
  analytics: ProductAnalytics = productAnalytics,
): void {
  analytics.track('daily_workout_recovery_pending', {
    mode,
    stage: 'completion',
  });
}

export function trackDailyWorkoutCompletionConfirmed(
  mode: DailyWorkoutMode,
  analytics: ProductAnalytics = productAnalytics,
): void {
  analytics.track('daily_workout_completion_confirmed', { mode });
}
