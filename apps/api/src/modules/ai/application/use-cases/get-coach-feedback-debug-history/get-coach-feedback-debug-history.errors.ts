export const GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_INPUT: "AI_FEEDBACK_DEBUG_HISTORY_INVALID_INPUT",
  INTERNAL_ERROR: "AI_FEEDBACK_DEBUG_HISTORY_INTERNAL_ERROR",
} as const;

export type GetCoachFeedbackDebugHistoryErrorCode =
  (typeof GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES)[keyof typeof GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES];

export class GetCoachFeedbackDebugHistoryError extends Error {
  readonly code: GetCoachFeedbackDebugHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachFeedbackDebugHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachFeedbackDebugHistoryError";
    this.code = code;
    this.details = details;
  }
}
