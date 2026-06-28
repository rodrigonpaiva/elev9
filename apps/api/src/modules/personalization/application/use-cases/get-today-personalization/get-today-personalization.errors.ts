import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
} from '../../services/personalization-read.errors';

export const GET_TODAY_PERSONALIZATION_ERROR_CODES =
  PERSONALIZATION_READ_ERROR_CODES;

export type GetTodayPersonalizationErrorCode =
  (typeof PERSONALIZATION_READ_ERROR_CODES)[keyof typeof PERSONALIZATION_READ_ERROR_CODES];

export class GetTodayPersonalizationError extends PersonalizationReadError {}
