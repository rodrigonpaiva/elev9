export const NOTIFICATION_READ_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INTERNAL_ERROR: 'NOTIFICATION_READ_INTERNAL_ERROR',
} as const;

export type NotificationReadErrorCode =
  (typeof NOTIFICATION_READ_ERROR_CODES)[keyof typeof NOTIFICATION_READ_ERROR_CODES];

export class NotificationReadError extends Error {
  readonly code: NotificationReadErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: NotificationReadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'NotificationReadError';
    this.code = code;
    this.details = details;
  }
}
