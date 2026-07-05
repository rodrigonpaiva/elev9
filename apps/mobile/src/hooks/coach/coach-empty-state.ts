import { ApiClientError } from '@elev9/api-client';

const OPTIONAL_EMPTY_STATE_CODES = [
  'USER_PROFILE_NOT_FOUND',
  'GOAL_NOT_FOUND',
  'HABIT_SNAPSHOT_NOT_FOUND',
  'PERSONALIZATION_SNAPSHOT_NOT_FOUND',
  'NOT_FOUND',
] as const;

export function isCoachOptionalEmptyState(
  error: unknown,
  extraCodes: readonly string[] = [],
): boolean {
  return (
    error instanceof ApiClientError &&
    [...OPTIONAL_EMPTY_STATE_CODES, ...extraCodes].includes(error.code)
  );
}
