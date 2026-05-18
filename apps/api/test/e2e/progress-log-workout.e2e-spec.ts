import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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

type AuthenticatedUserFlow = {
  token: string;
  trainingPlanId: string;
};

describe('Progress Log Workout E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let currentNow: Date;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();
    currentNow = new Date('2026-04-30T10:00:00.000Z');

    const testClock: Clock = {
      now: () => currentNow,
      todayUtcDateString: () => currentNow.toISOString().slice(0, 10),
    };

    const moduleBuilder = Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
        ProgressModule,
      ],
    });

    moduleBuilder.overrideProvider(CLOCK).useValue(testClock);

    const moduleRef: TestingModule = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
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
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Rodrigo Paiva',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'StrongPassword123',
      })
      .expect(200);

    const token = loginResponse.body.accessToken as string;

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
