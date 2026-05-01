export const CREATE_USER_PROFILE_ERROR_CODES = {
  INVALID_INPUT: "USER_PROFILE_INVALID_INPUT",
  ALREADY_EXISTS: "USER_PROFILE_ALREADY_EXISTS",
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  INTERNAL_ERROR: "USER_PROFILE_INTERNAL_ERROR",
} as const;

export type CreateUserProfileErrorCode =
  (typeof CREATE_USER_PROFILE_ERROR_CODES)[keyof typeof CREATE_USER_PROFILE_ERROR_CODES];

export class CreateUserProfileError extends Error {
  readonly code: CreateUserProfileErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreateUserProfileErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateUserProfileError";
    this.code = code;
    this.details = details;
  }
}
