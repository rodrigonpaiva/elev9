import type {
  DailyCheckInOfflineState,
  DailyCheckInSyncErrorCategory,
} from './daily-check-in-storage.types';

export type DailyCheckInSyncEvent =
  | 'draft_saved'
  | 'submit_started'
  | 'submit_succeeded'
  | 'temporary_failure'
  | 'permanent_failure'
  | 'sync_started'
  | 'discarded';

export function transitionDailyCheckInSyncState(
  state: DailyCheckInOfflineState,
  event: DailyCheckInSyncEvent,
): DailyCheckInOfflineState {
  switch (event) {
    case 'draft_saved':
      return state === 'synced' || state === 'idle' ? 'draft' : state;
    case 'submit_started':
      return 'submitting';
    case 'submit_succeeded':
      return 'synced';
    case 'temporary_failure':
      return 'queued';
    case 'permanent_failure':
      return 'failed';
    case 'sync_started':
      return 'syncing';
    case 'discarded':
      return 'idle';
  }
}

export function isTemporaryDailyCheckInSyncError(
  category: DailyCheckInSyncErrorCategory,
): boolean {
  return category === 'network' || category === 'server';
}
