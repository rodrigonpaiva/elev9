import {
  PERSONALIZATION_READ_ERROR_CODES,
  PersonalizationReadError,
} from '../../services/personalization-read.errors';

export const GET_USER_BEHAVIOR_PROFILE_ERROR_CODES =
  PERSONALIZATION_READ_ERROR_CODES;

export type GetUserBehaviorProfileErrorCode =
  (typeof PERSONALIZATION_READ_ERROR_CODES)[keyof typeof PERSONALIZATION_READ_ERROR_CODES];

export class GetUserBehaviorProfileError extends PersonalizationReadError {}
