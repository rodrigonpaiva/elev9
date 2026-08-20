import { Injectable, Logger } from '@nestjs/common';

import { sanitizeRequestId } from '../security/redaction';
import type { RateLimitPolicy } from './rate-limit.config';

export type RateLimitMetricSnapshot = Readonly<{
  route: string;
  policyId: string;
  method: string;
  count: number;
}>;

@Injectable()
export class RateLimitMetrics {
  private readonly logger = new Logger(RateLimitMetrics.name);
  private readonly counters = new Map<string, RateLimitMetricSnapshot>();

  recordExceeded(input: {
    policy: RateLimitPolicy;
    method: string;
    requestId?: string;
  }): void {
    const method = input.method.toUpperCase();
    const key = `${input.policy.id}|${method}`;
    const current = this.counters.get(key);
    this.counters.set(key, {
      route: input.policy.id,
      policyId: input.policy.id,
      method,
      count: (current?.count ?? 0) + 1,
    });

    this.logger.warn({
      event: 'rate_limit_exceeded',
      policyId: input.policy.id,
      method,
      windowMs: input.policy.windowMs,
      requestId: sanitizeRequestId(input.requestId) ?? 'unavailable',
    });
  }

  snapshot(): readonly RateLimitMetricSnapshot[] {
    return [...this.counters.values()];
  }

  clear(): void {
    this.counters.clear();
  }
}
