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
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Progress Daily Check-in E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

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

  it('submits idempotently, recalculates recovery and exposes today state', async () => {
    const token = await registerAndGetToken('daily-check-in-e2e@email.com');

    const payload = {
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    };

    const first = await request(app.getHttpServer())
      .post('/progress/daily-check-in')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/progress/daily-check-in')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, energyLevel: 5 })
      .expect(201);

    expect(second.body.dailyCheckIn.id).toBe(first.body.dailyCheckIn.id);
    expect(second.body.dailyCheckIn.energyLevel).toBe(5);
    expect(second.body.dailyCheckIn.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const today = await request(app.getHttpServer())
      .get('/progress/daily-check-in/today')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(today.body).toEqual({
      completedToday: true,
      dailyCheckIn: expect.objectContaining({
        id: first.body.dailyCheckIn.id,
        energyLevel: 5,
        localDate: second.body.dailyCheckIn.localDate,
        timezone: 'UTC',
      }),
    });

    const history = await request(app.getHttpServer())
      .get('/progress/daily-check-ins')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(history.body.dailyCheckIns).toHaveLength(1);

    const recovery = await request(app.getHttpServer())
      .get('/recovery/experience/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(recovery.body).toEqual({
      availability: 'available',
      recovery: expect.objectContaining({
        category: expect.any(String),
        freshness: 'current',
        breakdown: expect.arrayContaining([
          expect.objectContaining({ key: 'energy' }),
          expect.objectContaining({ key: 'sleep' }),
          expect.objectContaining({ key: 'muscle_soreness' }),
        ]),
      }),
    });
    expect(recovery.body.recovery).not.toHaveProperty('sourceContext');
    expect(recovery.body).not.toHaveProperty('userProfileId');

    const recoveryHistory = await request(app.getHttpServer())
      .get('/recovery/experience/history?days=7')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(recoveryHistory.body.range).toEqual({ days: 7 });
    expect(recoveryHistory.body.items).toHaveLength(1);
    expect(recoveryHistory.body.trend.direction).toBe('insufficient_data');
  });

  it('returns explicit insufficient data without exposing internal fields', async () => {
    const token = await registerAndGetToken('recovery-no-check-in-e2e@email.com');

    const response = await request(app.getHttpServer())
      .get('/recovery/experience/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      availability: 'insufficient_data',
      recovery: null,
    });
    expect(response.body).not.toHaveProperty('userProfileId');
    expect(response.body).not.toHaveProperty('sourceContext');
  });

  async function registerAndGetToken(email: string): Promise<string> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Daily Check-in User',
        email,
        password: 'StrongPassword123',
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'StrongPassword123' })
      .expect(200);

    const token = login.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Daily Check-in User' })
      .expect(201);

    return token;
  }
});
