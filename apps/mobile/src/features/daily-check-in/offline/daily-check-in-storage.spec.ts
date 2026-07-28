import type { SubmitDailyCheckInRequest } from '@elev9/types';

const store = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => store.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    store.delete(key);
  }),
  multiRemove: jest.fn(async (keys: string[]) => {
    keys.forEach((key) => store.delete(key));
  }),
}));

import {
  AsyncStorageDailyCheckInStorage,
  DAILY_CHECK_IN_DRAFT_TTL_MS,
  DAILY_CHECK_IN_PENDING_TTL_MS,
} from './daily-check-in-storage';

const payload: SubmitDailyCheckInRequest = {
  energyLevel: 4,
  sleepQuality: 3,
  muscleSoreness: 2,
  motivationLevel: 5,
};

describe('AsyncStorageDailyCheckInStorage', () => {
  let storage: AsyncStorageDailyCheckInStorage;

  beforeEach(() => {
    store.clear();
    storage = new AsyncStorageDailyCheckInStorage();
  });

  it('persists and restores a partial draft', async () => {
    await storage.saveDraft({ energyLevel: 4, sleepQuality: 3 });

    await expect(storage.getDraft()).resolves.toMatchObject({
      values: { energyLevel: 4, sleepQuality: 3 },
    });
  });

  it('persists one complete pending submission and replaces it safely', async () => {
    await storage.savePending({
      version: 1,
      submissionId: 'submission-1',
      payload,
      createdAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'pending',
    });

    await storage.savePending({
      version: 1,
      submissionId: 'submission-2',
      payload: { ...payload, energyLevel: 1 },
      createdAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'pending',
    });

    await expect(storage.getPending()).resolves.toMatchObject({
      submissionId: 'submission-2',
      payload: { energyLevel: 1 },
    });
  });

  it('rejects incomplete pending payloads and forbidden domain fields', async () => {
    await expect(
      storage.savePending({
        version: 1,
        submissionId: 'invalid',
        payload: { ...payload, localDate: '2026-07-28' } as never,
        createdAt: new Date().toISOString(),
        attemptCount: 0,
        status: 'pending',
      }),
    ).rejects.toThrow('Daily Check-in storage write failed.');
  });

  it('drops malformed, unknown-version and expired records', async () => {
    store.set(
      'elev9.daily-check-in.v1.draft',
      JSON.stringify({
        version: 99,
        values: payload,
        savedAt: new Date().toISOString(),
      }),
    );
    await expect(storage.getDraft()).resolves.toBeNull();

    store.set(
      'elev9.daily-check-in.v1.pending',
      JSON.stringify({
        version: 1,
        submissionId: 'expired',
        payload,
        createdAt: new Date(
          Date.now() - DAILY_CHECK_IN_PENDING_TTL_MS - 1,
        ).toISOString(),
        attemptCount: 0,
        status: 'pending',
      }),
    );
    await expect(storage.getPending()).resolves.toBeNull();

    store.set(
      'elev9.daily-check-in.v1.draft',
      JSON.stringify({
        version: 1,
        values: { energyLevel: 4 },
        savedAt: new Date(
          Date.now() - DAILY_CHECK_IN_DRAFT_TTL_MS - 1,
        ).toISOString(),
      }),
    );
    await expect(storage.getDraft()).resolves.toBeNull();
  });

  it('marks pending items failed without storing raw errors or sensitive metadata', async () => {
    await storage.savePending({
      version: 1,
      submissionId: 'submission-1',
      payload,
      createdAt: new Date().toISOString(),
      attemptCount: 1,
      status: 'syncing',
    });

    await storage.markPendingFailed('recovery_processing');
    const raw = [...store.values()].join(' ');
    expect(raw).not.toContain('localDate');
    expect(raw).not.toContain('timezone');
    expect(raw).not.toContain('userProfileId');
    await expect(storage.getPending()).resolves.toMatchObject({
      status: 'failed',
      lastErrorCategory: 'recovery_processing',
    });
  });
});
