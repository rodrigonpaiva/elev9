import { createProductAnalytics } from './product-analytics';
import {
  trackDailyWorkoutCompletionConfirmed,
  trackDailyWorkoutError,
  trackDailyWorkoutRecoveryPending,
  trackDailyWorkoutRetry,
  trackDailyWorkoutSessionExpired,
} from './daily-workout-analytics';

describe('daily workout analytics', () => {
  it('emits only operational real/demo state properties', () => {
    const provider = { track: jest.fn() };
    const analytics = createProductAnalytics(provider, true);

    trackDailyWorkoutError(
      {
        mode: 'real',
        stage: 'workout',
        errorCategory: 'network',
      },
      analytics,
    );
    trackDailyWorkoutRetry(
      { mode: 'demo', stage: 'timer', retryTarget: 'load' },
      analytics,
    );
    trackDailyWorkoutSessionExpired(
      { mode: 'real', stage: 'completion' },
      analytics,
    );
    trackDailyWorkoutRecoveryPending('real', analytics);
    trackDailyWorkoutCompletionConfirmed('demo', analytics);

    expect(provider.track).toHaveBeenCalledTimes(5);
    expect(
      provider.track.mock.calls.flatMap((call) => Object.keys(call[1])),
    ).not.toEqual(
      expect.arrayContaining(['email', 'token', 'name', 'readinessScore']),
    );
  });
});
