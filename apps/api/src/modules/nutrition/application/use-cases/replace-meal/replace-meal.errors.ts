export const REPLACE_MEAL_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NUTRITION_PROFILE_NOT_FOUND: 'NUTRITION_PROFILE_NOT_FOUND',
  NUTRITION_PLAN_NOT_FOUND: 'NUTRITION_PLAN_NOT_FOUND',
  MEAL_NOT_FOUND: 'REPLACE_MEAL_NOT_FOUND',
  MEAL_ALREADY_LOGGED: 'REPLACE_MEAL_ALREADY_LOGGED',
  NO_COMPATIBLE_ALTERNATIVE: 'REPLACE_MEAL_NO_COMPATIBLE_ALTERNATIVE',
  INTERNAL_ERROR: 'REPLACE_MEAL_INTERNAL_ERROR',
} as const;

export type ReplaceMealErrorCode =
  (typeof REPLACE_MEAL_ERROR_CODES)[keyof typeof REPLACE_MEAL_ERROR_CODES];

export class ReplaceMealError extends Error {
  readonly code: ReplaceMealErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ReplaceMealErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReplaceMealError';
    this.code = code;
    this.details = details;
  }
}
