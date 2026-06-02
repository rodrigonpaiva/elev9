export const GET_CURRENT_RECOVERY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'CURRENT_RECOVERY_INTERNAL_ERROR',
} as const;

export type GetCurrentRecoveryErrorCode =
  (typeof GET_CURRENT_RECOVERY_ERROR_CODES)[keyof typeof GET_CURRENT_RECOVERY_ERROR_CODES];

export class GetCurrentRecoveryError extends Error {
  readonly code: GetCurrentRecoveryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCurrentRecoveryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetCurrentRecoveryError';
    this.code = code;
    this.details = details;
  }
}
