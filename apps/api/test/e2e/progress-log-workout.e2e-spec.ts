import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import {
  Clock,
  CLOCK,
} from '../../src/modules/progress/domain/services/clock.service';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { closeTestApp } from './helpers/close-test-app';
import { createAuthSession } from './helpers/create-auth-session';
import { createTestApp, TestAppContext } from './helpers/create-test-app';

type AuthenticatedUserFlow = {
  token: string;
  trainingPlanId: string;
};

describe('Progress Log Workout E2E', () => {
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

  it('full flow success', async () => {
    const { token, trainingPlanId } = await createAuthenticatedTrainingFlow(
      'progress-log-success@email.com',
    );

    const response = await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
        feedback: {
          difficulty: 'medium',
          notes: 'Good session',
        },
      })
      .expect(201);

    expect(response.body).toEqual({
      workoutLog: {
        id: expect.any(String),
        trainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
        feedback: {
          difficulty: 'medium',
          notes: 'Good session',
        },
        date: expect.any(String),
        createdAt: expect.any(String),
      },
    });
  });

  it('same day duplicate returns 409', async () => {
    currentNow = new Date('2026-04-30T10:00:00.000Z');

    const { token, trainingPlanId } = await createAuthenticatedTrainingFlow(
      'progress-log-duplicate@email.com',
    );

    const payload = {
      trainingPlanId,
      workoutDayIndex: 1,
      durationMinutes: 45,
      completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
    };

    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(409);

    expect(response.body).toEqual({
      code: 'WORKOUT_LOG_ALREADY_EXISTS',
      message: 'Workout log already exists.',
    });
  });

  it('same workout on different days is allowed', async () => {
    const { token, trainingPlanId } = await createAuthenticatedTrainingFlow(
      'progress-log-different-days@email.com',
    );

    const payload = {
      trainingPlanId,
      workoutDayIndex: 1,
      durationMinutes: 45,
      completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
    };

    currentNow = new Date('2026-04-30T23:59:59.000Z');

    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    currentNow = new Date('2026-05-01T00:00:01.000Z');

    const response = await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(response.body.workoutLog.date).toBe('2026-05-01');
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .send({
        trainingPlanId: '507f1f77bcf86cd799439011',
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
      })
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  async function createAuthenticatedTrainingFlow(
    email: string,
  ): Promise<AuthenticatedUserFlow> {
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

    return {
      token,
      trainingPlanId: trainingResponse.body.trainingPlan.id as string,
    };
  }
});
