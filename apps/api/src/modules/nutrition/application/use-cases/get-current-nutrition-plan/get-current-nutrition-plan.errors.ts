export const GET_CURRENT_NUTRITION_PLAN_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NUTRITION_PLAN_NOT_FOUND: 'NUTRITION_PLAN_NOT_FOUND',
  INTERNAL_ERROR: 'CURRENT_NUTRITION_PLAN_INTERNAL_ERROR',
} as const;

export type GetCurrentNutritionPlanErrorCode =
  (typeof GET_CURRENT_NUTRITION_PLAN_ERROR_CODES)[keyof typeof GET_CURRENT_NUTRITION_PLAN_ERROR_CODES];

export class GetCurrentNutritionPlanError extends Error {
  readonly code: GetCurrentNutritionPlanErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCurrentNutritionPlanErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetCurrentNutritionPlanError';
    this.code = code;
    this.details = details;
  }
}
