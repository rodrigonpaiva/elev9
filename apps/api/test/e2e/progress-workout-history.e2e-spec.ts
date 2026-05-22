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

describe('Progress Workout History E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;
  let currentNow: Date;

  beforeAll(async () => {
    currentNow = new Date('2026-05-01T10:00:00.000Z');

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

  it('returns workout history successfully', async () => {
    const { token, trainingPlanId } = await createAuthenticatedTrainingFlow(
      'progress-history-success@email.com',
    );

    currentNow = new Date('2026-04-30T10:00:00.000Z');
    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 40,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
      })
      .expect(201);

    currentNow = new Date('2026-05-01T10:00:00.000Z');
    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        trainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 50,
        completedExercises: [{ name: 'push_up', setsDone: 5, repsDone: 10 }],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/progress/workout-logs')
      .query({ limit: 20 })
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.workoutLogs).toHaveLength(2);
    expect(response.body.workoutLogs[0].date).toBe('2026-05-01');
    expect(response.body.workoutLogs[1].date).toBe('2026-04-30');
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/progress/workout-logs')
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  it('invalid limit returns 400', async () => {
    const { token } = await createAuthSession({
      app,
      email: 'progress-history-invalid-limit@email.com',
      name: 'History Invalid Limit',
    });

    await request(app.getHttpServer())
      .get('/progress/workout-logs')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  async function createAuthenticatedTrainingFlow(email: string): Promise<{
    token: string;
    trainingPlanId: string;
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

    return {
      token,
      trainingPlanId: trainingResponse.body.trainingPlan.id as string,
    };
  }
});
