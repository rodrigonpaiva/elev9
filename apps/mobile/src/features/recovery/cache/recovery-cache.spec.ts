import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  GetCurrentRecoveryExperienceResponse,
  GetRecoveryExperienceHistoryResponse,
} from '@elev9/types';

import {
  AsyncStorageRecoveryCache,
  getRecoveryCacheKey,
} from './recovery-cache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const ownerKey = 'session-owner-a1234567';
const savedAt = '2026-07-28T10:00:00.000Z';

const current: GetCurrentRecoveryExperienceResponse = {
  availability: 'available',
  recovery: {
    score: 78,
    fatigueScore: 22,
    category: 'good',
    freshness: 'current',
    lastUpdatedAt: savedAt,
    trend: 'stable',
    breakdown: [],
    insight: {
      tone: 'positive',
      titleKey: 'title',
      bodyKey: 'body',
      action: 'train_as_planned',
    },
  },
};

const history: GetRecoveryExperienceHistoryResponse = {
  range: { days: 7 },
  items: [],
  trend: { direction: 'insufficient_data', comparedDays: 0 },
};

describe('AsyncStorageRecoveryCache', () => {
  const cache = new AsyncStorageRecoveryCache();

  beforeEach(() => {
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
    storage.removeItem.mockResolvedValue(undefined);
  });

  it('writes current and history independently and reads the merged snapshot', async () => {
    await cache.writeHistory(ownerKey, history);
    expect(storage.setItem).toHaveBeenCalled();

    const historyRecord = JSON.parse(storage.setItem.mock.calls[0][1]);
    storage.getItem.mockResolvedValueOnce(JSON.stringify(historyRecord));
    await cache.writeCurrent(ownerKey, current);

    const currentRecord = JSON.parse(storage.setItem.mock.calls[1][1]);
    storage.getItem.mockResolvedValueOnce(JSON.stringify(currentRecord));
    await expect(cache.read(ownerKey)).resolves.toEqual({
      current,
      history,
      savedAt: currentRecord.savedAt,
      historySavedAt: currentRecord.historySavedAt,
    });
  });

  it('does not persist processing failures', async () => {
    await cache.writeCurrent(ownerKey, {
      availability: 'processing_failed',
      recovery: null,
    });

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('removes corrupted or mismatched-owner records', async () => {
    storage.getItem.mockResolvedValueOnce('{bad json');
    await expect(cache.read(ownerKey)).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(getRecoveryCacheKey(ownerKey));

    jest.clearAllMocks();
    storage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        version: 1,
        ownerKey: 'session-other-12345678',
        savedAt,
        current: null,
        history: null,
      }),
    );
    await expect(cache.read(ownerKey)).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(getRecoveryCacheKey(ownerKey));
  });

  it('isolates storage failures from the Recovery experience', async () => {
    storage.getItem.mockRejectedValueOnce(new Error('quota')); 
    await expect(cache.read(ownerKey)).resolves.toBeNull();

    storage.setItem.mockRejectedValueOnce(new Error('quota'));
    await expect(cache.writeCurrent(ownerKey, current)).resolves.toBeUndefined();

    storage.removeItem.mockRejectedValueOnce(new Error('locked'));
    await expect(cache.remove(ownerKey)).resolves.toBeUndefined();
  });
});
