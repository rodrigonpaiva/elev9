export const BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  MISSING_TARGET_VALUE: 'GOAL_TARGET_VALUE_REQUIRED',
  INTERNAL_ERROR: 'GOAL_BUILD_INTERNAL_ERROR',
} as const;

export type BuildGoalProgressSnapshotErrorCode =
  (typeof BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES)[keyof typeof BUILD_GOAL_PROGRESS_SNAPSHOT_ERROR_CODES];

export class BuildGoalProgressSnapshotError extends Error {
  readonly code: BuildGoalProgressSnapshotErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildGoalProgressSnapshotErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildGoalProgressSnapshotError';
    this.code = code;
    this.details = details;
  }
}
