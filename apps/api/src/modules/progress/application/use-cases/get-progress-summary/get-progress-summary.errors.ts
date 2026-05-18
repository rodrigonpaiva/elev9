export const GET_PROGRESS_SUMMARY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  FITNESS_PROFILE_NOT_FOUND: 'FITNESS_PROFILE_NOT_FOUND',
  INVALID_INPUT: 'PROGRESS_SUMMARY_INVALID_INPUT',
  INTERNAL_ERROR: 'PROGRESS_SUMMARY_INTERNAL_ERROR',
} as const;

export type GetProgressSummaryErrorCode =
  (typeof GET_PROGRESS_SUMMARY_ERROR_CODES)[keyof typeof GET_PROGRESS_SUMMARY_ERROR_CODES];

export class GetProgressSummaryError extends Error {
  readonly code: GetProgressSummaryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetProgressSummaryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetProgressSummaryError';
    this.code = code;
    this.details = details;
  }
}
