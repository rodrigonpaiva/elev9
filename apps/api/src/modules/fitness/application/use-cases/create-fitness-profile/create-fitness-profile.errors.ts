export const CREATE_FITNESS_PROFILE_ERROR_CODES = {
  INVALID_INPUT: "FITNESS_PROFILE_INVALID_INPUT",
  ALREADY_EXISTS: "FITNESS_PROFILE_ALREADY_EXISTS",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  INTERNAL_ERROR: "FITNESS_PROFILE_INTERNAL_ERROR",
} as const;

export type CreateFitnessProfileErrorCode =
  (typeof CREATE_FITNESS_PROFILE_ERROR_CODES)[keyof typeof CREATE_FITNESS_PROFILE_ERROR_CODES];

export class CreateFitnessProfileError extends Error {
  readonly code: CreateFitnessProfileErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreateFitnessProfileErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateFitnessProfileError";
    this.code = code;
    this.details = details;
  }
}
