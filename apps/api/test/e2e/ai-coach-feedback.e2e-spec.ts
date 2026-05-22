import 'reflect-metadata';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AiModule } from '../../src/modules/ai/ai.module';
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

describe('AI Coach Feedback E2E', () => {
  let app: INestApplication;
  let testApp: TestAppContext;
  let currentNow: Date;

  beforeAll(async () => {
    currentNow = new Date('2026-05-04T10:00:00.000Z');

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
        AiModule,
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

  it('returns coach feedback for an authenticated user', async () => {
    const { token } = await createAuthenticatedTrainingFlow(
      'ai-coach-success@email.com',
    );

    const response = await request(app.getHttpServer())
      .post('/ai/coach-feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(response.body).toEqual({
      message: expect.any(String),
      insights: expect.any(Array),
      recommendations: expect.any(Array),
    });
  });

  it('rejects extra body fields with AI_COACH_INVALID_INPUT', async () => {
    const { token } = await createAuthenticatedTrainingFlow(
      'ai-coach-invalid-input@email.com',
    );

    const response = await request(app.getHttpServer())
      .post('/ai/coach-feedback')
      .set('Authorization', `Bearer ${token}`)
      .send({ authUserId: 'forbidden' })
      .expect(400);

    expect(response.body).toEqual({
      code: 'AI_COACH_INVALID_INPUT',
      message: 'Invalid input.',
    });
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
          daysPerWeek: 3,
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
