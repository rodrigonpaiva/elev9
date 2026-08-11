import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
} from '@elev9/types';

import {
  buildRecoveryCacheRecord,
  parseRecoveryCacheRecord,
  type RecoveryCacheRecord,
  type RecoveryCacheSnapshot,
} from './recovery-cache-schema';

export const RECOVERY_CACHE_KEY_PREFIX = 'elev9.recovery-experience.v1:';

export type RecoveryCache = {
  read(ownerKey: string): Promise<RecoveryCacheSnapshot | null>;
  writeCurrent(
    ownerKey: string,
    current: GetCurrentRecoveryExperienceResponse,
  ): Promise<void>;
  writeHistory(
    ownerKey: string,
    history: GetRecoveryExperienceHistoryResponse,
  ): Promise<void>;
  remove(ownerKey: string): Promise<void>;
};

export class AsyncStorageRecoveryCache implements RecoveryCache {
  async read(ownerKey: string): Promise<RecoveryCacheSnapshot | null> {
    if (!ownerKey) return null;

    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(getRecoveryCacheKey(ownerKey));
    } catch {
      return null;
    }
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      await this.remove(ownerKey);
      return null;
    }

    const record = parseRecoveryCacheRecord(parsed);
    if (!record || record.ownerKey !== ownerKey) {
      await this.remove(ownerKey);
      return null;
    }

    return toSnapshot(record);
  }

  async writeCurrent(
    ownerKey: string,
    current: GetCurrentRecoveryExperienceResponse,
  ): Promise<void> {
    const previous = await this.readRecord(ownerKey);
    const record = buildRecoveryCacheRecord({
      ownerKey,
      current,
      history: previous?.history ?? null,
      historySavedAt: previous?.historySavedAt,
      savedAt: new Date().toISOString(),
    });
    if (!record || current.availability === 'processing_failed') return;
    await this.write(ownerKey, record);
  }

  async writeHistory(
    ownerKey: string,
    history: GetRecoveryExperienceHistoryResponse,
  ): Promise<void> {
    const previous = await this.readRecord(ownerKey);
    const record = buildRecoveryCacheRecord({
      ownerKey,
      current: previous?.current ?? null,
      history,
      savedAt: previous?.savedAt ?? new Date().toISOString(),
      historySavedAt: new Date().toISOString(),
    });
    if (record) await this.write(ownerKey, record);
  }

  async remove(ownerKey: string): Promise<void> {
    if (!ownerKey) return;
    try {
      await AsyncStorage.removeItem(getRecoveryCacheKey(ownerKey));
    } catch {
      // Cache cleanup must not block logout or account switching.
    }
  }

  private async readRecord(
    ownerKey: string,
  ): Promise<RecoveryCacheRecord | null> {
    const snapshot = await this.read(ownerKey);
    if (!snapshot) return null;
    return buildRecoveryCacheRecord({ ownerKey, ...snapshot });
  }

  private async write(
    ownerKey: string,
    record: RecoveryCacheRecord,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        getRecoveryCacheKey(ownerKey),
        JSON.stringify(record),
      );
    } catch {
      // Cache write failures never replace a successful network response.
    }
  }
}

function toSnapshot(record: RecoveryCacheRecord): RecoveryCacheSnapshot {
  return {
    current: record.current,
    history: record.history,
    savedAt: record.savedAt,
    ...(record.historySavedAt ? { historySavedAt: record.historySavedAt } : {}),
  };
}

export function getRecoveryCacheKey(ownerKey: string): string {
  return `${RECOVERY_CACHE_KEY_PREFIX}${ownerKey}`;
}

export const recoveryCache: RecoveryCache = new AsyncStorageRecoveryCache();

export async function clearRecoveryCacheForOwner(
  ownerKey: string | null,
): Promise<void> {
  if (ownerKey) await recoveryCache.remove(ownerKey);
}
