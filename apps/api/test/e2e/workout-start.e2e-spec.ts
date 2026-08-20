import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, disconnect, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { createProgressApi } from '../../../../packages/api-client/src/progress-api';
import type { HttpClient } from '../../../../packages/api-client/src/http-client';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { AuthModule } from '../../src/modules/auth/auth.module';

describe('Workout Start E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let mongoConnection: Connection;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoMemoryServer.getUri()),
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
        ProgressModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    mongoConnection = app.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    if (app) await app.close();
    await disconnect();
    if (mongoMemoryServer) await mongoMemoryServer.stop();
  });

  it('starts, persists, re-reads and idempotently reuses the active session', async () => {
    const flow = await createTrainingFlow('workout-start-success');
    const dayIndex = flow.trainingPlan!.weeklySchedule[0].dayIndex;
    const api = createProgressApi(buildSupertestHttpClient(app, flow.token));

    const first = await api.startWorkout({
      trainingPlanId: flow.trainingPlan!.id,
      workoutDayIndex: dayIndex,
    });

    expect(first.workoutSession).toMatchObject({
      userProfileId: flow.userProfileId,
      trainingPlanId: flow.trainingPlan!.id,
      workoutDayIndex: dayIndex,
      date: expect.any(String),
      status: 'active',
      startedAt: expect.any(String),
    });

    const persisted = await mongoConnection
      .db!.collection('workout_sessions')
      .findOne({ _id: expectObjectId(first.workoutSession.id) });
    expect(persisted).toMatchObject({
      userProfileId: flow.userProfileId,
      trainingPlanId: flow.trainingPlan!.id,
      workoutDayIndex: dayIndex,
      status: 'active',
    });

    const second = await api.startWorkout({
      trainingPlanId: flow.trainingPlan!.id,
      workoutDayIndex: dayIndex,
    });
    expect(second.workoutSession.id).toBe(first.workoutSession.id);
    await expect(
      mongoConnection
        .db!.collection('workout_sessions')
        .countDocuments({ trainingPlanId: flow.trainingPlan!.id }),
    ).resolves.toBe(1);
  });

  it('rejects unavailable, incomplete and unauthenticated starts', async () => {
    const flow = await createTrainingFlow('workout-start-errors');

    await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({
        trainingPlanId: flow.trainingPlan!.id,
        workoutDayIndex: 999,
      })
      .expect(400)
      .expect({
        code: 'WORKOUT_NOT_AVAILABLE',
        message: 'Workout is not available.',
      });

    await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({ trainingPlanId: 'invalid', workoutDayIndex: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .send({
        trainingPlanId: flow.trainingPlan!.id,
        workoutDayIndex: 0,
      })
      .expect(401);
  });

  it('returns not found when the user has no profile or plan', async () => {
    const noProfile = await createUser('workout-start-no-profile');
    await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .set('Authorization', `Bearer ${noProfile.token}`)
      .send({ trainingPlanId: '507f1f77bcf86cd799439011', workoutDayIndex: 0 })
      .expect(404)
      .expect({
        code: 'USER_PROFILE_NOT_FOUND',
        message: 'User profile not found.',
      });

    const noPlan = await createTrainingFlow('workout-start-no-plan', false);
    await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .set('Authorization', `Bearer ${noPlan.token}`)
      .send({ trainingPlanId: '507f1f77bcf86cd799439011', workoutDayIndex: 0 })
      .expect(404)
      .expect({
        code: 'TRAINING_PLAN_NOT_FOUND',
        message: 'Training plan not found.',
      });
  });

  async function createTrainingFlow(emailPrefix: string, withPlan = true) {
    const user = await createUser(emailPrefix);
    const userProfile = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Workout Start User' })
      .expect(201);
    const fitness = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${user.token}`)
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

    if (!withPlan) {
      return {
        token: user.token,
        userProfileId: userProfile.body.userProfile.id as string,
      };
    }

    const training = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fitnessProfileId: fitness.body.fitnessProfile.id })
      .expect(201);

    return {
      token: user.token,
      userProfileId: userProfile.body.userProfile.id as string,
      trainingPlan: training.body.trainingPlan as {
        id: string;
        weeklySchedule: Array<{ dayIndex: number }>;
      },
    };
  }

  async function createUser(emailPrefix: string) {
    const email = `${emailPrefix}-${Date.now()}@email.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Workout Start User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'StrongPassword123' })
      .expect(200);
    return { token: login.body.accessToken as string };
  }
});

function buildSupertestHttpClient(
  application: INestApplication,
  token: string,
): HttpClient {
  return {
    async request<TResponse>(input) {
      const result =
        input.method === 'POST'
          ? await request(application.getHttpServer())
              .post(input.path)
              .set('Authorization', `Bearer ${token}`)
              .send(input.body)
          : await request(application.getHttpServer())
              .get(input.path)
              .set('Authorization', `Bearer ${token}`);

      if (result.status >= 400) {
        throw new Error(`Unexpected status ${result.status}`);
      }

      return result.body as TResponse;
    },
  };
}

function expectObjectId(value: string) {
  return new Types.ObjectId(value);
}
