import 'reflect-metadata';

import { requestRuntimeLoggingMiddleware } from '../../src/common/middleware/request-runtime-logging.middleware';
import { HealthModule } from '../../src/modules/health/health.module';
import { closeTestApp } from './helpers/close-test-app';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

import request from 'supertest';

describe('Runtime Smoke E2E', () => {
  let testApp: TestAppContext;

  beforeAll(async () => {
    testApp = await createTestApp({
      imports: [HealthModule],
      configureApp: (app) => {
        app.use(requestRuntimeLoggingMiddleware);
      },
    });
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('GET /health should return runtime liveness payload', async () => {
    const response = await request(testApp.app.getHttpServer())
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
    const response = await request(testApp.app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-request-id']).not.toHaveLength(0);
  });

  it('GET /health should preserve provided x-request-id', async () => {
    const response = await request(testApp.app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'test-runtime-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('test-runtime-123');
  });

  it('GET /health/ready should return readiness payload', async () => {
    const response = await request(testApp.app.getHttpServer())
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
