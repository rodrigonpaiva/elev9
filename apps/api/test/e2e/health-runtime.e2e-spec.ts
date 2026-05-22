import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { disconnect } from 'mongoose';
import request from 'supertest';

import { requestCorrelationMiddleware } from '../../src/common/middleware/request-correlation.middleware';
import { requestLoggingMiddleware } from '../../src/common/middleware/request-logging.middleware';
import { HealthModule } from '../../src/modules/health/health.module';

describe('Health Runtime E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), HealthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(requestCorrelationMiddleware);
    app.use(requestLoggingMiddleware);
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await disconnect();
    await mongoMemoryServer.stop();
  });

  it('returns x-request-id and logs the health request', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'health-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('health-123');
    expect(response.body).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: expect.any(String),
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\[Request\] requestId=health-123 method=GET path=\/health status=200 durationMs=\d+$/,
      ),
    );

    logSpy.mockRestore();
  });

  it('returns x-request-id and logs the readiness request', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .set('x-request-id', 'ready-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('ready-123');
    expect(response.body).toEqual({
      status: 'ready',
      service: 'api',
      checks: {
        mongo: 'up',
      },
      timestamp: expect.any(String),
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^\[Request\] requestId=ready-123 method=GET path=\/health\/ready status=200 durationMs=\d+$/,
      ),
    );

    logSpy.mockRestore();
  });
});
