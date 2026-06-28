export const GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'CURRENT_ADAPTIVE_TRAINING_INTERNAL_ERROR',
} as const;

export type GetCurrentAdaptiveTrainingErrorCode =
  (typeof GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES)[keyof typeof GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES];

export class GetCurrentAdaptiveTrainingError extends Error {
  readonly code: GetCurrentAdaptiveTrainingErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCurrentAdaptiveTrainingErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetCurrentAdaptiveTrainingError';
    this.code = code;
    this.details = details;
  }
}
