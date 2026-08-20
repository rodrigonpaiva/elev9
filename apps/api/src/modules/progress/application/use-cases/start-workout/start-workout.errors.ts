export const START_WORKOUT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  FITNESS_PROFILE_NOT_FOUND: 'FITNESS_PROFILE_NOT_FOUND',
  TRAINING_PLAN_NOT_FOUND: 'TRAINING_PLAN_NOT_FOUND',
  WORKOUT_NOT_AVAILABLE: 'WORKOUT_NOT_AVAILABLE',
  INVALID_INPUT: 'WORKOUT_START_INVALID_INPUT',
  INTERNAL_ERROR: 'WORKOUT_START_INTERNAL_ERROR',
} as const;

export type StartWorkoutErrorCode =
  (typeof START_WORKOUT_ERROR_CODES)[keyof typeof START_WORKOUT_ERROR_CODES];

export class StartWorkoutError extends Error {
  readonly code: StartWorkoutErrorCode;

  constructor(code: StartWorkoutErrorCode, message: string) {
    super(message);
    this.name = 'StartWorkoutError';
    this.code = code;
  }
}
