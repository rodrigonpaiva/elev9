import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { closeTestApp } from './helpers/close-test-app';
import { createAuthSession } from './helpers/create-auth-session';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

describe('Users Create Profile E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;

  beforeAll(async () => {
    testApp = await createTestApp({
      imports: [AuthModule, UsersModule],
    });
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('register + login + create profile success', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'profile-success@email.com',
    });

    const response = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '  Rodrigo Paiva  ',
        birthDate: '1994-06-15',
        gender: 'male',
      })
      .expect(201);

    expect(response.body).toEqual({
      userProfile: {
        id: expect.any(String),
        authUserId: expect.any(String),
        name: 'Rodrigo Paiva',
        birthDate: '1994-06-15T00:00:00.000Z',
        gender: 'male',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: expect.any(String),
      },
    });
  });

  it('creating profile twice returns 409', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'profile-duplicate@email.com',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(409);

    expect(response.body).toEqual({
      code: 'USER_PROFILE_ALREADY_EXISTS',
      message: 'User profile already exists.',
    });
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/users/profile')
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });
});
