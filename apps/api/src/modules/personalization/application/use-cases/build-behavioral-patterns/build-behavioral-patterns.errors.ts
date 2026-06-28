export const BUILD_BEHAVIORAL_PATTERNS_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INTERNAL_ERROR: 'PERSONALIZATION_PATTERNS_BUILD_INTERNAL_ERROR',
} as const;

export type BuildBehavioralPatternsErrorCode =
  (typeof BUILD_BEHAVIORAL_PATTERNS_ERROR_CODES)[keyof typeof BUILD_BEHAVIORAL_PATTERNS_ERROR_CODES];

export class BuildBehavioralPatternsError extends Error {
  readonly code: BuildBehavioralPatternsErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: BuildBehavioralPatternsErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'BuildBehavioralPatternsError';
    this.code = code;
    this.details = details;
  }
}
