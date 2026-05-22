import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

type RuntimeTimestamped<T> = T & { timestamp: string };

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  getHealth(): RuntimeTimestamped<{ status: 'ok'; service: 'api' }> {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  getReadiness(): RuntimeTimestamped<{
    status: 'ready';
    service: 'api';
    checks: { mongo: 'up' };
  }> {
    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'api',
        checks: { mongo: 'down' },
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ready',
      service: 'api',
      checks: { mongo: 'up' },
      timestamp: new Date().toISOString(),
    };
  }
}
