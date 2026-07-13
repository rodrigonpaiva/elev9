import type { CoachExpertTrace } from './coach-expert-observability.types';

const DEFAULT_MAX_ITEMS = 1000;
const DEFAULT_RETENTION_MS = 86400000;

export class CoachExpertRetentionPolicy {
  private readonly maxItems = this.readInteger(
    'AI_EXPERT_TRACE_MAX_ITEMS',
    DEFAULT_MAX_ITEMS,
  );

  private readonly retentionMs = this.readInteger(
    'AI_EXPERT_TRACE_RETENTION_MS',
    DEFAULT_RETENTION_MS,
  );

  getMaxItems(): number {
    return this.maxItems;
  }

  getRetentionMs(): number {
    return this.retentionMs;
  }

  shouldRetain(input: { trace: CoachExpertTrace; now: number }): boolean {
    return (
      input.now - new Date(input.trace.updatedAt).getTime() <= this.retentionMs
    );
  }

  prune<T extends { createdAtMs: number; updatedAtMs: number }>(
    entries: Map<string, T>,
    now: number,
  ): void {
    for (const [key, value] of entries) {
      if (now - value.updatedAtMs > this.retentionMs) {
        entries.delete(key);
      }
    }

    if (entries.size <= this.maxItems) {
      return;
    }

    const overflow = entries.size - this.maxItems;
    const removable = [...entries.entries()]
      .sort((left, right) => {
        if (left[1].updatedAtMs !== right[1].updatedAtMs) {
          return left[1].updatedAtMs - right[1].updatedAtMs;
        }

        return left[1].createdAtMs - right[1].createdAtMs;
      })
      .slice(0, overflow);

    for (const [key] of removable) {
      entries.delete(key);
    }
  }

  private readInteger(key: string, fallback: number): number {
    const raw = process.env[key];

    if (typeof raw !== 'string' || raw.trim() === '') {
      return fallback;
    }

    if (!/^[-]?\d+$/.test(raw.trim())) {
      throw new Error(`Invalid value for ${key}.`);
    }

    const value = Number.parseInt(raw.trim(), 10);

    if (!Number.isFinite(value) || value < 1) {
      throw new Error(`Invalid value for ${key}.`);
    }

    return value;
  }
}
