export const REPLAY_COACH_FEEDBACK_ERROR_CODES = {
  INVALID_INPUT: 'AI_COACH_REPLAY_INVALID_INPUT',
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  COACH_FEEDBACK_NOT_FOUND: 'COACH_FEEDBACK_NOT_FOUND',
  CONTEXT_MISSING: 'COACH_FEEDBACK_REPLAY_CONTEXT_MISSING',
  GENERATOR_VERSION_UNSUPPORTED: 'COACH_FEEDBACK_GENERATOR_VERSION_UNSUPPORTED',
  INTERNAL_ERROR: 'COACH_FEEDBACK_REPLAY_INTERNAL_ERROR',
} as const;

export type ReplayCoachFeedbackErrorCode =
  (typeof REPLAY_COACH_FEEDBACK_ERROR_CODES)[keyof typeof REPLAY_COACH_FEEDBACK_ERROR_CODES];

export class ReplayCoachFeedbackError extends Error {
  readonly code: ReplayCoachFeedbackErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ReplayCoachFeedbackErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReplayCoachFeedbackError';
    this.code = code;
    this.details = details;
  }
}
