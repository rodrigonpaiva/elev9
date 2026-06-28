export const GET_TODAY_NUTRITION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NUTRITION_PLAN_NOT_FOUND: 'NUTRITION_PLAN_NOT_FOUND',
  NUTRITION_DAY_NOT_FOUND: 'TODAY_NUTRITION_DAY_NOT_FOUND',
  INTERNAL_ERROR: 'TODAY_NUTRITION_INTERNAL_ERROR',
} as const;

export type GetTodayNutritionErrorCode =
  (typeof GET_TODAY_NUTRITION_ERROR_CODES)[keyof typeof GET_TODAY_NUTRITION_ERROR_CODES];

export class GetTodayNutritionError extends Error {
  readonly code: GetTodayNutritionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetTodayNutritionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetTodayNutritionError';
    this.code = code;
    this.details = details;
  }
}
