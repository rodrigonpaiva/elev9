import {
  containsForbiddenProperty,
  createProductAnalytics,
  NoopProductAnalytics,
} from './product-analytics';
import {
  ONBOARDING_ANALYTICS_SCHEMA_VERSION,
  createOnboardingAnalytics,
  trackOnboardingEvent,
} from './onboarding-analytics';

describe('Product analytics boundary', () => {
  it('keeps the default provider noop', () => {
    expect(() => {
      new NoopProductAnalytics().track('daily_check_in_started', {
        mode: 'create',
        entryPoint: 'other',
        flowSessionId: 'flow-1',
      });
    }).not.toThrow();
  });

  it('allows only the documented safe properties', () => {
    const provider = { track: jest.fn() };
    const analytics = createProductAnalytics(provider, true);

    analytics.track('daily_check_in_submit_succeeded', {
      mode: 'create',
      attemptNumber: 1,
      durationMs: 120,
      flowSessionId: 'flow-1',
    });

    expect(provider.track).toHaveBeenCalledTimes(1);
  });

  it('accepts Recovery navigation intent events without health-state properties', () => {
    const provider = { track: jest.fn() };
    const analytics = createProductAnalytics(provider, true);

    analytics.track('recovery_dashboard_cta_selected', {
      entryPoint: 'dashboard',
    });
    analytics.track('recovery_screen_viewed', { entryPoint: 'unknown' });
    analytics.track('recovery_refresh_requested', {
      trigger: 'pull_to_refresh',
    });
    analytics.track('recovery_retry_requested', {
      resource: 'current_and_history',
    });
    analytics.track('recovery_history_retry_requested', {
      resource: 'history',
    });
    analytics.track('recovery_check_in_cta_selected', {
      entryPoint: 'recovery',
    });

    expect(provider.track).toHaveBeenCalledTimes(6);
  });

  it('accepts Nutrition telemetry with only operational dimensions', () => {
    const provider = { track: jest.fn() };
    const analytics = createProductAnalytics(provider, true);

    analytics.track('nutrition_dashboard_card_viewed', {
      screen: 'dashboard',
      component: 'nutrition_card',
      availability: 'available',
      freshness: 'current',
      source: 'canonical_read_model',
    });
    analytics.track('nutrition_dashboard_action_selected', {
      actionType: 'open_today_meals',
      navigationDestination: 'today_meals',
      outcome: 'accepted',
    });

    expect(provider.track).toHaveBeenCalledTimes(2);
  });

  it('rejects Nutrition payload and identity properties', () => {
    const provider = { track: jest.fn() };
    const analytics = createProductAnalytics(provider, true);

    analytics.track('nutrition_dashboard_card_viewed', {
      screen: 'dashboard',
      component: 'nutrition_card',
      availability: 'available',
      freshness: 'current',
      source: 'canonical_read_model',
      calories: 1_420,
      userId: 'user-1',
    } as never);

    expect(provider.track).not.toHaveBeenCalled();
  });

  it('drops sensitive Recovery properties even when supplied by an untyped caller', () => {
    const provider = { track: jest.fn() };
    const analytics = createProductAnalytics(provider, true);

    analytics.track('recovery_screen_viewed', {
      entryPoint: 'unknown',
      score: 82,
    } as never);

    expect(provider.track).not.toHaveBeenCalled();
  });

  it('drops forbidden health and identity properties before a provider sees them', () => {
    const provider = { track: jest.fn() };
    const analytics = createProductAnalytics(provider, true);

    analytics.track('daily_check_in_started', {
      mode: 'create',
      entryPoint: 'other',
      flowSessionId: 'flow-1',
      energyLevel: 1,
    } as never);

    expect(provider.track).not.toHaveBeenCalled();
    expect(containsForbiddenProperty({ nested: { readinessScore: 20 } })).toBe(
      true,
    );
  });

  it('isolates provider failures from the product flow', () => {
    const analytics = createProductAnalytics(
      {
        track: () => {
          throw new Error('provider unavailable');
        },
      },
      true,
    );

    expect(() =>
      analytics.track('daily_check_in_cta_selected', {
        completionState: 'pending',
        entryPoint: 'dashboard',
      }),
    ).not.toThrow();
  });

  it('emits the onboarding schema with only non-sensitive correlation data', () => {
    const provider = { track: jest.fn() };
    const analytics = createOnboardingAnalytics(
      createProductAnalytics(provider, true),
    );

    analytics.begin('real');
    trackOnboardingEvent('onboarding_started', {}, 'real', analytics);
    trackOnboardingEvent(
      'onboarding_error',
      { stage: 'profile', errorCategory: 'validation' },
      'real',
      analytics,
    );

    expect(provider.track).toHaveBeenCalledTimes(2);
    expect(provider.track.mock.calls[0][0]).toBe('onboarding_started');
    expect(provider.track.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
        mode: 'real',
      }),
    );
    expect(provider.track.mock.calls[0][1]).not.toEqual(
      expect.objectContaining({
        email: expect.anything(),
        name: expect.anything(),
        token: expect.anything(),
      }),
    );
  });

  it('accepts the complete onboarding and activation event catalog', () => {
    const provider = { track: jest.fn() };
    const analytics = createOnboardingAnalytics(
      createProductAnalytics(provider, true),
    );
    const context = analytics.begin('real');
    const base = {
      schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
      ...context,
    };

    const events = [
      ['onboarding_started', base],
      ['registration_started', base],
      ['registration_completed', base],
      ['profile_started', base],
      ['profile_completed', base],
      ['nutrition_started', base],
      ['nutrition_completed', base],
      ['plan_created', base],
      ['onboarding_resumed', { ...base, resumeReason: 'partial_state' }],
      ['onboarding_abandoned', { ...base, stage: 'profile' }],
      ['home_reached', base],
      ['first_workout_started', base],
      ['first_workout_completed', base],
      [
        'onboarding_error',
        { ...base, stage: 'profile', errorCategory: 'validation' },
      ],
      ['session_expired_during_onboarding', { ...base, stage: 'profile' }],
      ['demo_started', { ...base, mode: 'demo' }],
      ['demo_completed', { ...base, mode: 'demo' }],
      ['demo_reset', { ...base, mode: 'demo' }],
    ] as const;

    for (const [eventName, properties] of events) {
      analytics.track(eventName as never, properties as never);
    }

    expect(provider.track).toHaveBeenCalledTimes(events.length);
  });

  it('deduplicates rerenders and retries without changing the flow context', () => {
    const provider = { track: jest.fn() };
    const analytics = createOnboardingAnalytics(
      createProductAnalytics(provider, true),
    );

    const context = analytics.begin('real');
    trackOnboardingEvent('profile_started', {}, 'real', analytics);
    trackOnboardingEvent('profile_started', {}, 'real', analytics);
    trackOnboardingEvent(
      'onboarding_error',
      { stage: 'profile', errorCategory: 'network' },
      'real',
      analytics,
    );
    trackOnboardingEvent(
      'onboarding_error',
      { stage: 'profile', errorCategory: 'network' },
      'real',
      analytics,
    );

    expect(provider.track).toHaveBeenCalledTimes(2);
    expect(analytics.getContext()).toEqual(context);
  });

  it('keeps demo events separate from real activation events', () => {
    const provider = { track: jest.fn() };
    const analytics = createOnboardingAnalytics(
      createProductAnalytics(provider, true),
    );

    const demoContext = analytics.begin('demo');
    trackOnboardingEvent('demo_started', {}, 'demo', analytics);
    trackOnboardingEvent('home_reached', {}, 'demo', analytics);

    expect(provider.track).toHaveBeenCalledWith(
      'home_reached',
      expect.objectContaining({
        flowSessionId: demoContext.flowSessionId,
        mode: 'demo',
      }),
    );
    expect(provider.track).not.toHaveBeenCalledWith(
      'home_reached',
      expect.objectContaining({ mode: 'real' }),
    );
  });

  it('does not block the flow when analytics is unavailable', () => {
    const analytics = createOnboardingAnalytics(
      createProductAnalytics(
        {
          track: () => {
            throw new Error('offline');
          },
        },
        true,
      ),
    );

    expect(() => {
      trackOnboardingEvent('onboarding_started', {}, 'real', analytics);
      trackOnboardingEvent('home_reached', {}, 'real', analytics);
    }).not.toThrow();
  });

  it('rejects sensitive properties from onboarding events', () => {
    const provider = { track: jest.fn() };
    const analytics = createOnboardingAnalytics(
      createProductAnalytics(provider, true),
    );

    analytics.begin('real');
    analytics.track('onboarding_started', {
      schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
      flowSessionId: 'onb-test',
      mode: 'real',
      password: 'secret',
    } as never);

    expect(provider.track).not.toHaveBeenCalled();
  });
});
