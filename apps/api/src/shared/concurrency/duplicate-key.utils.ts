import {
  DUPLICATE_KEY_ERROR_CODE,
  type DuplicateKeyErrorLike,
} from './concurrency.types';

export function isDuplicateKeyError(
  error: unknown,
): error is DuplicateKeyErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as DuplicateKeyErrorLike).code === DUPLICATE_KEY_ERROR_CODE
  );
}
