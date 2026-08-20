import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import { RecoveryModule } from '../../src/modules/recovery/recovery.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Recovery E2E', () => {
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
        RecoveryModule,
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

  it('builds deterministic Recovery from check-in and reflects a completed workout', async () => {
    const flow = await createTrainingFlow('recovery-complete');

    await request(app.getHttpServer())
      .post('/progress/daily-check-in')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
      })
      .expect(201);

    const first = await request(app.getHttpServer())
      .get('/recovery/experience/current')
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    expect(first.body).toEqual({
      availability: 'available',
      recovery: expect.objectContaining({
        score: expect.any(Number),
        fatigueScore: expect.any(Number),
        freshness: 'current',
        trend: expect.any(String),
        breakdown: expect.arrayContaining([
          expect.objectContaining({ key: 'energy' }),
          expect.objectContaining({ key: 'sleep' }),
          expect.objectContaining({ key: 'muscle_soreness' }),
        ]),
      }),
    });

    const beforeWorkout = await request(app.getHttpServer())
      .get('/recovery/current')
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    expect(
      beforeWorkout.body.recoverySnapshot.sourceContext.recentWorkoutLogsCount,
    ).toBe(0);

    const started = await request(app.getHttpServer())
      .post('/progress/workout-sessions/start')
      .set('Authorization', `Bearer ${flow.token}`)
      .send({ trainingPlanId: flow.trainingPlanId, workoutDayIndex: 1 })
      .expect(200);
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
    await request(app.getHttpServer())
      .post(
        `/progress/workout-sessions/${started.body.workoutSession.id}/complete`,
      )
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);

    const afterWorkout = await request(app.getHttpServer())
      .get('/recovery/current')
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    expect(
      afterWorkout.body.recoverySnapshot.sourceContext.recentWorkoutLogsCount,
    ).toBe(1);

    const history = await request(app.getHttpServer())
      .get('/recovery/experience/history?days=7')
      .set('Authorization', `Bearer ${flow.token}`)
      .expect(200);
    expect(history.body.items).toHaveLength(1);
    expect(history.body.items[0]).toMatchObject({ freshness: 'current' });

    const persisted = await mongoConnection
      .collection('recovery_snapshots')
      .findOne({
        userProfileId: flow.userProfileId,
      });
    expect(persisted?.sourceContext?.recentWorkoutLogsCount).toBe(1);
  });

  it('returns explicit insufficient data and rejects incomplete access', async () => {
    const noProfile = await createUser('recovery-no-profile');
    await request(app.getHttpServer())
      .get('/recovery/experience/current')
      .set('Authorization', `Bearer ${noProfile.token}`)
      .expect(404);

    const noData = await createUserWithProfile('recovery-no-data');
    const response = await request(app.getHttpServer())
      .get('/recovery/experience/current')
      .set('Authorization', `Bearer ${noData.token}`)
      .expect(200);
    expect(response.body).toEqual({
      availability: 'insufficient_data',
      recovery: null,
    });

    await request(app.getHttpServer())
      .get('/recovery/experience/history?days=0')
      .set('Authorization', `Bearer ${noData.token}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/recovery/experience/current')
      .expect(401);
    await request(app.getHttpServer())
      .get('/recovery/experience/current')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  async function createTrainingFlow(prefix: string) {
    const user = await createUserWithProfile(prefix);
    const fitness = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${user.token}`)
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
      .set('Authorization', `Bearer ${user.token}`)
      .send({ fitnessProfileId: fitness.body.fitnessProfile.id })
      .expect(201);
    return {
      ...user,
      trainingPlanId: plan.body.trainingPlan.id as string,
    };
  }

  async function createUserWithProfile(prefix: string) {
    const user = await createUser(prefix);
    const profile = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: prefix })
      .expect(201);
    return { ...user, userProfileId: profile.body.userProfile.id as string };
  }

  async function createUser(prefix: string) {
    const email = `${prefix}@email.com`;
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: prefix, email, password: 'StrongPassword123' })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'StrongPassword123' })
      .expect(200);
    return {
      token: login.body.accessToken as string,
      authUserId: registered.body.user.id as string,
    };
  }
});
