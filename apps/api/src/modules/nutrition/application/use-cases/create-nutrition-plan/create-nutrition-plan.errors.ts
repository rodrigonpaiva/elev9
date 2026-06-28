export const CREATE_NUTRITION_PLAN_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  FITNESS_PROFILE_NOT_FOUND: 'FITNESS_PROFILE_NOT_FOUND',
  NUTRITION_PROFILE_NOT_FOUND: 'NUTRITION_PROFILE_NOT_FOUND',
  HEIGHT_CM_MISSING: 'NUTRITION_PLAN_HEIGHT_CM_MISSING',
  WEIGHT_KG_MISSING: 'NUTRITION_PLAN_WEIGHT_KG_MISSING',
  INVALID_GOAL: 'NUTRITION_PLAN_INVALID_GOAL',
  INVALID_ACTIVITY_LEVEL: 'NUTRITION_PLAN_INVALID_ACTIVITY_LEVEL',
  INTERNAL_ERROR: 'NUTRITION_PLAN_INTERNAL_ERROR',
} as const;

export type CreateNutritionPlanErrorCode =
  (typeof CREATE_NUTRITION_PLAN_ERROR_CODES)[keyof typeof CREATE_NUTRITION_PLAN_ERROR_CODES];

export class CreateNutritionPlanError extends Error {
  readonly code: CreateNutritionPlanErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreateNutritionPlanErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CreateNutritionPlanError';
    this.code = code;
    this.details = details;
  }
}
