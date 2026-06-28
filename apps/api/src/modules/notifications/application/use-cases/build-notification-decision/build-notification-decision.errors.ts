export const BUILD_NOTIFICATION_DECISION_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'NOTIFICATION_DECISION_INTERNAL_ERROR',
} as const;

export type BuildNotificationDecisionErrorCode =
  (typeof BUILD_NOTIFICATION_DECISION_ERROR_CODES)[keyof typeof BUILD_NOTIFICATION_DECISION_ERROR_CODES];

export class BuildNotificationDecisionError extends Error {
  readonly code: BuildNotificationDecisionErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildNotificationDecisionErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildNotificationDecisionError';
    this.code = code;
    this.details = details;
  }
}
