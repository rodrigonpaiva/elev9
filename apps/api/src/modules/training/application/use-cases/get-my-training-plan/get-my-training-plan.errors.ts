export const GET_MY_TRAINING_PLAN_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  FITNESS_PROFILE_NOT_FOUND: 'FITNESS_PROFILE_NOT_FOUND',
  TRAINING_PLAN_NOT_FOUND: 'TRAINING_PLAN_NOT_FOUND',
  INTERNAL_ERROR: 'TRAINING_PLAN_INTERNAL_ERROR',
} as const;

export type GetMyTrainingPlanErrorCode =
  (typeof GET_MY_TRAINING_PLAN_ERROR_CODES)[keyof typeof GET_MY_TRAINING_PLAN_ERROR_CODES];

export class GetMyTrainingPlanError extends Error {
  readonly code: GetMyTrainingPlanErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetMyTrainingPlanErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetMyTrainingPlanError';
    this.code = code;
    this.details = details;
  }
}
