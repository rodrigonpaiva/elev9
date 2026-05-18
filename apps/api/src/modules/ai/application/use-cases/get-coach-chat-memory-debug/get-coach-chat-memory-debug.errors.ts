export const GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES = {
  INVALID_INPUT: "AI_CHAT_MEMORY_DEBUG_INVALID_INPUT",
  INVALID_SESSION: "AI_CHAT_MEMORY_DEBUG_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "AI_CHAT_MEMORY_DEBUG_USER_PROFILE_NOT_FOUND",
  INTERNAL_ERROR: "AI_CHAT_MEMORY_DEBUG_INTERNAL_ERROR",
} as const;

export type GetCoachChatMemoryDebugErrorCode =
  (typeof GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES)[keyof typeof GET_COACH_CHAT_MEMORY_DEBUG_ERROR_CODES];

export class GetCoachChatMemoryDebugError extends Error {
  readonly code: GetCoachChatMemoryDebugErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachChatMemoryDebugErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachChatMemoryDebugError";
    this.code = code;
    this.details = details;
  }
}
