export const GET_TODAY_DAILY_CHECK_IN_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'DAILY_CHECK_IN_TODAY_INTERNAL_ERROR',
} as const;

export type GetTodayDailyCheckInErrorCode =
  (typeof GET_TODAY_DAILY_CHECK_IN_ERROR_CODES)[keyof typeof GET_TODAY_DAILY_CHECK_IN_ERROR_CODES];

export class GetTodayDailyCheckInError extends Error {
  readonly code: GetTodayDailyCheckInErrorCode;

  constructor(code: GetTodayDailyCheckInErrorCode, message: string) {
    super(message);
    this.name = 'GetTodayDailyCheckInError';
    this.code = code;
  }
}
