import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
  RecoveryExperienceCategory,
  RecoveryExperienceFactorImpact,
  RecoveryExperienceFactorKey,
  RecoveryExperienceFreshness,
  RecoveryExperienceInsightAction,
  RecoveryExperienceInsight,
  RecoveryExperienceInsightTone,
  RecoveryExperienceTrend,
  RecoveryExperienceTrendDirection,
} from '@elev9/types';

export const RECOVERY_CACHE_VERSION = 1 as const;
export const RECOVERY_CACHE_SOFT_TTL_MS = 24 * 60 * 60 * 1000;
export const RECOVERY_CACHE_HARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type RecoveryCacheAge = 'recent' | 'old' | 'expired';

export type RecoveryCacheRecord = {
  version: typeof RECOVERY_CACHE_VERSION;
  ownerKey: string;
  savedAt: string;
  current: GetCurrentRecoveryExperienceResponse | null;
  history: GetRecoveryExperienceHistoryResponse | null;
  historySavedAt?: string;
};

export type RecoveryCacheSnapshot = {
  current: GetCurrentRecoveryExperienceResponse | null;
  history: GetRecoveryExperienceHistoryResponse | null;
  savedAt: string;
  historySavedAt?: string;
};

export function buildRecoveryCacheRecord(input: {
  ownerKey: string;
  current: GetCurrentRecoveryExperienceResponse | null;
  history: GetRecoveryExperienceHistoryResponse | null;
  savedAt: string;
  historySavedAt?: string;
}): RecoveryCacheRecord | null {
  if (!isValidOwnerKey(input.ownerKey) || !isValidTimestamp(input.savedAt)) {
    return null;
  }

  const current =
    input.current === null ? null : sanitizeCurrent(input.current);
  const history =
    input.history === null ? null : sanitizeHistory(input.history);
  if (
    (input.current !== null && !current) ||
    (input.history !== null && !history)
  ) {
    return null;
  }

  return {
    version: RECOVERY_CACHE_VERSION,
    ownerKey: input.ownerKey,
    savedAt: input.savedAt,
    current,
    history,
    ...(input.historySavedAt && isValidTimestamp(input.historySavedAt)
      ? { historySavedAt: input.historySavedAt }
      : {}),
  };
}

export function parseRecoveryCacheRecord(
  value: unknown,
): RecoveryCacheRecord | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'version',
      'ownerKey',
      'savedAt',
      'current',
      'history',
      'historySavedAt',
    ]) ||
    value.version !== RECOVERY_CACHE_VERSION ||
    typeof value.ownerKey !== 'string' ||
    !isValidOwnerKey(value.ownerKey) ||
    typeof value.savedAt !== 'string' ||
    !isValidTimestamp(value.savedAt)
  ) {
    return null;
  }

  const current =
    value.current === null ? null : sanitizeCurrent(value.current);
  const history =
    value.history === null ? null : sanitizeHistory(value.history);
  if (
    (value.current !== null && !current) ||
    (value.history !== null && !history)
  ) {
    return null;
  }

  if (
    value.historySavedAt !== undefined &&
    (typeof value.historySavedAt !== 'string' ||
      !isValidTimestamp(value.historySavedAt))
  ) {
    return null;
  }

  return {
    version: RECOVERY_CACHE_VERSION,
    ownerKey: value.ownerKey,
    savedAt: value.savedAt,
    current,
    history,
    ...(value.historySavedAt ? { historySavedAt: value.historySavedAt } : {}),
  };
}

export function getRecoveryCacheAge(
  savedAt: string,
  now = Date.now(),
): RecoveryCacheAge {
  const savedAtMs = Date.parse(savedAt);
  if (!Number.isFinite(savedAtMs) || now - savedAtMs < 0) {
    return 'expired';
  }
  const ageMs = now - savedAtMs;
  if (ageMs > RECOVERY_CACHE_HARD_TTL_MS) return 'expired';
  if (ageMs > RECOVERY_CACHE_SOFT_TTL_MS) return 'old';
  return 'recent';
}

function sanitizeCurrent(
  value: unknown,
): GetCurrentRecoveryExperienceResponse | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['availability', 'recovery'])) {
    return null;
  }

  if (!isAvailability(value.availability)) return null;
  if (value.recovery === null) {
    return { availability: value.availability, recovery: null };
  }
  if (!isRecord(value.recovery)) return null;

  const recovery = value.recovery;
  if (
    !hasOnlyKeys(recovery, [
      'score',
      'fatigueScore',
      'category',
      'freshness',
      'lastUpdatedAt',
      'trend',
      'breakdown',
      'insight',
    ]) ||
    typeof recovery.score !== 'number' ||
    !Number.isFinite(recovery.score) ||
    typeof recovery.fatigueScore !== 'number' ||
    !Number.isFinite(recovery.fatigueScore) ||
    !isCategory(recovery.category) ||
    !isFreshness(recovery.freshness) ||
    typeof recovery.lastUpdatedAt !== 'string' ||
    !isValidTimestamp(recovery.lastUpdatedAt) ||
    !isTrendDirection(recovery.trend) ||
    !Array.isArray(recovery.breakdown) ||
    !recovery.breakdown.every(isFactor) ||
    !isInsight(recovery.insight)
  ) {
    return null;
  }

  return {
    availability: value.availability,
    recovery: {
      score: recovery.score,
      fatigueScore: recovery.fatigueScore,
      category: recovery.category,
      freshness: recovery.freshness,
      lastUpdatedAt: recovery.lastUpdatedAt,
      trend: recovery.trend,
      breakdown: recovery.breakdown,
      insight: recovery.insight as RecoveryExperienceInsight,
    },
  };
}

function sanitizeHistory(
  value: unknown,
): GetRecoveryExperienceHistoryResponse | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ['range', 'items', 'trend'])) {
    return null;
  }
  if (
    !isRecord(value.range) ||
    !hasOnlyKeys(value.range, ['days']) ||
    value.range.days !== 7 ||
    !Array.isArray(value.items) ||
    !value.items.every(isHistoryItem) ||
    !isTrend(value.trend)
  ) {
    return null;
  }

  return {
    range: { days: 7 },
    items: value.items,
    trend: value.trend as RecoveryExperienceTrend,
  };
}

function isFactor(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['key', 'impact', 'labelKey', 'explanationKey']) &&
    isFactorKey(value.key) &&
    isImpact(value.impact) &&
    typeof value.labelKey === 'string' &&
    typeof value.explanationKey === 'string'
  );
}

function isInsight(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['tone', 'titleKey', 'bodyKey', 'action']) &&
    isTone(value.tone) &&
    typeof value.titleKey === 'string' &&
    typeof value.bodyKey === 'string' &&
    isAction(value.action)
  );
}

function isHistoryItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'localDate',
      'score',
      'category',
      'availability',
      'freshness',
    ]) &&
    typeof value.localDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.localDate) &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score) &&
    isCategory(value.category) &&
    isAvailability(value.availability) &&
    isFreshness(value.freshness)
  );
}

function isTrend(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['direction', 'comparedDays']) &&
    isTrendDirection(value.direction) &&
    typeof value.comparedDays === 'number' &&
    Number.isInteger(value.comparedDays) &&
    value.comparedDays >= 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isValidOwnerKey(value: string): boolean {
  return /^session-[a-z0-9-]{8,120}$/.test(value);
}

function isValidTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isAvailability(
  value: unknown,
): value is GetCurrentRecoveryExperienceResponse['availability'] {
  return [
    'available',
    'not_available',
    'insufficient_data',
    'processing_failed',
  ].includes(String(value));
}

function isCategory(value: unknown): value is RecoveryExperienceCategory {
  return ['low', 'moderate', 'good', 'high'].includes(String(value));
}

function isFreshness(value: unknown): value is RecoveryExperienceFreshness {
  return ['current', 'stale', 'legacy', 'unknown'].includes(String(value));
}

function isFactorKey(value: unknown): value is RecoveryExperienceFactorKey {
  return ['energy', 'sleep', 'muscle_soreness'].includes(String(value));
}

function isImpact(value: unknown): value is RecoveryExperienceFactorImpact {
  return ['positive', 'neutral', 'negative', 'unavailable'].includes(
    String(value),
  );
}

function isTone(value: unknown): value is RecoveryExperienceInsightTone {
  return ['supportive', 'caution', 'positive', 'neutral'].includes(
    String(value),
  );
}

function isAction(value: unknown): value is RecoveryExperienceInsightAction {
  return [
    'train_as_planned',
    'reduce_intensity',
    'prioritize_recovery',
    'complete_check_in',
    'try_again_later',
  ].includes(String(value));
}

function isTrendDirection(
  value: unknown,
): value is RecoveryExperienceTrendDirection {
  return ['improving', 'stable', 'declining', 'insufficient_data'].includes(
    String(value),
  );
}
