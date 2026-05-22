import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { disconnect } from 'mongoose';
import request from 'supertest';

import { requestCorrelationMiddleware } from '../../src/common/middleware/request-correlation.middleware';
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

  it('returns a generated x-request-id when the header is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.body).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: expect.any(String),
    });
  });

  it('preserves an incoming x-request-id header', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'test-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('test-123');
  });

  it('returns x-request-id on readiness responses', async () => {
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
  });
});
