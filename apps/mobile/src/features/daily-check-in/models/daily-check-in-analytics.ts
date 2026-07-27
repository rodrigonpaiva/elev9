export type DailyCheckInMode = 'create' | 'edit';

export type DailyCheckInStep =
  | 'energy'
  | 'sleep_quality'
  | 'muscle_soreness'
  | 'motivation'
  | 'review';

export const DAILY_CHECK_IN_TOTAL_STEPS = 5;

export const DAILY_CHECK_IN_ANALYTICS_ERROR_CATEGORIES = [
  'network',
  'authentication',
  'profile_unavailable',
  'validation',
  'recovery_processing',
  'server',
  'unknown',
] as const;

export type DailyCheckInAnalyticsErrorCategory =
  (typeof DAILY_CHECK_IN_ANALYTICS_ERROR_CATEGORIES)[number];
