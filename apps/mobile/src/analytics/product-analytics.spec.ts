import {
  containsForbiddenProperty,
  createProductAnalytics,
  NoopProductAnalytics,
} from './product-analytics';

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
});
