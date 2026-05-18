import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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

describe('Progress Workout History E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let currentNow: Date;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();
    currentNow = new Date('2026-05-01T10:00:00.000Z');

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
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'History Invalid Limit',
        email: 'progress-history-invalid-limit@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'progress-history-invalid-limit@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .get('/progress/workout-logs')
      .query({ limit: 100 })
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(400);
  });

  async function createAuthenticatedTrainingFlow(email: string): Promise<{
    token: string;
    trainingPlanId: string;
  }> {
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
