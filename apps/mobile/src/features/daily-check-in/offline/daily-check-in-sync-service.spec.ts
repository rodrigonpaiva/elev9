import { ApiClientError } from '@elev9/api-client';
import type {
  GetTodayDailyCheckInResponse,
  RecoverySnapshot,
  SubmitDailyCheckInRequest,
  SubmitDailyCheckInResponse,
} from '@elev9/types';

import { DailyCheckInSyncService } from './daily-check-in-sync-service';
import type { DailyCheckInStorage } from './daily-check-in-storage';
import type {
  DailyCheckInDraft,
  PendingDailyCheckInSubmission,
} from './daily-check-in-storage.types';

const payload: SubmitDailyCheckInRequest = {
  energyLevel: 4,
  sleepQuality: 3,
  muscleSoreness: 2,
  motivationLevel: 5,
};

function createStorage(): DailyCheckInStorage {
  let draft: DailyCheckInDraft | null = null;
  let pending: PendingDailyCheckInSubmission | null = null;
  return {
    getDraft: async () => draft,
    saveDraft: async (values) => {
      draft = { version: 1, values, savedAt: new Date().toISOString() };
    },
    clearDraft: async () => {
      draft = null;
    },
    getPending: async () => pending,
    savePending: async (value) => {
      pending = value;
    },
    markPendingFailed: async (category) => {
      if (pending)
        pending = { ...pending, status: 'failed', lastErrorCategory: category };
    },
    clearPending: async () => {
      pending = null;
    },
    clearAll: async () => {
      draft = null;
      pending = null;
    },
  };
}

function response(): SubmitDailyCheckInResponse {
  return {
    dailyCheckIn: { id: 'check-in-1', ...payload },
  } as SubmitDailyCheckInResponse;
}

function today(): GetTodayDailyCheckInResponse {
  return {
    completedToday: true,
    dailyCheckIn: response().dailyCheckIn,
  } as GetTodayDailyCheckInResponse;
}

const recovery = {
  recoverySnapshot: { id: 'recovery-1' } as unknown as RecoverySnapshot,
};

describe('DailyCheckInSyncService', () => {
  it('submits, reconciles today and Recovery, then clears local state', async () => {
    const storage = createStorage();
    const api = {
      submitDailyCheckIn: jest.fn(async () => response()),
      getTodayDailyCheckIn: jest.fn(async () => today()),
      getTodayRecovery: jest.fn(async () => recovery),
    };
    const service = new DailyCheckInSyncService(api, storage);

    await service.enqueue(payload);
    const result = await service.sync('manual');

    expect(result.state).toBe('synced');
    expect(api.submitDailyCheckIn).toHaveBeenCalledWith(payload);
    expect(api.getTodayDailyCheckIn).toHaveBeenCalledTimes(1);
    expect(api.getTodayRecovery).toHaveBeenCalledTimes(1);
    await expect(storage.getPending()).resolves.toBeNull();
  });

  it('queues temporary failures and marks permanent failures without retrying automatically', async () => {
    const storage = createStorage();
    const api = {
      submitDailyCheckIn: jest.fn(async () => {
        throw new ApiClientError({
          code: 'NETWORK_ERROR',
          message: 'offline',
          status: 0,
        });
      }),
      getTodayDailyCheckIn: jest.fn(),
      getTodayRecovery: jest.fn(),
    };
    const service = new DailyCheckInSyncService(api, storage);
    await service.enqueue(payload);

    await expect(service.sync('manual')).resolves.toMatchObject({
      state: 'queued',
      errorCategory: 'network',
    });
    await expect(storage.getPending()).resolves.toMatchObject({
      status: 'pending',
      attemptCount: 1,
    });

    const failedStorage = createStorage();
    const failedApi = {
      submitDailyCheckIn: jest.fn(async () => {
        throw new ApiClientError({
          code: 'INVALID_INPUT',
          message: 'invalid',
          status: 400,
        });
      }),
      getTodayDailyCheckIn: jest.fn(),
      getTodayRecovery: jest.fn(),
    };
    const failedService = new DailyCheckInSyncService(failedApi, failedStorage);
    await failedService.enqueue(payload);
    await expect(failedService.sync('manual')).resolves.toMatchObject({
      state: 'failed',
      errorCategory: 'validation',
    });
    await expect(failedService.sync('foreground')).resolves.toMatchObject({
      state: 'failed',
      errorCategory: 'validation',
    });
    expect(failedApi.submitDailyCheckIn).toHaveBeenCalledTimes(1);
  });

  it('shares one active sync across concurrent triggers', async () => {
    const storage = createStorage();
    let resolveSubmit!: (value: SubmitDailyCheckInResponse) => void;
    const submit = new Promise<SubmitDailyCheckInResponse>((resolve) => {
      resolveSubmit = resolve;
    });
    const api = {
      submitDailyCheckIn: jest.fn(() => submit),
      getTodayDailyCheckIn: jest.fn(async () => today()),
      getTodayRecovery: jest.fn(async () => recovery),
    };
    const service = new DailyCheckInSyncService(api, storage);
    await service.enqueue(payload);

    const first = service.sync('foreground');
    const second = service.sync('manual');
    resolveSubmit(response());

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ state: 'synced' }),
      expect.objectContaining({ state: 'synced' }),
    ]);
    expect(api.submitDailyCheckIn).toHaveBeenCalledTimes(1);
  });
});
