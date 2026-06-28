export const GET_RECOVERY_HISTORY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_LIMIT: 'RECOVERY_HISTORY_INVALID_LIMIT',
  INTERNAL_ERROR: 'RECOVERY_HISTORY_INTERNAL_ERROR',
} as const;

export type GetRecoveryHistoryErrorCode =
  (typeof GET_RECOVERY_HISTORY_ERROR_CODES)[keyof typeof GET_RECOVERY_HISTORY_ERROR_CODES];

export class GetRecoveryHistoryError extends Error {
  readonly code: GetRecoveryHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetRecoveryHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetRecoveryHistoryError';
    this.code = code;
    this.details = details;
  }
}
