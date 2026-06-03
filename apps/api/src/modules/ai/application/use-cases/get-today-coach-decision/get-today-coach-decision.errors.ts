export const GET_TODAY_COACH_DECISION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'COACH_DECISION_INTERNAL_ERROR',
} as const;

export type GetTodayCoachDecisionErrorCode =
  (typeof GET_TODAY_COACH_DECISION_ERROR_CODES)[keyof typeof GET_TODAY_COACH_DECISION_ERROR_CODES];

export class GetTodayCoachDecisionError extends Error {
  readonly code: GetTodayCoachDecisionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetTodayCoachDecisionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetTodayCoachDecisionError';
    this.code = code;
    this.details = details;
  }
}
