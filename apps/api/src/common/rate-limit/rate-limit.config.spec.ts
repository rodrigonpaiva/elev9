import {
  DEFAULT_RATE_LIMIT_POLICIES,
  findRateLimitPolicy,
  resolveRateLimitConfig,
} from './rate-limit.config';

describe('rate limit configuration', () => {
  it('has predictable memory defaults in test', () => {
    expect(resolveRateLimitConfig({ nodeEnv: 'test' })).toMatchObject({
      enabled: true,
      store: 'memory',
    });
  });

  it('requires explicit configuration outside development/test', () => {
    expect(() => resolveRateLimitConfig({ nodeEnv: 'production' })).toThrow(
      'RATE_LIMIT_ENABLED must be configured',
    );
    expect(() =>
      resolveRateLimitConfig({
        nodeEnv: 'production',
        enabled: 'true',
      }),
    ).toThrow('RATE_LIMIT_STORE must be memory or redis');
  });

  it('rejects invalid configuration values', () => {
    expect(() =>
      resolveRateLimitConfig({ nodeEnv: 'test', enabled: 'yes' }),
    ).toThrow('RATE_LIMIT_ENABLED must be true or false');
    expect(() =>
      resolveRateLimitConfig({ nodeEnv: 'test', store: 'local' }),
    ).toThrow('RATE_LIMIT_STORE must be memory or redis');
  });

  it('keeps independent policies for sensitive endpoints and excludes health', () => {
    expect(findRateLimitPolicy('POST', '/auth/login')?.id).toBe('auth.login');
    expect(findRateLimitPolicy('POST', '/ai/chat')?.id).toBe('ai.chat');
    expect(findRateLimitPolicy('POST', '/nutrition/logs')?.id).toBe(
      'nutrition.meal.write',
    );
    expect(findRateLimitPolicy('GET', '/health')).toBeUndefined();
    expect(DEFAULT_RATE_LIMIT_POLICIES.length).toBeGreaterThan(1);
  });
});
