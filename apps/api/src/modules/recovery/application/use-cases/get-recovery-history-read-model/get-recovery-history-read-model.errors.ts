export const GET_RECOVERY_HISTORY_READ_MODEL_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_RANGE: 'RECOVERY_HISTORY_READ_MODEL_INVALID_RANGE',
  INTERNAL_ERROR: 'RECOVERY_HISTORY_READ_MODEL_INTERNAL_ERROR',
} as const;

export class GetRecoveryHistoryReadModelError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GetRecoveryHistoryReadModelError';
    this.code = code;
  }
}
