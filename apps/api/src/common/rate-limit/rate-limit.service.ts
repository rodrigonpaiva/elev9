import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

import {
  findRateLimitPolicy,
  RateLimitConfig,
  RateLimitPolicy,
} from './rate-limit.config';
import { RateLimitStore, RateLimitStoreResult } from './rate-limit.store';

export type RateLimitDecision = {
  policy: RateLimitPolicy;
  result: RateLimitStoreResult;
  allowed: boolean;
};

@Injectable()
export class RateLimitService {
  constructor(
    private readonly store: RateLimitStore,
    private readonly config: RateLimitConfig,
  ) {}

  async check(
    request: Request & { authUser?: { id: string } },
  ): Promise<RateLimitDecision | undefined> {
    if (!this.config.enabled) return undefined;

    const policy = findRateLimitPolicy(
      request.method,
      request.path,
      this.config.policies,
    );
    if (!policy) return undefined;

    const identity = request.authUser?.id;
    const ip = request.ip || 'unknown';
    const rawKey =
      policy.keyStrategy === 'ip+user' && identity
        ? `${policy.id}|ip:${ip}|user:${identity}`
        : `${policy.id}|ip:${ip}`;
    const key = createHash('sha256').update(rawKey).digest('hex');
    const result = await this.store.increment(key, policy.windowMs);

    return {
      policy,
      result,
      allowed: result.count <= policy.max,
    };
  }
}
