import { Controller, Get, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Response } from 'express';
import type { Connection } from 'mongoose';

type HealthResponse = {
  status: 'ok';
  service: 'api';
  timestamp: string;
};

type HealthReadinessResponse = {
  status: 'ready' | 'not_ready';
  service: 'api';
  checks: {
    mongo: 'up' | 'down';
  };
  timestamp: string;
};

@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get('health')
  async getHealth(): Promise<HealthResponse> {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/ready')
  async getReadiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthReadinessResponse> {
    const timestamp = new Date().toISOString();
    const mongoUp = await this.isMongoUp();

    if (mongoUp) {
      response.status(200);

      return {
        status: 'ready',
        service: 'api',
        checks: {
          mongo: 'up',
        },
        timestamp,
      };
    }

    response.status(503);

    return {
      status: 'not_ready',
      service: 'api',
      checks: {
        mongo: 'down',
      },
      timestamp,
    };
  }

  private async isMongoUp(): Promise<boolean> {
    if (this.connection.readyState !== 1 || !this.connection.db) {
      return false;
    }

    try {
      await this.connection.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}
