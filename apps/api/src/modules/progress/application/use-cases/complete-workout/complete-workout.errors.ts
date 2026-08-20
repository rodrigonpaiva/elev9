export const COMPLETE_WORKOUT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  INVALID_INPUT: 'WORKOUT_COMPLETION_INVALID_INPUT',
  SESSION_NOT_FOUND: 'WORKOUT_SESSION_NOT_FOUND',
  SESSION_EXPIRED: 'WORKOUT_SESSION_EXPIRED',
  INTERNAL_ERROR: 'WORKOUT_COMPLETION_INTERNAL_ERROR',
} as const;

export type CompleteWorkoutErrorCode =
  (typeof COMPLETE_WORKOUT_ERROR_CODES)[keyof typeof COMPLETE_WORKOUT_ERROR_CODES];

export class CompleteWorkoutError extends Error {
  readonly code: CompleteWorkoutErrorCode;

  constructor(code: CompleteWorkoutErrorCode, message: string) {
    super(message);
    this.name = 'CompleteWorkoutError';
    this.code = code;
  }
}
