import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, disconnect, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { createProgressApi } from '../../../../packages/api-client/src/progress-api';
import type { HttpClient } from '../../../../packages/api-client/src/http-client';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import {
  CLOCK,
  type Clock,
} from '../../src/modules/progress/domain/services/clock.service';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Workout Completion E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let currentNow = new Date('2026-04-30T10:00:00.000Z');

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const moduleBuilder = Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoMemoryServer.getUri()),
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
        ProgressModule,
      ],
    });
    const clock: Clock = {
      now: () => currentNow,
      todayUtcDateString: () => currentNow.toISOString().slice(0, 10),
    };
    moduleBuilder.overrideProvider(CLOCK).useValue(clock);
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
    mongoConnection = app.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    if (app) await app.close();
    await disconnect();
    if (mongoMemoryServer) await mongoMemoryServer.stop();
  });

  it('completes an active session, persists the transition, and updates history/summary', async () => {
    const flow = await createTrainingFlow('completion-success');
    const started = await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({ trainingPlanId: flow.trainingPlanId, workoutDayIndex: 1 })
      .expect(200);
    expect(started.body.workoutSession.status).toBe('active');

    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({
        trainingPlanId: flow.trainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
      })
      .expect(201);

    const progressApi = createProgressApi(buildHttpClient(app, flow.token));
    const completed = await progressApi.completeWorkout(
      started.body.workoutSession.id,
    );
    expect(completed.workoutSession).toMatchObject({
      id: started.body.workoutSession.id,
      status: 'completed',
      completedAt: expect.any(String),
    });

    const reread = await progressApi.getWorkoutSession(
      started.body.workoutSession.id,
    );
    expect(reread).toEqual(completed);

    const persisted = await mongoConnection
      .collection('workout_sessions')
      .findOne({ _id: new Types.ObjectId(started.body.workoutSession.id) });
    expect(persisted?.status).toBe('completed');

    const history = await request(app.getHttpServer())
      .get('/progress/workout-logs')
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    const summary = await request(app.getHttpServer())
      .get('/progress/summary?period=week')
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    expect(history.body.workoutLogs).toHaveLength(1);
    expect(summary.body.summary.workoutsCompleted).toBe(1);
  });

  it('is idempotent when completing a session twice', async () => {
    const flow = await createTrainingFlow('completion-idempotent');
    const started = await start(flow);
    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({
        trainingPlanId: flow.trainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 30,
        completedExercises: [{ name: 'push_up', setsDone: 1, repsDone: 8 }],
      })
      .expect(201);
    const first = await request(app.getHttpServer())
      .post(`/progress/workout-sessions/${started.id}/complete`)
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    const second = await request(app.getHttpServer())
      .post(`/progress/workout-sessions/${started.id}/complete`)
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    expect(second.body).toEqual(first.body);
    expect(
      await mongoConnection
        .collection('workout_sessions')
        .countDocuments({ status: 'completed' }),
    ).toBeGreaterThanOrEqual(1);
  });

  it('rejects invalid, missing, expired, and cross-user sessions', async () => {
    const owner = await createTrainingFlow('completion-owner');
    const other = await createTrainingFlow('completion-other');
    const started = await start(owner);

    await request(app.getHttpServer())
      .get(`/progress/workout-sessions/${started.id}`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/progress/workout-sessions/${started.id}/complete`)
      .set('Authorization', `Bearer ${other.token}`)
      .expect(404);

    await request(app.getHttpServer())
      .post('/progress/workout-logs')
      .set('Authorization', `Bearer ${other.token}`)
      .send({
        trainingPlanId: owner.trainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 30,
        completedExercises: [{ name: 'push_up', setsDone: 1, repsDone: 8 }],
      })
      .expect(404);

    await request(app.getHttpServer())
      .post('/progress/workout-sessions/not-an-id/complete')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(400);

    currentNow = new Date('2026-05-01T10:00:00.000Z');
    const expired = await request(app.getHttpServer())
      .post(`/progress/workout-sessions/${started.id}/complete`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(404);
    expect(expired.body.code).toBe('WORKOUT_SESSION_EXPIRED');

    const missing = await request(app.getHttpServer())
      .get('/progress/workout-sessions/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(404);
    expect(missing.body.code).toBe('WORKOUT_SESSION_NOT_FOUND');
    currentNow = new Date('2026-04-30T10:00:00.000Z');
  });

  it('rejects completion without authentication or with incomplete payload', async () => {
    await request(app.getHttpServer())
      .post('/progress/workout-sessions/507f1f77bcf86cd799439011/complete')
      .expect(401);
  });

  async function start(flow: TrainingFlow): Promise<{ id: string }> {
    const response = await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({ trainingPlanId: flow.trainingPlanId, workoutDayIndex: 1 })
      .expect(200);
    return { id: response.body.workoutSession.id as string };
  }

  async function createTrainingFlow(prefix: string): Promise<TrainingFlow> {
    const email = `${prefix}@email.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: prefix,
        email,
        password: 'StrongPassword123',
      })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password: 'StrongPassword123',
      })
      .expect(200);
    const token = login.body.accessToken as string;
    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: prefix })
      .expect(201);
    const fitness = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        heightCm: 180,
        weightKg: 82,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: { daysPerWeek: 4, minutesPerSession: 60 },
      })
      .expect(201);
    const plan = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ fitnessProfileId: fitness.body.fitnessProfile.id })
      .expect(201);
    return { token, trainingPlanId: plan.body.trainingPlan.id as string };
  }
});

type TrainingFlow = { token: string; trainingPlanId: string };

function buildHttpClient(
  application: INestApplication,
  token: string,
): HttpClient {
  return {
    request: async <T>(options: {
      method?: string;
      path: string;
      body?: unknown;
    }) => {
      let requestBuilder = (
        options.method === 'POST'
          ? request(application.getHttpServer()).post(options.path)
          : request(application.getHttpServer()).get(options.path)
      ).set('Authorization', `Bearer ${token}`);
      if (options.body !== undefined)
        requestBuilder = requestBuilder.send(options.body);
      const response = await requestBuilder;
      if (response.status >= 400)
        throw new Error(response.body?.message ?? 'Request failed');
      return response.body as T;
    },
  };
}
