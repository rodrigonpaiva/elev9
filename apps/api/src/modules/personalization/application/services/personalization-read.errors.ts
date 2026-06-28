import type { UserProfile } from '../../../users/domain/entities/user-profile.entity';
import type { UserProfileRepository } from '../../../users/domain/repositories/user-profile.repository';

export const PERSONALIZATION_READ_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INTERNAL_ERROR: 'PERSONALIZATION_READ_INTERNAL_ERROR',
} as const;

export type PersonalizationReadErrorCode =
  (typeof PERSONALIZATION_READ_ERROR_CODES)[keyof typeof PERSONALIZATION_READ_ERROR_CODES];

export class PersonalizationReadError extends Error {
  readonly code: PersonalizationReadErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: PersonalizationReadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PersonalizationReadError';
    this.code = code;
    this.details = details;
  }
}

export async function resolveUserProfileOrThrow<
  TError extends PersonalizationReadError,
>(input: {
  authUserId: string;
  userProfileRepository: UserProfileRepository;
  errorFactory: (
    code: PersonalizationReadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) => TError;
}): Promise<UserProfile> {
  const authUserId =
    typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

  if (!authUserId) {
    throw input.errorFactory(
      PERSONALIZATION_READ_ERROR_CODES.INVALID_SESSION,
      'Invalid session.',
    );
  }

  const userProfile =
    await input.userProfileRepository.findByAuthUserId(authUserId);

  if (!userProfile) {
    throw input.errorFactory(
      PERSONALIZATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
      'User profile not found.',
    );
  }

  return userProfile;
}

export function normalizeLimit<TError extends PersonalizationReadError>(
  limit: unknown,
  defaultLimit: number,
  maxLimit: number,
  errorFactory: (
    code: PersonalizationReadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) => TError,
): number {
  if (limit === undefined) {
    return defaultLimit;
  }

  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > maxLimit
  ) {
    throw errorFactory(
      PERSONALIZATION_READ_ERROR_CODES.INVALID_LIMIT,
      `Limit must be between 1 and ${maxLimit}.`,
      {
        limit,
        maxLimit,
      },
    );
  }

  return limit;
}
