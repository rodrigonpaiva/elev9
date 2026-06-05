export const RECORD_ENGAGEMENT_EVENT_ERROR_CODES = {
  INVALID_INPUT: 'RECORD_NOTIFICATION_ENGAGEMENT_INVALID_INPUT',
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  INTERNAL_ERROR: 'RECORD_NOTIFICATION_ENGAGEMENT_INTERNAL_ERROR',
} as const;

export type RecordEngagementEventErrorCode =
  (typeof RECORD_ENGAGEMENT_EVENT_ERROR_CODES)[keyof typeof RECORD_ENGAGEMENT_EVENT_ERROR_CODES];

export class RecordEngagementEventError extends Error {
  readonly code: RecordEngagementEventErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: RecordEngagementEventErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'RecordEngagementEventError';
    this.code = code;
    this.details = details;
  }
}
