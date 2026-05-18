export const GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_INPUT: "AI_CHAT_DEBUG_HISTORY_INVALID_INPUT",
  INTERNAL_ERROR: "AI_CHAT_DEBUG_HISTORY_INTERNAL_ERROR",
} as const;

export type GetCoachChatDebugHistoryErrorCode =
  (typeof GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES)[keyof typeof GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES];

export class GetCoachChatDebugHistoryError extends Error {
  readonly code: GetCoachChatDebugHistoryErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachChatDebugHistoryErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachChatDebugHistoryError";
    this.code = code;
    this.details = details;
  }
}
