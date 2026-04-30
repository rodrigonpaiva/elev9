export const LOG_WORKOUT_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  FITNESS_PROFILE_NOT_FOUND: "FITNESS_PROFILE_NOT_FOUND",
  TRAINING_PLAN_NOT_FOUND: "TRAINING_PLAN_NOT_FOUND",
  ALREADY_EXISTS: "WORKOUT_LOG_ALREADY_EXISTS",
  INVALID_INPUT: "WORKOUT_LOG_INVALID_INPUT",
  INTERNAL_ERROR: "WORKOUT_LOG_INTERNAL_ERROR",
} as const;

export type LogWorkoutErrorCode =
  (typeof LOG_WORKOUT_ERROR_CODES)[keyof typeof LOG_WORKOUT_ERROR_CODES];

export class LogWorkoutError extends Error {
  readonly code: LogWorkoutErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: LogWorkoutErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "LogWorkoutError";
    this.code = code;
    this.details = details;
  }
}
