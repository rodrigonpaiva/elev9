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

  it('applies the configured LLM quota to the existing independent policy', () => {
    const previousMax = process.env.AI_LLM_MAX_REQUESTS_PER_USER;
    const previousWindow = process.env.AI_LLM_QUOTA_WINDOW_MS;
    process.env.AI_LLM_MAX_REQUESTS_PER_USER = '7';
    process.env.AI_LLM_QUOTA_WINDOW_MS = '120000';

    try {
      const config = resolveRateLimitConfig({ nodeEnv: 'test' });
      expect(
        config.policies.find((policy) => policy.id === 'ai.chat'),
      ).toMatchObject({
        max: 7,
        windowMs: 120000,
      });
    } finally {
      if (previousMax === undefined)
        delete process.env.AI_LLM_MAX_REQUESTS_PER_USER;
      else process.env.AI_LLM_MAX_REQUESTS_PER_USER = previousMax;
      if (previousWindow === undefined)
        delete process.env.AI_LLM_QUOTA_WINDOW_MS;
      else process.env.AI_LLM_QUOTA_WINDOW_MS = previousWindow;
    }
  });
});
