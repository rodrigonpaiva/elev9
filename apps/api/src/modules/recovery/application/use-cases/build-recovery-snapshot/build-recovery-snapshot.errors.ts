export const BUILD_RECOVERY_SNAPSHOT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'RECOVERY_BUILD_INTERNAL_ERROR',
} as const;

export type BuildRecoverySnapshotErrorCode =
  (typeof BUILD_RECOVERY_SNAPSHOT_ERROR_CODES)[keyof typeof BUILD_RECOVERY_SNAPSHOT_ERROR_CODES];

export class BuildRecoverySnapshotError extends Error {
  readonly code: BuildRecoverySnapshotErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildRecoverySnapshotErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildRecoverySnapshotError';
    this.code = code;
    this.details = details;
  }
}
