import type { UseDashboardResult } from '../hooks/use-dashboard';
import { getDailyCheckInCtaLabel } from './dashboard-daily-check-in-helpers';

function dashboardFixture(
  completedToday: boolean,
  actionTarget: UseDashboardResult['coach']['actionTarget'],
): UseDashboardResult {
  return {
    dailyCheckIn: { completedToday },
    coach: { actionTarget, ctaLabel: 'Fallback CTA' },
  } as UseDashboardResult;
}

describe('dashboard daily check-in CTA', () => {
  it('prompts completion when no check-in exists today', () => {
    expect(getDailyCheckInCtaLabel(dashboardFixture(false, 'check_in'))).toBe(
      'Complete daily check-in',
    );
  });

  it('offers update when today is already complete', () => {
    expect(getDailyCheckInCtaLabel(dashboardFixture(true, 'check_in'))).toBe(
      "View or update today's check-in",
    );
  });

  it('preserves unrelated coach actions', () => {
    expect(getDailyCheckInCtaLabel(dashboardFixture(false, 'workout'))).toBe(
      'Fallback CTA',
    );
  });
});
