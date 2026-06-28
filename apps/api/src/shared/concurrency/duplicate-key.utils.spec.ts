import { DUPLICATE_KEY_ERROR_CODE } from './concurrency.types';
import { isDuplicateKeyError } from './duplicate-key.utils';

describe('isDuplicateKeyError', () => {
  it('detects a duplicate key error', () => {
    expect(isDuplicateKeyError({ code: DUPLICATE_KEY_ERROR_CODE })).toBe(true);
  });

  it('rejects a non duplicate key error', () => {
    expect(isDuplicateKeyError({ code: 42 })).toBe(false);
    expect(isDuplicateKeyError(new Error('boom'))).toBe(false);
  });
});
