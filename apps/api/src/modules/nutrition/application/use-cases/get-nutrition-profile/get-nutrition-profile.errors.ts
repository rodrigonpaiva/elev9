export const GET_NUTRITION_PROFILE_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NUTRITION_PROFILE_NOT_FOUND: 'NUTRITION_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'NUTRITION_PROFILE_INTERNAL_ERROR',
} as const;

export type GetNutritionProfileErrorCode =
  (typeof GET_NUTRITION_PROFILE_ERROR_CODES)[keyof typeof GET_NUTRITION_PROFILE_ERROR_CODES];

export class GetNutritionProfileError extends Error {
  readonly code: GetNutritionProfileErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetNutritionProfileErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetNutritionProfileError';
    this.code = code;
    this.details = details;
  }
}
