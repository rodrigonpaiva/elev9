export const REPLACE_WORKOUT_EXERCISE_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  INVALID_INPUT: 'WORKOUT_REPLACEMENT_INVALID_INPUT',
  SESSION_NOT_FOUND: 'WORKOUT_SESSION_NOT_FOUND',
  SESSION_COMPLETED: 'WORKOUT_SESSION_COMPLETED',
  EXERCISE_NOT_FOUND: 'WORKOUT_EXERCISE_NOT_FOUND',
  INVALID_ALTERNATIVE: 'WORKOUT_REPLACEMENT_INVALID_ALTERNATIVE',
  CONFLICT: 'WORKOUT_REPLACEMENT_CONFLICT',
  INTERNAL_ERROR: 'WORKOUT_REPLACEMENT_INTERNAL_ERROR',
} as const;

export type ReplaceWorkoutExerciseErrorCode =
  (typeof REPLACE_WORKOUT_EXERCISE_ERROR_CODES)[keyof typeof REPLACE_WORKOUT_EXERCISE_ERROR_CODES];

export class ReplaceWorkoutExerciseError extends Error {
  readonly code: ReplaceWorkoutExerciseErrorCode;

  constructor(code: ReplaceWorkoutExerciseErrorCode, message: string) {
    super(message);
    this.name = 'ReplaceWorkoutExerciseError';
    this.code = code;
  }
}
