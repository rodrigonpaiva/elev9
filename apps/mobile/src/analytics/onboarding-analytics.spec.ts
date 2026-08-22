import {
  createOnboardingAnalytics,
  trackOnboardingEvent,
} from './onboarding-analytics';

describe('onboarding analytics', () => {
  it('preserves the flow id on resume and deduplicates start', () => {
    const provider = { track: jest.fn() };
    const analytics = createOnboardingAnalytics(provider as never);
    const context = analytics.begin('real');

    analytics.track('onboarding_started', {
      schemaVersion: 'onboarding-activation.v1',
      ...context,
    });
    analytics.resume(context);
    trackOnboardingEvent(
      'onboarding_resumed',
      { resumeReason: 'app_reopened' },
      'real',
      analytics,
    );
    trackOnboardingEvent(
      'onboarding_resumed',
      { resumeReason: 'app_reopened' },
      'real',
      analytics,
    );

    expect(provider.track).toHaveBeenCalledTimes(2);
    expect(provider.track.mock.calls[1][1]).toMatchObject({
      flowSessionId: context.flowSessionId,
    });
  });

  it('supports completion without sensitive properties', () => {
    const provider = { track: jest.fn() };
    const analytics = createOnboardingAnalytics(provider as never);

    trackOnboardingEvent('onboarding_completed', {}, 'real', analytics);

    expect(provider.track.mock.calls[0][0]).toBe('onboarding_completed');
    expect(provider.track.mock.calls[0][1]).not.toHaveProperty('email');
    expect(provider.track.mock.calls[0][1]).not.toHaveProperty('token');
  });
});
