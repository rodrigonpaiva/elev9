export const COACH_INTELLIGENCE_ERROR_CODES = {
  INVALID_SESSION: 'COACH_INTELLIGENCE_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'COACH_INTELLIGENCE_USER_PROFILE_NOT_FOUND',
  FEATURE_DISABLED: 'COACH_INTELLIGENCE_FEATURE_DISABLED',
  INTERNAL_ERROR: 'COACH_INTELLIGENCE_INTERNAL_ERROR',
} as const;

export type CoachIntelligenceErrorCode =
  (typeof COACH_INTELLIGENCE_ERROR_CODES)[keyof typeof COACH_INTELLIGENCE_ERROR_CODES];

export class CoachIntelligenceConfigurationError extends Error {
  readonly code = 'COACH_INTELLIGENCE_CONFIGURATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'CoachIntelligenceConfigurationError';
  }
}

export class GetCoachIntelligenceError extends Error {
  readonly code: CoachIntelligenceErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: CoachIntelligenceErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GetCoachIntelligenceError';
    this.code = code;
    this.details = details;
  }
}
