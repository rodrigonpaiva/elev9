export const GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES = {
  INVALID_SESSION: "AUTH_INVALID_SESSION",
  USER_PROFILE_NOT_FOUND: "USER_PROFILE_NOT_FOUND",
  INVALID_INPUT: "AI_CHAT_PROMPT_DEBUG_INVALID_INPUT",
  INTERNAL_ERROR: "AI_CHAT_PROMPT_DEBUG_INTERNAL_ERROR",
} as const;

export type GetCoachChatPromptDebugErrorCode =
  (typeof GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES)[keyof typeof GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES];

export class GetCoachChatPromptDebugError extends Error {
  readonly code: GetCoachChatPromptDebugErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GetCoachChatPromptDebugErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "GetCoachChatPromptDebugError";
    this.code = code;
    this.details = details;
  }
}
