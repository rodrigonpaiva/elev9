import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import {
  Clock,
  CLOCK,
} from '../../src/modules/progress/domain/services/clock.service';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { closeTestApp } from './helpers/close-test-app';
import { createAuthSession } from './helpers/create-auth-session';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

describe('Progress Summary E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;
  let currentNow: Date;

  beforeAll(async () => {
    currentNow = new Date('2026-04-30T10:00:00.000Z');

    const testClock: Clock = {
      now: () => currentNow,
      todayUtcDateString: () => currentNow.toISOString().slice(0, 10),
    };

    testApp = await createTestApp({
      imports: [
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
        ProgressModule,
      ],
      configureTestingModule: (moduleBuilder) => {
        moduleBuilder.overrideProvider(CLOCK).useValue(testClock);
      },
    });
    app = testApp.app;
  });

  afterAll(async () => {
    await closeTestApp(testApp);
  });

  it('full flow', async () => {
    const { token } = await createAuthenticatedTrainingFlow(
      'progress-summary-success@email.com',
    );

    const response = await request(app.getHttpServer())
      .get('/progress/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      summary: {
        period: 'week',
        workoutsCompleted: expect.any(Number),
        totalDurationMinutes: expect.any(Number),
        averageDurationMinutes: expect.any(Number),
        lastWorkoutDate: expect.any(String),
        currentStreak: 1,
      },
    });
  });

  it('week vs month', async () => {
    const { token } = await createAuthenticatedTrainingFlow(
      'progress-summary-period@email.com',
    );

    const weekResponse = await request(app.getHttpServer())
      .get('/progress/summary')
      .query({ period: 'week' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const monthResponse = await request(app.getHttpServer())
      .get('/progress/summary')
      .query({ period: 'month' })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(weekResponse.body.summary.period).toBe('week');
    expect(monthResponse.body.summary.period).toBe('month');
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/progress/summary')
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  it('invalid query returns 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Invalid Query User',
        email: 'progress-summary-invalid-query@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'progress-summary-invalid-query@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/progress/summary')
      .query({ period: 'year' })
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(400);

    expect(response.body.message).toBeDefined();
  });

  async function createAuthenticatedTrainingFlow(email: string): Promise<{
    token: string;
  }> {
    const { token } = await createAuthSession({ app, email });

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

    const trainingResponse = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trainingPlanId: trainingResponse.body.trainingPlan.id,
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
      })
      .expect(201);

    return { token };
  }
});
