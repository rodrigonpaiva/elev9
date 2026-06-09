import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
} from '../../services/personalization-read.errors';

export const GET_BEHAVIORAL_PATTERNS_ERROR_CODES =
  PERSONALIZATION_READ_ERROR_CODES;

export type GetBehavioralPatternsErrorCode =
  (typeof PERSONALIZATION_READ_ERROR_CODES)[keyof typeof PERSONALIZATION_READ_ERROR_CODES];

export class GetBehavioralPatternsError extends PersonalizationReadError {}
