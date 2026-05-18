export const VALIDATE_SESSION_ERROR_CODES = {
  INVALID_INPUT: 'AUTH_INVALID_INPUT',
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
} as const;

export type ValidateSessionErrorCode =
  (typeof VALIDATE_SESSION_ERROR_CODES)[keyof typeof VALIDATE_SESSION_ERROR_CODES];

export class ValidateSessionError extends Error {
  readonly code: ValidateSessionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ValidateSessionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ValidateSessionError';
    this.code = code;
    this.details = details;
  }
}
