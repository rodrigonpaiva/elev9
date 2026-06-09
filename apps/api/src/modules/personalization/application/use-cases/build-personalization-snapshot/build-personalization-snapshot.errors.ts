export const BUILD_PERSONALIZATION_SNAPSHOT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'PERSONALIZATION_SNAPSHOT_BUILD_INTERNAL_ERROR',
} as const;

export type BuildPersonalizationSnapshotErrorCode =
  (typeof BUILD_PERSONALIZATION_SNAPSHOT_ERROR_CODES)[keyof typeof BUILD_PERSONALIZATION_SNAPSHOT_ERROR_CODES];

export class BuildPersonalizationSnapshotError extends Error {
  readonly code: BuildPersonalizationSnapshotErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildPersonalizationSnapshotErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildPersonalizationSnapshotError';
    this.code = code;
    this.details = details;
  }
}
