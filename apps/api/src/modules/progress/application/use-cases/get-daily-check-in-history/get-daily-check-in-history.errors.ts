export const GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_INPUT: 'DAILY_CHECK_IN_HISTORY_INVALID_INPUT',
  INTERNAL_ERROR: 'DAILY_CHECK_IN_HISTORY_INTERNAL_ERROR',
} as const;

export type GetDailyCheckInHistoryErrorCode =
  (typeof GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES)[keyof typeof GET_DAILY_CHECK_IN_HISTORY_ERROR_CODES];

export class GetDailyCheckInHistoryError extends Error {
  readonly code: GetDailyCheckInHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetDailyCheckInHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetDailyCheckInHistoryError';
    this.code = code;
    this.details = details;
  }
}
