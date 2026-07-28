import type { SubmitDailyCheckInRequest } from '@elev9/types';

export const DAILY_CHECK_IN_OFFLINE_VERSION = 1 as const;

export type DailyCheckInDraft = {
  version: typeof DAILY_CHECK_IN_OFFLINE_VERSION;
  values: Partial<SubmitDailyCheckInRequest>;
  savedAt: string;
};

export type DailyCheckInSyncErrorCategory =
  | 'network'
  | 'authentication'
  | 'profile_unavailable'
  | 'validation'
  | 'recovery_processing'
  | 'server'
  | 'unknown';

export type PendingDailyCheckInSubmission = {
  version: typeof DAILY_CHECK_IN_OFFLINE_VERSION;
  submissionId: string;
  payload: SubmitDailyCheckInRequest;
  createdAt: string;
  lastAttemptAt?: string;
  attemptCount: number;
  status: 'pending' | 'syncing' | 'failed';
  lastErrorCategory?: DailyCheckInSyncErrorCategory;
};

export type DailyCheckInOfflineState =
  | 'idle'
  | 'draft'
  | 'submitting'
  | 'queued'
  | 'syncing'
  | 'synced'
  | 'failed';
