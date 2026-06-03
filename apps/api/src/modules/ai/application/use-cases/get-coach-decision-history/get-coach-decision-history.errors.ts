export const GET_COACH_DECISION_HISTORY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INTERNAL_ERROR: 'COACH_DECISION_INTERNAL_ERROR',
} as const;

export type GetCoachDecisionHistoryErrorCode =
  (typeof GET_COACH_DECISION_HISTORY_ERROR_CODES)[keyof typeof GET_COACH_DECISION_HISTORY_ERROR_CODES];

export class GetCoachDecisionHistoryError extends Error {
  readonly code: GetCoachDecisionHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachDecisionHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetCoachDecisionHistoryError';
    this.code = code;
    this.details = details;
  }
}
