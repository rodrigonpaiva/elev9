import { IdempotentUpsertHelper } from './idempotent-upsert.helper';

describe('IdempotentUpsertHelper', () => {
  it('returns the reloaded record on duplicate key', async () => {
    const reload = jest.fn().mockResolvedValue({ id: 'record_1' });

    await expect(
      IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error: { code: 11000 },
        reload,
      }),
    ).resolves.toEqual({ id: 'record_1' });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('rethrows unrelated errors', async () => {
    const error = new Error('boom');
    const reload = jest.fn();

    await expect(
      IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload,
      }),
    ).rejects.toBe(error);

    expect(reload).not.toHaveBeenCalled();
  });

  it('throws the provided not-found error when the reload cannot recover', async () => {
    const reload = jest.fn().mockResolvedValue(null);
    const notFoundError = new Error('not found');

    await expect(
      IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error: { code: 11000 },
        reload,
        notFoundError,
      }),
    ).rejects.toBe(notFoundError);
  });
});
