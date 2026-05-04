export const GET_COACH_FEEDBACK_HISTORY_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_INPUT: "AI_FEEDBACK_HISTORY_INVALID_INPUT",
  INTERNAL_ERROR: "AI_FEEDBACK_HISTORY_INTERNAL_ERROR",
} as const;

export type GetCoachFeedbackHistoryErrorCode =
  (typeof GET_COACH_FEEDBACK_HISTORY_ERROR_CODES)[keyof typeof GET_COACH_FEEDBACK_HISTORY_ERROR_CODES];

export class GetCoachFeedbackHistoryError extends Error {
  readonly code: GetCoachFeedbackHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachFeedbackHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachFeedbackHistoryError";
    this.code = code;
    this.details = details;
  }
}
