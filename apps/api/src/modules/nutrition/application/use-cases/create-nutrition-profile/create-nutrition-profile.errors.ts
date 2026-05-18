export const CREATE_NUTRITION_PROFILE_ERROR_CODES = {
  INVALID_INPUT: "NUTRITION_PROFILE_INVALID_INPUT",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  INTERNAL_ERROR: "NUTRITION_PROFILE_INTERNAL_ERROR",
} as const;

export type CreateNutritionProfileErrorCode =
  (typeof CREATE_NUTRITION_PROFILE_ERROR_CODES)[keyof typeof CREATE_NUTRITION_PROFILE_ERROR_CODES];

export class CreateNutritionProfileError extends Error {
  readonly code: CreateNutritionProfileErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreateNutritionProfileErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateNutritionProfileError";
    this.code = code;
    this.details = details;
  }
}
