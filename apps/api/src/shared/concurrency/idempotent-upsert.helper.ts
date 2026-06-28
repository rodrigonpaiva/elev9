import { isDuplicateKeyError } from './duplicate-key.utils';

export class IdempotentUpsertHelper {
  static async handleDuplicateKeyFallback<T>(input: {
    error: unknown;
    reload: () => Promise<T | null | undefined>;
    notFoundError?: Error;
  }): Promise<T> {
    if (!isDuplicateKeyError(input.error)) {
      throw input.error;
    }

    const reloaded = await input.reload();

    if (reloaded !== null && reloaded !== undefined) {
      return reloaded;
    }

    if (input.notFoundError) {
      throw input.notFoundError;
    }

    throw input.error;
  }
}
