import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { closeTestApp } from './helpers/close-test-app';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

describe('Auth Register E2E', () => {
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

  it('registers user successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: '  Rodrigo Paiva  ',
        email: ' Rodrigo@Email.COM ',
        password: 'StrongPassword123',
      })
      .expect(201);

    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        email: 'rodrigo@email.com',
        name: 'Rodrigo Paiva',
        isEmailVerified: false,
        createdAt: expect.any(String),
      },
    });
  });

  it('returns duplicate email on second registration', async () => {
    const payload = {
      name: 'Rodrigo Paiva',
      email: 'duplicate@email.com',
      password: 'StrongPassword123',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(409);

    expect(response.body).toEqual({
      code: 'AUTH_EMAIL_ALREADY_EXISTS',
      message: 'Email already exists.',
    });
  });
});
