export const CREATE_DAILY_CHECK_IN_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_INPUT: "DAILY_CHECK_IN_INVALID_INPUT",
  INTERNAL_ERROR: "DAILY_CHECK_IN_INTERNAL_ERROR",
} as const;

export type CreateDailyCheckInErrorCode =
  (typeof CREATE_DAILY_CHECK_IN_ERROR_CODES)[keyof typeof CREATE_DAILY_CHECK_IN_ERROR_CODES];

export class CreateDailyCheckInError extends Error {
  readonly code: CreateDailyCheckInErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreateDailyCheckInErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateDailyCheckInError";
    this.code = code;
    this.details = details;
  }
}
