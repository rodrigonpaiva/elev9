export const BUILD_ADAPTIVE_TRAINING_RECOMMENDATION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'ADAPTIVE_TRAINING_INTERNAL_ERROR',
} as const;

export type BuildAdaptiveTrainingRecommendationErrorCode =
  (typeof BUILD_ADAPTIVE_TRAINING_RECOMMENDATION_ERROR_CODES)[keyof typeof BUILD_ADAPTIVE_TRAINING_RECOMMENDATION_ERROR_CODES];

export class BuildAdaptiveTrainingRecommendationError extends Error {
  readonly code: BuildAdaptiveTrainingRecommendationErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildAdaptiveTrainingRecommendationErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildAdaptiveTrainingRecommendationError';
    this.code = code;
    this.details = details;
  }
}
