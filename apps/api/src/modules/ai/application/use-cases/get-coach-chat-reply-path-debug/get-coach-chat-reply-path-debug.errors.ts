export const GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_INPUT: "AI_CHAT_REPLY_PATH_DEBUG_INVALID_INPUT",
  INTERNAL_ERROR: "AI_CHAT_REPLY_PATH_DEBUG_INTERNAL_ERROR",
} as const;

export type GetCoachChatReplyPathDebugErrorCode =
  (typeof GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES)[keyof typeof GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES];

export class GetCoachChatReplyPathDebugError extends Error {
  readonly code: GetCoachChatReplyPathDebugErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachChatReplyPathDebugErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachChatReplyPathDebugError";
    this.code = code;
    this.details = details;
  }
}
