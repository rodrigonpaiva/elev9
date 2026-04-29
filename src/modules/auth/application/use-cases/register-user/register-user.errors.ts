export const REGISTER_USER_ERROR_CODES = {
  INVALID_INPUT: "AUTH_INVALID_INPUT",
  EMAIL_ALREADY_EXISTS: "AUTH_EMAIL_ALREADY_EXISTS",
  PASSWORD_TOO_WEAK: "AUTH_PASSWORD_TOO_WEAK",
  INTERNAL_ERROR: "AUTH_INTERNAL_ERROR",
} as const;

export type RegisterUserErrorCode =
  (typeof REGISTER_USER_ERROR_CODES)[keyof typeof REGISTER_USER_ERROR_CODES];

export class RegisterUserError extends Error {
  readonly code: RegisterUserErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: RegisterUserErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RegisterUserError";
    this.code = code;
    this.details = details;
  }
}
