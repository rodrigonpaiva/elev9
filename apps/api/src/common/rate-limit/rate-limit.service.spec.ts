import { resolveRateLimitConfig } from './rate-limit.config';
import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it('uses a hashed IP and user combination without exposing identity in the key', async () => {
    const store = {
      increment: jest.fn().mockResolvedValue({ count: 1, resetAt: 1000 }),
    };
    const service = new RateLimitService(
      store,
      resolveRateLimitConfig({ nodeEnv: 'test' }),
    );

    const decision = await service.check({
      method: 'POST',
      path: '/ai/chat',
      ip: '127.0.0.1',
      authUser: { id: 'user-private-id' },
    } as never);

    expect(decision?.allowed).toBe(true);
    const key = store.increment.mock.calls[0][0] as string;
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).not.toContain('user-private-id');
    expect(key).not.toContain('127.0.0.1');
  });

  it('uses an IP-only key for anonymous auth requests', async () => {
    const store = {
      increment: jest.fn().mockResolvedValue({ count: 1, resetAt: 1000 }),
    };
    const service = new RateLimitService(
      store,
      resolveRateLimitConfig({ nodeEnv: 'test' }),
    );

    await service.check({
      method: 'POST',
      path: '/auth/login',
      ip: '127.0.0.1',
    } as never);

    expect(store.increment).toHaveBeenCalledTimes(1);
    expect(store.increment.mock.calls[0][0]).toMatch(/^[a-f0-9]{64}$/);
  });

  it('distinguishes authenticated users sharing the same IP', async () => {
    const store = {
      increment: jest.fn().mockResolvedValue({ count: 1, resetAt: 1000 }),
    };
    const service = new RateLimitService(
      store,
      resolveRateLimitConfig({ nodeEnv: 'test' }),
    );

    await service.check({
      method: 'POST',
      path: '/ai/chat',
      ip: '127.0.0.1',
      authUser: { id: 'user-a' },
    } as never);
    await service.check({
      method: 'POST',
      path: '/ai/chat',
      ip: '127.0.0.1',
      authUser: { id: 'user-b' },
    } as never);

    expect(store.increment.mock.calls[0][0]).not.toBe(
      store.increment.mock.calls[1][0],
    );
  });
});
