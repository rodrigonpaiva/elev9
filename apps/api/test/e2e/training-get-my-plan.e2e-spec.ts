import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { closeTestApp } from './helpers/close-test-app';
import { createAuthSession } from './helpers/create-auth-session';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

describe('Training Get My Plan E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;

  beforeAll(async () => {
    testApp = await createTestApp({
      imports: [AuthModule, UsersModule, FitnessModule, TrainingModule],
    });
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('full flow success', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'training-current-success@email.com',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Rodrigo Paiva' })
      .expect(201);

    const fitnessResponse = await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/training/plans/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.trainingPlan).toEqual({
      id: expect.any(String),
      fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      status: 'active',
      goal: 'gain_muscle',
      activityLevel: 'medium',
      weeklySchedule: expect.any(Array),
      createdAt: expect.any(String),
    });
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/training/plans/current')
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  it('without fitness profile returns 404', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'training-current-no-fitness@email.com',
      name: 'No Fitness User',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Fitness User' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/training/plans/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toEqual({
      code: 'FITNESS_PROFILE_NOT_FOUND',
      message: 'Fitness profile not found.',
    });
  });

  it('without training plan returns 404', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'training-current-no-plan@email.com',
      name: 'No Training User',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Training User' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        heightCm: 180,
        weightKg: 82.5,
        goal: 'maintain',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 3,
          minutesPerSession: 60,
        },
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/training/plans/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(response.body).toEqual({
      code: 'TRAINING_PLAN_NOT_FOUND',
      message: 'Training plan not found.',
    });
  });
});
