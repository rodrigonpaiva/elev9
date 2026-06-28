export const BUILD_HABIT_SNAPSHOT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'HABIT_BUILD_INTERNAL_ERROR',
} as const;

export type BuildHabitSnapshotErrorCode =
  (typeof BUILD_HABIT_SNAPSHOT_ERROR_CODES)[keyof typeof BUILD_HABIT_SNAPSHOT_ERROR_CODES];

export class BuildHabitSnapshotError extends Error {
  readonly code: BuildHabitSnapshotErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildHabitSnapshotErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildHabitSnapshotError';
    this.code = code;
    this.details = details;
  }
}
