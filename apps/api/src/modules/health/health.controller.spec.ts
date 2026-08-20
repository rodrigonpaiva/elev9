import type { Response } from 'express';
import { Connection } from 'mongoose';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  const originalEnvironment = {
    AI_LLM_ENABLED: process.env.AI_LLM_ENABLED,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RATE_LIMIT_STORE: process.env.RATE_LIMIT_STORE,
    HEALTH_MONGO_TIMEOUT_MS: process.env.HEALTH_MONGO_TIMEOUT_MS,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.useRealTimers();
  });

  it('returns ok for liveness checks', () => {
    const controller = new HealthController({ readyState: 1 } as Connection);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: expect.any(String),
    });
  });

  it('returns ready when MongoDB is connected', async () => {
    const connection = {
      readyState: 1,
      db: { admin: () => ({ ping: jest.fn().mockResolvedValue(undefined) }) },
    } as unknown as Connection;
    const controller = new HealthController(connection);
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toEqual({
      status: 'ready',
      service: 'api',
      checks: {
        mongo: 'up',
        configuration: 'valid',
        llm: 'disabled',
        redis: 'not_required',
      },
      timestamp: expect.any(String),
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('returns not ready when MongoDB is not connected', async () => {
    const controller = new HealthController({ readyState: 0 } as Connection);
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toMatchObject({
      status: 'not_ready',
      checks: { mongo: 'down' },
    });
    expect(response.status).toHaveBeenCalledWith(503);
  });

  it('does not call an LLM provider and reports invalid LLM configuration', async () => {
    process.env.AI_LLM_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    const controller = new HealthController({ readyState: 0 } as Connection);
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toMatchObject({
      status: 'not_ready',
      checks: { llm: 'misconfigured' },
    });
  });

  it('times out a MongoDB readiness ping without leaking its error', async () => {
    jest.useFakeTimers();
    process.env.HEALTH_MONGO_TIMEOUT_MS = '10';
    const ping = jest.fn(() => new Promise<void>(() => undefined));
    const connection = {
      readyState: 1,
      db: { admin: () => ({ ping }) },
    } as unknown as Connection;
    const controller = new HealthController(connection);
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const readiness = controller.getReadiness(response);
    await jest.advanceTimersByTimeAsync(10);

    await expect(readiness).resolves.toMatchObject({
      status: 'not_ready',
      checks: { mongo: 'down' },
    });
    expect(JSON.stringify(await readiness)).not.toContain('health dependency');
  });

  it('does not report Redis as ready when its unapproved backend is selected', async () => {
    process.env.RATE_LIMIT_STORE = 'redis';
    const controller = new HealthController({ readyState: 0 } as Connection);
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toMatchObject({
      status: 'not_ready',
      checks: { redis: 'not_configured' },
    });
  });
});
