export const GET_TODAY_RECOVERY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'TODAY_RECOVERY_INTERNAL_ERROR',
} as const;

export type GetTodayRecoveryErrorCode =
  (typeof GET_TODAY_RECOVERY_ERROR_CODES)[keyof typeof GET_TODAY_RECOVERY_ERROR_CODES];

export class GetTodayRecoveryError extends Error {
  readonly code: GetTodayRecoveryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetTodayRecoveryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetTodayRecoveryError';
    this.code = code;
    this.details = details;
  }
}
