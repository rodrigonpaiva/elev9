export const REPLAY_HABIT_SNAPSHOT_ERROR_CODES = {
  INVALID_INPUT: 'HABIT_SNAPSHOT_REPLAY_INVALID_INPUT',
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  HABIT_SNAPSHOT_NOT_FOUND: 'HABIT_SNAPSHOT_NOT_FOUND',
  INTERNAL_ERROR: 'HABIT_SNAPSHOT_REPLAY_INTERNAL_ERROR',
} as const;

export type ReplayHabitSnapshotErrorCode =
  (typeof REPLAY_HABIT_SNAPSHOT_ERROR_CODES)[keyof typeof REPLAY_HABIT_SNAPSHOT_ERROR_CODES];

export class ReplayHabitSnapshotError extends Error {
  readonly code: ReplayHabitSnapshotErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ReplayHabitSnapshotErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReplayHabitSnapshotError';
    this.code = code;
    this.details = details;
  }
}
