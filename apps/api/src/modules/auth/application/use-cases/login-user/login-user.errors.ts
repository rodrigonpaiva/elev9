export const LOGIN_USER_ERROR_CODES = {
  INVALID_INPUT: 'AUTH_INVALID_INPUT',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
} as const;

export type LoginUserErrorCode =
  (typeof LOGIN_USER_ERROR_CODES)[keyof typeof LOGIN_USER_ERROR_CODES];

export class LoginUserError extends Error {
  readonly code: LoginUserErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: LoginUserErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LoginUserError';
    this.code = code;
    this.details = details;
  }
}
