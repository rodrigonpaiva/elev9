import { ApiClientError } from '@elev9/api-client';
import type {
  GetTodayDailyCheckInResponse,
  RecoverySnapshot,
  SubmitDailyCheckInRequest,
  SubmitDailyCheckInResponse,
} from '@elev9/types';

import {
  dailyCheckInStorage,
  type DailyCheckInStorage,
} from './daily-check-in-storage';
import { isTemporaryDailyCheckInSyncError } from './daily-check-in-sync-machine';
import type {
  DailyCheckInSyncErrorCategory,
  PendingDailyCheckInSubmission,
} from './daily-check-in-storage.types';

export type DailyCheckInSyncTrigger =
  | 'manual'
  | 'foreground'
  | 'connectivity'
  | 'initial_load';

export type DailyCheckInSyncApi = {
  submitDailyCheckIn(
    input: SubmitDailyCheckInRequest,
  ): Promise<SubmitDailyCheckInResponse>;
  getTodayDailyCheckIn(): Promise<GetTodayDailyCheckInResponse>;
  getTodayRecovery(): Promise<{ recoverySnapshot: RecoverySnapshot | null }>;
};

export type DailyCheckInSyncResult = {
  state: 'idle' | 'queued' | 'failed' | 'synced';
  response?: SubmitDailyCheckInResponse;
  todayState?: GetTodayDailyCheckInResponse;
  recoverySnapshot?: RecoverySnapshot | null;
  errorCategory?: DailyCheckInSyncErrorCategory;
};

const MAX_AUTOMATIC_RETRIES = 3;

export class DailyCheckInSyncService {
  private activeSync: Promise<DailyCheckInSyncResult> | null = null;

  constructor(
    private readonly api: DailyCheckInSyncApi,
    private readonly storage: DailyCheckInStorage = dailyCheckInStorage,
  ) {}

  async enqueue(
    payload: SubmitDailyCheckInRequest,
  ): Promise<PendingDailyCheckInSubmission> {
    const previous = await this.storage.getPending();
    const pending: PendingDailyCheckInSubmission = {
      version: 1,
      submissionId: previous?.submissionId ?? createSubmissionId(),
      payload: { ...payload },
      createdAt: new Date().toISOString(),
      attemptCount: 0,
      status: 'pending',
    };

    await this.storage.savePending(pending);
    await this.storage.clearDraft();
    return pending;
  }

  async sync(
    trigger: DailyCheckInSyncTrigger,
  ): Promise<DailyCheckInSyncResult> {
    if (this.activeSync) {
      return this.activeSync;
    }

    this.activeSync = this.runSync(trigger).finally(() => {
      this.activeSync = null;
    });

    return this.activeSync;
  }

  async discard(): Promise<void> {
    await this.storage.clearAll();
  }

  private async runSync(
    trigger: DailyCheckInSyncTrigger,
  ): Promise<DailyCheckInSyncResult> {
    const pending = await this.storage.getPending();
    if (!pending) {
      return { state: 'idle' };
    }

    if (pending.status === 'failed' && trigger !== 'manual') {
      return {
        state: 'failed',
        errorCategory: pending.lastErrorCategory ?? 'unknown',
      };
    }

    if (
      pending.status === 'pending' &&
      trigger !== 'manual' &&
      pending.attemptCount >= MAX_AUTOMATIC_RETRIES
    ) {
      return {
        state: 'queued',
        errorCategory: pending.lastErrorCategory ?? 'network',
      };
    }

    const attemptCount = pending.attemptCount + 1;
    const syncing: PendingDailyCheckInSubmission = {
      ...pending,
      attemptCount,
      lastAttemptAt: new Date().toISOString(),
      status: 'syncing',
      lastErrorCategory: undefined,
    };
    await this.storage.savePending(syncing);

    try {
      const response = await this.api.submitDailyCheckIn(pending.payload);
      const todayState = await this.api.getTodayDailyCheckIn();
      const recovery = await this.api.getTodayRecovery();

      await this.storage.clearAll();
      return {
        state: 'synced',
        response,
        todayState,
        recoverySnapshot: recovery.recoverySnapshot,
      };
    } catch (error) {
      const errorCategory = classifySyncError(error);
      const status = isTemporaryDailyCheckInSyncError(errorCategory)
        ? 'pending'
        : 'failed';
      await this.storage.savePending({
        ...syncing,
        status,
        lastErrorCategory: errorCategory,
      });

      return {
        state: status === 'pending' ? 'queued' : 'failed',
        errorCategory,
      };
    }
  }
}

export function classifySyncError(
  error: unknown,
): DailyCheckInSyncErrorCategory {
  if (!(error instanceof ApiClientError)) {
    return 'unknown';
  }

  if (error.code === 'NETWORK_ERROR' || error.status === 0) {
    return 'network';
  }

  if (error.code === 'AUTH_INVALID_SESSION' || error.status === 401) {
    return 'authentication';
  }

  if (error.code === 'USER_PROFILE_NOT_FOUND') {
    return 'profile_unavailable';
  }

  if (
    error.code === 'INVALID_INPUT' ||
    error.code === 'BAD_REQUEST' ||
    error.status === 400
  ) {
    return 'validation';
  }

  if (
    error.code === 'RECOVERY_RECALCULATION_FAILED' ||
    error.code === 'RECOVERY_FAILED'
  ) {
    return 'recovery_processing';
  }

  if (error.status === 408 || error.status === 429 || error.status >= 500) {
    return 'server';
  }

  return 'unknown';
}

function createSubmissionId(): string {
  return `daily-check-in-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
