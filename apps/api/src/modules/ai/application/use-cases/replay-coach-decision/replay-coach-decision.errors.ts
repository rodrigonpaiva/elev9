export const REPLAY_COACH_DECISION_ERROR_CODES = {
  INVALID_INPUT: 'AI_COACH_DECISION_REPLAY_INVALID_INPUT',
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  COACH_DECISION_NOT_FOUND: 'COACH_DECISION_NOT_FOUND',
  INTERNAL_ERROR: 'COACH_DECISION_REPLAY_INTERNAL_ERROR',
} as const;

export type ReplayCoachDecisionErrorCode =
  (typeof REPLAY_COACH_DECISION_ERROR_CODES)[keyof typeof REPLAY_COACH_DECISION_ERROR_CODES];

export class ReplayCoachDecisionError extends Error {
  readonly code: ReplayCoachDecisionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ReplayCoachDecisionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReplayCoachDecisionError';
    this.code = code;
    this.details = details;
  }
}
