export const GET_WORKOUT_HISTORY_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  FITNESS_PROFILE_NOT_FOUND: "FITNESS_PROFILE_NOT_FOUND",
  INVALID_INPUT: "WORKOUT_HISTORY_INVALID_INPUT",
  INTERNAL_ERROR: "WORKOUT_HISTORY_INTERNAL_ERROR",
} as const;

export type GetWorkoutHistoryErrorCode =
  (typeof GET_WORKOUT_HISTORY_ERROR_CODES)[keyof typeof GET_WORKOUT_HISTORY_ERROR_CODES];

export class GetWorkoutHistoryError extends Error {
  readonly code: GetWorkoutHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetWorkoutHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetWorkoutHistoryError";
    this.code = code;
    this.details = details;
  }
}
