export const GET_CURRENT_RECOVERY_READ_MODEL_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'CURRENT_RECOVERY_READ_MODEL_INTERNAL_ERROR',
} as const;

export class GetCurrentRecoveryReadModelError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GetCurrentRecoveryReadModelError';
    this.code = code;
  }
}
