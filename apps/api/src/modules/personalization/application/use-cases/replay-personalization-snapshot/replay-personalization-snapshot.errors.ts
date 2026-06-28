export const REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  INVALID_INPUT: 'INVALID_INPUT',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  PERSONALIZATION_SNAPSHOT_NOT_FOUND: 'PERSONALIZATION_SNAPSHOT_NOT_FOUND',
  INTERNAL_ERROR: 'PERSONALIZATION_REPLAY_INTERNAL_ERROR',
} as const;

export type ReplayPersonalizationSnapshotErrorCode =
  (typeof REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES)[keyof typeof REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES];

export class ReplayPersonalizationSnapshotError extends Error {
  readonly code: ReplayPersonalizationSnapshotErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ReplayPersonalizationSnapshotErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReplayPersonalizationSnapshotError';
    this.code = code;
    this.details = details;
  }
}
