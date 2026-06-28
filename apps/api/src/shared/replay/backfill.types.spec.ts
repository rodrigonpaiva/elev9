import {
  BACKFILL_MODE_VALUES,
  assertBackfillRunMetadata,
} from './backfill.types';

describe('backfill.types', () => {
  it('exposes the supported backfill modes', () => {
    expect(BACKFILL_MODE_VALUES).toEqual(['dry_run', 'apply']);
  });

  it('passes backfill metadata through unchanged for future attachment workflows', () => {
    const metadata = {
      mode: 'dry_run' as const,
      formulaVersion: 'replay-v1',
      startedAt: '2026-06-03T00:00:00.000Z',
      runId: 'backfill_run_123',
      totalRecords: 100,
    };

    expect(assertBackfillRunMetadata(metadata)).toBe(metadata);
  });
});
