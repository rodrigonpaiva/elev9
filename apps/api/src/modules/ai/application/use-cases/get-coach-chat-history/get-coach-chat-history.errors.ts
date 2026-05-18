export const GET_COACH_CHAT_HISTORY_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_INPUT: "AI_CHAT_HISTORY_INVALID_INPUT",
  INTERNAL_ERROR: "AI_CHAT_HISTORY_INTERNAL_ERROR",
} as const;

export type GetCoachChatHistoryErrorCode =
  (typeof GET_COACH_CHAT_HISTORY_ERROR_CODES)[keyof typeof GET_COACH_CHAT_HISTORY_ERROR_CODES];

export class GetCoachChatHistoryError extends Error {
  readonly code: GetCoachChatHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachChatHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachChatHistoryError";
    this.code = code;
    this.details = details;
  }
}
