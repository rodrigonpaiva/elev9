export const GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_LIMIT: 'ADAPTIVE_TRAINING_HISTORY_INVALID_LIMIT',
  INTERNAL_ERROR: 'ADAPTIVE_TRAINING_HISTORY_INTERNAL_ERROR',
} as const;

export type GetAdaptiveTrainingHistoryErrorCode =
  (typeof GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES)[keyof typeof GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES];

export class GetAdaptiveTrainingHistoryError extends Error {
  readonly code: GetAdaptiveTrainingHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetAdaptiveTrainingHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetAdaptiveTrainingHistoryError';
    this.code = code;
    this.details = details;
  }
}
