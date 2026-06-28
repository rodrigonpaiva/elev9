import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
} from '../../services/personalization-read.errors';

export const GET_PERSONALIZATION_HISTORY_ERROR_CODES =
  PERSONALIZATION_READ_ERROR_CODES;

export type GetPersonalizationHistoryErrorCode =
  (typeof PERSONALIZATION_READ_ERROR_CODES)[keyof typeof PERSONALIZATION_READ_ERROR_CODES];

export class GetPersonalizationHistoryError extends PersonalizationReadError {}
