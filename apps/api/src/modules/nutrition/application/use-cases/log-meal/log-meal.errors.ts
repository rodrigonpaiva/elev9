export const LOG_MEAL_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NUTRITION_PLAN_NOT_FOUND: 'NUTRITION_PLAN_NOT_FOUND',
  MEAL_NOT_FOUND: 'NUTRITION_LOG_MEAL_NOT_FOUND',
  MEAL_DATE_MISMATCH: 'NUTRITION_LOG_MEAL_DATE_MISMATCH',
  INVALID_INPUT: 'NUTRITION_LOG_INVALID_INPUT',
  DUPLICATE_LOG: 'NUTRITION_LOG_DUPLICATE',
  INTERNAL_ERROR: 'NUTRITION_LOG_INTERNAL_ERROR',
} as const;

export type LogMealErrorCode =
  (typeof LOG_MEAL_ERROR_CODES)[keyof typeof LOG_MEAL_ERROR_CODES];

export class LogMealError extends Error {
  readonly code: LogMealErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: LogMealErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LogMealError';
    this.code = code;
    this.details = details;
  }
}
