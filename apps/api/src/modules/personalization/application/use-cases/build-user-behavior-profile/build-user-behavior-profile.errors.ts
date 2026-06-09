export const BUILD_USER_BEHAVIOR_PROFILE_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'PERSONALIZATION_PROFILE_BUILD_INTERNAL_ERROR',
} as const;

export type BuildUserBehaviorProfileErrorCode =
  (typeof BUILD_USER_BEHAVIOR_PROFILE_ERROR_CODES)[keyof typeof BUILD_USER_BEHAVIOR_PROFILE_ERROR_CODES];

export class BuildUserBehaviorProfileError extends Error {
  readonly code: BuildUserBehaviorProfileErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildUserBehaviorProfileErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildUserBehaviorProfileError';
    this.code = code;
    this.details = details;
  }
}
