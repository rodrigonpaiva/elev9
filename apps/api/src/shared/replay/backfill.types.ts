import type { BackfillMode, BackfillRunMetadata } from './replay.types';

export type { BackfillMode, BackfillRunMetadata };

export const BACKFILL_MODE_VALUES: readonly BackfillMode[] = [
  'dry_run',
  'apply',
] as const;

export function assertBackfillRunMetadata(
  metadata: BackfillRunMetadata,
): BackfillRunMetadata {
  return metadata;
}
