import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { disconnect } from 'mongoose';
import request from 'supertest';

import { requestRuntimeLoggingMiddleware } from '../../src/common/middleware/request-runtime-logging.middleware';
import { HealthModule } from '../../src/modules/health/health.module';

describe('Runtime Smoke E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongoUri), HealthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(requestRuntimeLoggingMiddleware);
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
    if (app) {
      await app.close();
    }
    await disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
  });

  it('GET /health should return runtime liveness payload', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: expect.any(String),
    });
  });

  it('GET /health should generate x-request-id when missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).not.toHaveLength(0);
  });

  it('GET /health should preserve provided x-request-id', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'test-runtime-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('test-runtime-123');
  });

  it('GET /health/ready should return readiness payload', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(response.headers['content-type']).toContain('application/json');
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
