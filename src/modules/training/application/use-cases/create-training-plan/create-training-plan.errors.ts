export const CREATE_TRAINING_PLAN_ERROR_CODES = {
  FITNESS_PROFILE_NOT_FOUND: "FITNESS_PROFILE_NOT_FOUND",
  ALREADY_EXISTS: "TRAINING_PLAN_ALREADY_EXISTS",
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  INTERNAL_ERROR: "TRAINING_PLAN_INTERNAL_ERROR",
} as const;

export type CreateTrainingPlanErrorCode =
  (typeof CREATE_TRAINING_PLAN_ERROR_CODES)[keyof typeof CREATE_TRAINING_PLAN_ERROR_CODES];

export class CreateTrainingPlanError extends Error {
  readonly code: CreateTrainingPlanErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreateTrainingPlanErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CreateTrainingPlanError";
    this.code = code;
    this.details = details;
  }
}
