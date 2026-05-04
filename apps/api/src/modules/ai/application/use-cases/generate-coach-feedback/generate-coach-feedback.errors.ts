export const GENERATE_COACH_FEEDBACK_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  FITNESS_PROFILE_NOT_FOUND: "FITNESS_PROFILE_NOT_FOUND",
  INVALID_INPUT: "AI_COACH_INVALID_INPUT",
  INTERNAL_ERROR: "AI_COACH_INTERNAL_ERROR",
} as const;

export type GenerateCoachFeedbackErrorCode =
  (typeof GENERATE_COACH_FEEDBACK_ERROR_CODES)[keyof typeof GENERATE_COACH_FEEDBACK_ERROR_CODES];

export class GenerateCoachFeedbackError extends Error {
  readonly code: GenerateCoachFeedbackErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GenerateCoachFeedbackErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GenerateCoachFeedbackError";
    this.code = code;
    this.details = details;
  }
}
