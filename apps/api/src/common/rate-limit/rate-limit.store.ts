export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

export type RateLimitStoreResult = {
  count: number;
  resetAt: number;
};

export interface RateLimitStore {
  increment(
    key: string,
    windowMs: number,
    now?: number,
  ): Promise<RateLimitStoreResult>;
}

type MemoryEntry = RateLimitStoreResult;

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, MemoryEntry>();

  async increment(
    key: string,
    windowMs: number,
    now = Date.now(),
  ): Promise<RateLimitStoreResult> {
    const current = this.entries.get(key);
    if (!current || current.resetAt <= now) {
      const next = { count: 1, resetAt: now + windowMs };
      this.entries.set(key, next);
      return next;
    }

    const next = { count: current.count + 1, resetAt: current.resetAt };
    this.entries.set(key, next);
    return next;
  }

  clear(): void {
    this.entries.clear();
  }
}
