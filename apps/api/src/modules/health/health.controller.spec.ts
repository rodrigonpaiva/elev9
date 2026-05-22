import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok for liveness checks', () => {
    const controller = new HealthController({ readyState: 1 } as Connection);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: expect.any(String),
    });
  });

  it('returns ready when MongoDB is connected', () => {
    const controller = new HealthController({ readyState: 1 } as Connection);

    expect(controller.getReadiness()).toEqual({
      status: 'ready',
      service: 'api',
      checks: { mongo: 'up' },
      timestamp: expect.any(String),
    });
  });

  it('throws when MongoDB is not connected', () => {
    const controller = new HealthController({ readyState: 0 } as Connection);

    expect(() => controller.getReadiness()).toThrow(
      ServiceUnavailableException,
    );
  });
});
