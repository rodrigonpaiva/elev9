export const GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NUTRITION_PROFILE_NOT_FOUND: 'NUTRITION_PROFILE_NOT_FOUND',
  NUTRITION_PLAN_NOT_FOUND: 'NUTRITION_PLAN_NOT_FOUND',
  INTERNAL_ERROR: 'NUTRITION_RECOMMENDATION_INTERNAL_ERROR',
} as const;

export type GenerateNutritionRecommendationErrorCode =
  (typeof GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES)[keyof typeof GENERATE_NUTRITION_RECOMMENDATION_ERROR_CODES];

export class GenerateNutritionRecommendationError extends Error {
  readonly code: GenerateNutritionRecommendationErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GenerateNutritionRecommendationErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GenerateNutritionRecommendationError';
    this.code = code;
    this.details = details;
  }
}
