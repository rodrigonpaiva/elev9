export const GET_CURRENT_COACH_DECISION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'COACH_DECISION_INTERNAL_ERROR',
} as const;

export type GetCurrentCoachDecisionErrorCode =
  (typeof GET_CURRENT_COACH_DECISION_ERROR_CODES)[keyof typeof GET_CURRENT_COACH_DECISION_ERROR_CODES];

export class GetCurrentCoachDecisionError extends Error {
  readonly code: GetCurrentCoachDecisionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCurrentCoachDecisionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetCurrentCoachDecisionError';
    this.code = code;
    this.details = details;
  }
}
