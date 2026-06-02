export const GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'TODAY_ADAPTIVE_TRAINING_INTERNAL_ERROR',
} as const;

export type GetTodayAdaptiveTrainingErrorCode =
  (typeof GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES)[keyof typeof GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES];

export class GetTodayAdaptiveTrainingError extends Error {
  readonly code: GetTodayAdaptiveTrainingErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetTodayAdaptiveTrainingErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetTodayAdaptiveTrainingError';
    this.code = code;
    this.details = details;
  }
}
