import type { UseDashboardResult } from '../hooks/use-dashboard';

export function getDailyCheckInCtaLabel(dashboard: UseDashboardResult): string {
  if (dashboard.coach.actionTarget !== 'check_in') {
    return dashboard.coach.ctaLabel;
  }

  return dashboard.dailyCheckIn.completedToday
    ? "View or update today's check-in"
    : 'Complete daily check-in';
}
