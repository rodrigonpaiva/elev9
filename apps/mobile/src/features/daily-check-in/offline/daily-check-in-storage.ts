import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SubmitDailyCheckInRequest } from '@elev9/types';

import {
  DAILY_CHECK_IN_OFFLINE_VERSION,
  type DailyCheckInDraft,
  type PendingDailyCheckInSubmission,
} from './daily-check-in-storage.types';

export const DAILY_CHECK_IN_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const DAILY_CHECK_IN_PENDING_TTL_MS = 72 * 60 * 60 * 1000;

const DRAFT_KEY = 'elev9.daily-check-in.v1.draft';
const PENDING_KEY = 'elev9.daily-check-in.v1.pending';
const FIELDS: Array<keyof SubmitDailyCheckInRequest> = [
  'energyLevel',
  'sleepQuality',
  'muscleSoreness',
  'motivationLevel',
];

export class DailyCheckInStorageError extends Error {
  constructor(
    readonly operation: 'read' | 'write' | 'clear',
    cause?: unknown,
  ) {
    super(`Daily Check-in storage ${operation} failed.`);
    this.name = 'DailyCheckInStorageError';
    this.cause = cause;
  }

  readonly cause?: unknown;
}

export type DailyCheckInStorage = {
  getDraft(): Promise<DailyCheckInDraft | null>;
  saveDraft(values: Partial<SubmitDailyCheckInRequest>): Promise<void>;
  clearDraft(): Promise<void>;
  getPending(): Promise<PendingDailyCheckInSubmission | null>;
  savePending(item: PendingDailyCheckInSubmission): Promise<void>;
  markPendingFailed(
    category: PendingDailyCheckInSubmission['lastErrorCategory'],
  ): Promise<void>;
  clearPending(): Promise<void>;
  clearAll(): Promise<void>;
};

export class AsyncStorageDailyCheckInStorage implements DailyCheckInStorage {
  async getDraft(): Promise<DailyCheckInDraft | null> {
    const value = await this.read(DRAFT_KEY);
    if (!value) {
      return null;
    }

    const draft = parseDraft(value);
    if (!draft || isExpired(draft.savedAt, DAILY_CHECK_IN_DRAFT_TTL_MS)) {
      await this.clearDraft();
      return null;
    }

    return draft;
  }

  async saveDraft(values: Partial<SubmitDailyCheckInRequest>): Promise<void> {
    if (Object.keys(values).length === 0) {
      await this.clearDraft();
      return;
    }

    if (!isValidDraftValues(values)) {
      throw new DailyCheckInStorageError('write');
    }

    const draft: DailyCheckInDraft = {
      version: DAILY_CHECK_IN_OFFLINE_VERSION,
      values: { ...values },
      savedAt: new Date().toISOString(),
    };

    await this.write(DRAFT_KEY, draft);
  }

  async clearDraft(): Promise<void> {
    await this.remove(DRAFT_KEY);
  }

  async getPending(): Promise<PendingDailyCheckInSubmission | null> {
    const value = await this.read(PENDING_KEY);
    if (!value) {
      return null;
    }

    const pending = parsePending(value);
    if (
      !pending ||
      isExpired(pending.createdAt, DAILY_CHECK_IN_PENDING_TTL_MS)
    ) {
      await this.clearPending();
      return null;
    }

    return pending;
  }

  async savePending(item: PendingDailyCheckInSubmission): Promise<void> {
    if (!parsePending(item)) {
      throw new DailyCheckInStorageError('write');
    }

    await this.write(PENDING_KEY, item);
  }

  async clearPending(): Promise<void> {
    await this.remove(PENDING_KEY);
  }

  async markPendingFailed(
    category: PendingDailyCheckInSubmission['lastErrorCategory'],
  ): Promise<void> {
    const pending = await this.getPending();
    if (!pending) {
      return;
    }

    await this.savePending({
      ...pending,
      status: 'failed',
      lastErrorCategory: category,
    });
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([DRAFT_KEY, PENDING_KEY]);
    } catch (error) {
      throw new DailyCheckInStorageError('clear', error);
    }
  }

  private async read(key: string): Promise<unknown | null> {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(key);
    } catch (error) {
      throw new DailyCheckInStorageError('read', error);
    }

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as unknown;
    } catch {
      await this.remove(key);
      return null;
    }
  }

  private async write(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new DailyCheckInStorageError('write', error);
    }
  }

  private async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw new DailyCheckInStorageError('clear', error);
    }
  }
}

export const dailyCheckInStorage = new AsyncStorageDailyCheckInStorage();

export async function clearDailyCheckInOfflineStorage(): Promise<void> {
  await dailyCheckInStorage.clearAll();
}

export async function getDailyCheckInOfflineState(): Promise<
  'idle' | 'queued' | 'failed'
> {
  const pending = await dailyCheckInStorage.getPending();
  if (!pending) {
    return 'idle';
  }

  return pending.status === 'failed' ? 'failed' : 'queued';
}

function parseDraft(value: unknown): DailyCheckInDraft | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['version', 'values', 'savedAt']) ||
    value.version !== DAILY_CHECK_IN_OFFLINE_VERSION
  ) {
    return null;
  }

  if (
    typeof value.savedAt !== 'string' ||
    !isValidTimestamp(value.savedAt) ||
    !isValidDraftValues(value.values)
  ) {
    return null;
  }

  return {
    version: DAILY_CHECK_IN_OFFLINE_VERSION,
    values: value.values,
    savedAt: value.savedAt,
  };
}

function parsePending(value: unknown): PendingDailyCheckInSubmission | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'version',
      'submissionId',
      'payload',
      'createdAt',
      'lastAttemptAt',
      'attemptCount',
      'status',
      'lastErrorCategory',
    ]) ||
    value.version !== DAILY_CHECK_IN_OFFLINE_VERSION
  ) {
    return null;
  }

  if (
    typeof value.submissionId !== 'string' ||
    value.submissionId.trim() === '' ||
    !isValidSubmitPayload(value.payload) ||
    typeof value.createdAt !== 'string' ||
    !isValidTimestamp(value.createdAt) ||
    (value.lastAttemptAt !== undefined &&
      (typeof value.lastAttemptAt !== 'string' ||
        !isValidTimestamp(value.lastAttemptAt))) ||
    !Number.isInteger(value.attemptCount) ||
    (value.attemptCount as number) < 0 ||
    !['pending', 'syncing', 'failed'].includes(String(value.status)) ||
    (value.lastErrorCategory !== undefined &&
      ![
        'network',
        'authentication',
        'profile_unavailable',
        'validation',
        'recovery_processing',
        'server',
        'unknown',
      ].includes(String(value.lastErrorCategory)))
  ) {
    return null;
  }

  return value as unknown as PendingDailyCheckInSubmission;
}

function isValidDraftValues(
  values: unknown,
): values is Partial<SubmitDailyCheckInRequest> {
  if (!isRecord(values)) {
    return false;
  }

  return Object.entries(values).every(([key, value]) => {
    return (
      FIELDS.includes(key as keyof SubmitDailyCheckInRequest) && isScale(value)
    );
  });
}

function isValidSubmitPayload(
  value: unknown,
): value is SubmitDailyCheckInRequest {
  if (!isRecord(value) || Object.keys(value).length !== FIELDS.length) {
    return false;
  }

  return FIELDS.every((field) => isScale(value[field]));
}

function isScale(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

function isValidTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isExpired(value: string, ttlMs: number): boolean {
  const age = Date.now() - Date.parse(value);
  return age > ttlMs || age < 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
