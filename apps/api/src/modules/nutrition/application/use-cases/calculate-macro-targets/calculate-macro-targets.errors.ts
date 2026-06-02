export const CALCULATE_MACRO_TARGETS_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  FITNESS_PROFILE_NOT_FOUND: 'FITNESS_PROFILE_NOT_FOUND',
  NUTRITION_PROFILE_NOT_FOUND: 'NUTRITION_PROFILE_NOT_FOUND',
  HEIGHT_CM_MISSING: 'MACRO_TARGETS_HEIGHT_CM_MISSING',
  WEIGHT_KG_MISSING: 'MACRO_TARGETS_WEIGHT_KG_MISSING',
  INVALID_GOAL: 'MACRO_TARGETS_INVALID_GOAL',
  INVALID_ACTIVITY_LEVEL: 'MACRO_TARGETS_INVALID_ACTIVITY_LEVEL',
  INTERNAL_ERROR: 'MACRO_TARGETS_INTERNAL_ERROR',
} as const;

export type CalculateMacroTargetsErrorCode =
  (typeof CALCULATE_MACRO_TARGETS_ERROR_CODES)[keyof typeof CALCULATE_MACRO_TARGETS_ERROR_CODES];

export class CalculateMacroTargetsError extends Error {
  readonly code: CalculateMacroTargetsErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CalculateMacroTargetsErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CalculateMacroTargetsError';
    this.code = code;
    this.details = details;
  }
}
