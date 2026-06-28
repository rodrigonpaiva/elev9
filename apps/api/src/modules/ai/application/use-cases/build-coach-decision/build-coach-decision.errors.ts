export const BUILD_COACH_DECISION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'COACH_DECISION_INTERNAL_ERROR',
} as const;

export type BuildCoachDecisionErrorCode =
  (typeof BUILD_COACH_DECISION_ERROR_CODES)[keyof typeof BUILD_COACH_DECISION_ERROR_CODES];

export class BuildCoachDecisionError extends Error {
  readonly code: BuildCoachDecisionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildCoachDecisionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildCoachDecisionError';
    this.code = code;
    this.details = details;
  }
}
