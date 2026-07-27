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
