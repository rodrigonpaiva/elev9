import {
  isTemporaryDailyCheckInSyncError,
  transitionDailyCheckInSyncState,
} from './daily-check-in-sync-machine';

describe('Daily Check-in sync state machine', () => {
  it.each([
    ['idle', 'draft_saved', 'draft'],
    ['draft', 'submit_started', 'submitting'],
    ['submitting', 'submit_succeeded', 'synced'],
    ['submitting', 'temporary_failure', 'queued'],
    ['submitting', 'permanent_failure', 'failed'],
    ['queued', 'sync_started', 'syncing'],
    ['syncing', 'submit_succeeded', 'synced'],
    ['syncing', 'temporary_failure', 'queued'],
    ['syncing', 'permanent_failure', 'failed'],
    ['failed', 'sync_started', 'syncing'],
    ['queued', 'discarded', 'idle'],
  ] as const)('%s + %s → %s', (state, event, expected) => {
    expect(transitionDailyCheckInSyncState(state, event)).toBe(expected);
  });

  it('only treats retryable transport failures as temporary', () => {
    expect(isTemporaryDailyCheckInSyncError('network')).toBe(true);
    expect(isTemporaryDailyCheckInSyncError('server')).toBe(true);
    expect(isTemporaryDailyCheckInSyncError('recovery_processing')).toBe(false);
    expect(isTemporaryDailyCheckInSyncError('validation')).toBe(false);
  });
});
