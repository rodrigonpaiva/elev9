import type { Response } from 'express';
import type { Connection } from 'mongoose';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  const createConnection = (readyState: number, pingResolved = true) => {
    const ping = pingResolved
      ? jest.fn().mockResolvedValue(undefined)
      : jest.fn().mockRejectedValue(new Error('mongo down'));

    return {
      readyState,
      db: {
        admin: jest.fn(() => ({
          ping,
        })),
      },
    } as unknown as Connection;
  };

  it('returns a liveness response', async () => {
    const controller = new HealthController(createConnection(1));

    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'api',
      timestamp: expect.any(String),
    });
  });

  it('returns a ready response when mongo is up', async () => {
    const connection = createConnection(1);
    const controller = new HealthController(connection);
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toEqual({
      status: 'ready',
      service: 'api',
      checks: {
        mongo: 'up',
      },
      timestamp: expect.any(String),
    });

    expect(connection.db?.admin).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('returns a not ready response when mongo is down', async () => {
    const connection = createConnection(0);
    const controller = new HealthController(connection);
    const response = {
      status: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toEqual({
      status: 'not_ready',
      service: 'api',
      checks: {
        mongo: 'down',
      },
      timestamp: expect.any(String),
    });

    expect(response.status).toHaveBeenCalledWith(503);
  });
});
