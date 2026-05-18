export const GET_MY_FITNESS_PROFILE_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  FITNESS_PROFILE_NOT_FOUND: 'FITNESS_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'FITNESS_PROFILE_INTERNAL_ERROR',
} as const;

export type GetMyFitnessProfileErrorCode =
  (typeof GET_MY_FITNESS_PROFILE_ERROR_CODES)[keyof typeof GET_MY_FITNESS_PROFILE_ERROR_CODES];

export class GetMyFitnessProfileError extends Error {
  readonly code: GetMyFitnessProfileErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetMyFitnessProfileErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetMyFitnessProfileError';
    this.code = code;
    this.details = details;
  }
}
