import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { closeTestApp } from './helpers/close-test-app';
import { createAuthSession } from './helpers/create-auth-session';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

describe('Auth Me E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;

  beforeAll(async () => {
    testApp = await createTestApp({
      imports: [AuthModule],
    });
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('login -> use token -> GET /auth/me success', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'auth-me@email.com',
    });

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        email: 'auth-me@email.com',
      },
    });
  });

  it('GET /auth/me without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  it('GET /auth/me with invalid token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });
});
