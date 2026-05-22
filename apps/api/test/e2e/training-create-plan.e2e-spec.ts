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

describe('Training Create Plan E2E', () => {
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
      email: 'training-success@email.com',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
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

    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    expect(response.body).toEqual({
      trainingPlan: {
        id: expect.any(String),
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklySchedule: expect.any(Array),
        status: 'active',
        createdAt: expect.any(String),
      },
    });
  });

  it('duplicated plan returns 409', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'training-duplicate@email.com',
    });

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(201);

    const fitnessResponse = await request(app.getHttpServer())
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

    await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(409);

    expect(response.body).toEqual({
      code: 'TRAINING_PLAN_ALREADY_EXISTS',
      message: 'Training plan already exists.',
    });
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .send({
        fitnessProfileId: 'fitness_123',
      })
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  it('invalid ownership returns FITNESS_PROFILE_NOT_FOUND', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Owner User',
        email: 'training-owner@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'training-owner@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${ownerLogin.body.accessToken}`)
      .send({
        name: 'Owner User',
      })
      .expect(201);

    const ownerFitness = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${ownerLogin.body.accessToken}`)
      .send({
        heightCm: 175,
        weightKg: 75,
        goal: 'maintain',
        activityLevel: 'low',
        trainingAvailability: {
          daysPerWeek: 2,
          minutesPerSession: 45,
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Other User',
        email: 'training-other@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'training-other@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
      .send({
        name: 'Other User',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
      .send({
        fitnessProfileId: ownerFitness.body.fitnessProfile.id,
      })
      .expect(404);

    expect(response.body).toEqual({
      code: 'FITNESS_PROFILE_NOT_FOUND',
      message: 'Fitness profile not found.',
    });
  });
});
