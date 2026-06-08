export const BUILD_HABIT_RISK_SIGNALS_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'HABIT_BUILD_INTERNAL_ERROR',
} as const;

export type BuildHabitRiskSignalsErrorCode =
  (typeof BUILD_HABIT_RISK_SIGNALS_ERROR_CODES)[keyof typeof BUILD_HABIT_RISK_SIGNALS_ERROR_CODES];

export class BuildHabitRiskSignalsError extends Error {
  readonly code: BuildHabitRiskSignalsErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildHabitRiskSignalsErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildHabitRiskSignalsError';
    this.code = code;
    this.details = details;
  }
}
