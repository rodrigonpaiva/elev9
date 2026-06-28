export const BUILD_CONSISTENCY_SUMMARY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'HABIT_BUILD_INTERNAL_ERROR',
} as const;

export type BuildConsistencySummaryErrorCode =
  (typeof BUILD_CONSISTENCY_SUMMARY_ERROR_CODES)[keyof typeof BUILD_CONSISTENCY_SUMMARY_ERROR_CODES];

export class BuildConsistencySummaryError extends Error {
  readonly code: BuildConsistencySummaryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildConsistencySummaryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildConsistencySummaryError';
    this.code = code;
    this.details = details;
  }
}
