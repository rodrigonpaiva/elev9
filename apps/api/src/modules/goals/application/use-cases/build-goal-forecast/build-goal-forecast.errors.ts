export const BUILD_GOAL_FORECAST_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  INTERNAL_ERROR: 'GOAL_FORECAST_INTERNAL_ERROR',
} as const;

export type BuildGoalForecastErrorCode =
  (typeof BUILD_GOAL_FORECAST_ERROR_CODES)[keyof typeof BUILD_GOAL_FORECAST_ERROR_CODES];

export class BuildGoalForecastError extends Error {
  readonly code: BuildGoalForecastErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildGoalForecastErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildGoalForecastError';
    this.code = code;
    this.details = details;
  }
}
