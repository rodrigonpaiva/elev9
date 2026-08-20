import { Logger } from '@nestjs/common';

import { RateLimitMetrics } from './rate-limit.metrics';

describe('RateLimitMetrics', () => {
  it('counts by policy and method without adding identity cardinality', () => {
    const metrics = new RateLimitMetrics();
    const policy = {
      id: 'auth.login',
      max: 10,
      windowMs: 60_000,
      keyStrategy: 'ip' as const,
    };

    metrics.recordExceeded({
      policy,
      method: 'post',
      requestId: 'request-1',
    });
    metrics.recordExceeded({
      policy,
      method: 'POST',
      requestId: 'request-2',
    });

    expect(metrics.snapshot()).toEqual([
      {
        route: 'auth.login',
        policyId: 'auth.login',
        method: 'POST',
        count: 2,
      },
    ]);
  });

  it('does not emit sensitive request identifiers in 429 logs', () => {
    const metrics = new RateLimitMetrics();
    const warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    metrics.recordExceeded({
      policy: {
        id: 'ai.chat',
        max: 20,
        windowMs: 60_000,
        keyStrategy: 'ip+user',
      },
      method: 'POST',
      requestId: 'person@example.com',
    });

    expect(JSON.stringify(warnSpy.mock.calls[0])).not.toContain(
      'person@example.com',
    );
    warnSpy.mockRestore();
  });
});
