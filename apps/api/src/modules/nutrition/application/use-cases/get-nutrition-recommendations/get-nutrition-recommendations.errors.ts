export const GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_LIMIT: 'NUTRITION_RECOMMENDATIONS_INVALID_LIMIT',
  INTERNAL_ERROR: 'NUTRITION_RECOMMENDATIONS_INTERNAL_ERROR',
} as const;

export type GetNutritionRecommendationsErrorCode =
  (typeof GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES)[keyof typeof GET_NUTRITION_RECOMMENDATIONS_ERROR_CODES];

export class GetNutritionRecommendationsError extends Error {
  readonly code: GetNutritionRecommendationsErrorCode;

  constructor(code: GetNutritionRecommendationsErrorCode, message: string) {
    super(message);
    this.name = 'GetNutritionRecommendationsError';
    this.code = code;
  }
}
