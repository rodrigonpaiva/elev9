import type { UserProfile } from '../../../users/domain/entities/user-profile.entity';
import type { UserProfileRepository } from '../../../users/domain/repositories/user-profile.repository';

export const HABIT_READ_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INTERNAL_ERROR: 'HABIT_READ_INTERNAL_ERROR',
} as const;

export type HabitReadErrorCode =
  (typeof HABIT_READ_ERROR_CODES)[keyof typeof HABIT_READ_ERROR_CODES];

export class HabitReadError extends Error {
  readonly code: HabitReadErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: HabitReadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HabitReadError';
    this.code = code;
    this.details = details;
  }
}

export async function resolveUserProfileOrThrow<
  TError extends HabitReadError,
>(input: {
  authUserId: string;
  userProfileRepository: UserProfileRepository;
  errorFactory: (
    code: HabitReadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) => TError;
}): Promise<UserProfile> {
  const authUserId =
    typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

  if (!authUserId) {
    throw input.errorFactory(
      HABIT_READ_ERROR_CODES.INVALID_SESSION,
      'Invalid session.',
    );
  }

  const userProfile =
    await input.userProfileRepository.findByAuthUserId(authUserId);

  if (!userProfile) {
    throw input.errorFactory(
      HABIT_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
      'User profile not found.',
    );
  }

  return userProfile;
}

export function normalizeLimit<TError extends HabitReadError>(
  limit: unknown,
  defaultLimit: number,
  maxLimit: number,
  errorFactory: (
    code: HabitReadErrorCode,
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
      HABIT_READ_ERROR_CODES.INVALID_LIMIT,
      `Limit must be between 1 and ${maxLimit}.`,
      {
        limit,
        maxLimit,
      },
    );
  }

  return limit;
}
