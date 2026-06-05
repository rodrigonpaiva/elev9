export const REPLAY_NOTIFICATION_DECISION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  INTERNAL_ERROR: 'NOTIFICATION_REPLAY_INTERNAL_ERROR',
} as const;

export type ReplayNotificationDecisionErrorCode =
  (typeof REPLAY_NOTIFICATION_DECISION_ERROR_CODES)[keyof typeof REPLAY_NOTIFICATION_DECISION_ERROR_CODES];

export class ReplayNotificationDecisionError extends Error {
  readonly code: ReplayNotificationDecisionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ReplayNotificationDecisionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ReplayNotificationDecisionError';
    this.code = code;
    this.details = details;
  }
}
