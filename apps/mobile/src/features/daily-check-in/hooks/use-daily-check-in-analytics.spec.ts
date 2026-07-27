import { mapDailyCheckInAnalyticsError } from './use-daily-check-in-analytics';

describe('Daily Check-in analytics mapping', () => {
  it.each([
    ['NETWORK_ERROR', 'network'],
    ['SESSION_EXPIRED', 'authentication'],
    ['PROFILE_UNAVAILABLE', 'profile_unavailable'],
    ['INVALID_INPUT', 'validation'],
    ['RECOVERY_FAILED', 'recovery_processing'],
    ['SERVER_ERROR', 'server'],
    ['UNEXPECTED', 'unknown'],
  ])('maps %s to %s', (code, category) => {
    expect(mapDailyCheckInAnalyticsError(code)).toBe(category);
  });
});
