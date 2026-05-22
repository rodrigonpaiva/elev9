import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { closeTestApp } from './helpers/close-test-app';
import { createAuthSession } from './helpers/create-auth-session';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

describe('Fitness Get My Profile E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;

  beforeAll(async () => {
    testApp = await createTestApp({
      imports: [AuthModule, UsersModule, FitnessModule],
    });
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('returns the active fitness profile successfully', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'fitness-get-success@email.com',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      fitnessProfile: {
        id: expect.any(String),
        userProfileId: expect.any(String),
        heightCm: 180,
        weightKg: 82.5,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: expect.any(String),
      },
    });
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/fitness/profile')
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  it('without user profile returns USER_PROFILE_NOT_FOUND', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'fitness-get-no-user-profile@email.com',
    });

    const response = await request(app.getHttpServer())
      .get('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toEqual({
      code: 'USER_PROFILE_NOT_FOUND',
      message: 'User profile not found.',
    });
  });

  it('without fitness profile returns FITNESS_PROFILE_NOT_FOUND', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'fitness-get-no-fitness-profile@email.com',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toEqual({
      code: 'FITNESS_PROFILE_NOT_FOUND',
      message: 'Fitness profile not found.',
    });
  });

  it('rejects query params with ids', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'fitness-get-query-reject@email.com',
    });

    const response = await request(app.getHttpServer())
      .get('/fitness/profile')
      .query({
        fitnessProfileId: 'fitness_123',
      })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(response.body.message).toBeDefined();
  });
});
