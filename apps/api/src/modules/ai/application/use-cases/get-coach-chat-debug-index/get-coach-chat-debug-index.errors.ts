export const GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  INVALID_INPUT: "AI_CHAT_DEBUG_INDEX_INVALID_INPUT",
  INTERNAL_ERROR: "AI_CHAT_DEBUG_INDEX_INTERNAL_ERROR",
} as const;

export type GetCoachChatDebugIndexErrorCode =
  (typeof GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES)[keyof typeof GET_COACH_CHAT_DEBUG_INDEX_ERROR_CODES];

export class GetCoachChatDebugIndexError extends Error {
  readonly code: GetCoachChatDebugIndexErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachChatDebugIndexErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachChatDebugIndexError";
    this.code = code;
    this.details = details;
  }
}
