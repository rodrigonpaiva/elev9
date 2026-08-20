import { MemoryRateLimitStore } from './rate-limit.store';

describe('MemoryRateLimitStore', () => {
  it('increments within a window and resets after the window', async () => {
    const store = new MemoryRateLimitStore();

    await expect(store.increment('key', 1000, 10)).resolves.toEqual({
      count: 1,
      resetAt: 1010,
    });
    await expect(store.increment('key', 1000, 500)).resolves.toEqual({
      count: 2,
      resetAt: 1010,
    });
    await expect(store.increment('key', 1000, 1010)).resolves.toEqual({
      count: 1,
      resetAt: 2010,
    });
  });
});
