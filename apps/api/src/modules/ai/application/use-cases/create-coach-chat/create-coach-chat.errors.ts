export const CREATE_COACH_CHAT_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_INPUT: 'AI_CHAT_INVALID_INPUT',
  INTERNAL_ERROR: 'AI_CHAT_INTERNAL_ERROR',
} as const;

export type CreateCoachChatErrorCode =
  (typeof CREATE_COACH_CHAT_ERROR_CODES)[keyof typeof CREATE_COACH_CHAT_ERROR_CODES];

export class CreateCoachChatError extends Error {
  readonly code: CreateCoachChatErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CreateCoachChatErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CreateCoachChatError';
    this.code = code;
    this.details = details;
  }
}
