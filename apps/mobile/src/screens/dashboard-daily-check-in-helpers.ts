import type { UseDashboardResult } from '../hooks/use-dashboard';

export type DailyCheckInAnalyticsCompletionState =
  | 'pending'
  | 'completed'
  | null;

export function getDailyCheckInCtaLabel(dashboard: UseDashboardResult): string {
  if (
    dashboard.dailyCheckIn.offlineState === 'queued' ||
    dashboard.dailyCheckIn.offlineState === 'syncing'
  ) {
    return 'Daily check-in waiting to sync';
  }

  if (dashboard.dailyCheckIn.offlineState === 'failed') {
    return 'Daily check-in needs attention';
  }

  if (dashboard.coach.actionTarget !== 'check_in') {
    return dashboard.coach.ctaLabel;
  }

  return dashboard.dailyCheckIn.completedToday
    ? "View or update today's check-in"
    : 'Complete daily check-in';
}

export function getDailyCheckInAnalyticsCompletionState(
  dashboard: UseDashboardResult,
): DailyCheckInAnalyticsCompletionState {
  if (dashboard.coach.actionTarget !== 'check_in') {
    return null;
  }

  return dashboard.dailyCheckIn.completedToday ? 'completed' : 'pending';
}
