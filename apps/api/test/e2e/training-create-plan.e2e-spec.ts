import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Training Create Plan E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServer.getUri();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        AuthModule,
        UsersModule,
        FitnessModule,
        TrainingModule,
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

  it('full flow success', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Rodrigo Paiva',
        email: 'training-success@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'training-success@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
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

    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    expect(response.body).toEqual({
      trainingPlan: {
        id: expect.any(String),
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklySchedule: expect.any(Array),
        status: 'active',
        createdAt: expect.any(String),
      },
    });
  });

  it('duplicated plan returns 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Rodrigo Paiva',
        email: 'training-duplicate@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'training-duplicate@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    const token = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(201);

    const fitnessResponse = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        heightCm: 180,
        weightKg: 82.5,
        goal: 'maintain',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 3,
          minutesPerSession: 60,
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessProfileId: fitnessResponse.body.fitnessProfile.id,
      })
      .expect(409);

    expect(response.body).toEqual({
      code: 'TRAINING_PLAN_ALREADY_EXISTS',
      message: 'Training plan already exists.',
    });
  });

  it('without token returns 401', async () => {
    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .send({
        fitnessProfileId: 'fitness_123',
      })
      .expect(401);

    expect(response.body).toEqual({
      code: 'AUTH_INVALID_SESSION',
      message: 'Invalid session.',
    });
  });

  it('invalid ownership returns FITNESS_PROFILE_NOT_FOUND', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Owner User',
        email: 'training-owner@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'training-owner@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${ownerLogin.body.accessToken}`)
      .send({
        name: 'Owner User',
      })
      .expect(201);

    const ownerFitness = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${ownerLogin.body.accessToken}`)
      .send({
        heightCm: 175,
        weightKg: 75,
        goal: 'maintain',
        activityLevel: 'low',
        trainingAvailability: {
          daysPerWeek: 2,
          minutesPerSession: 45,
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Other User',
        email: 'training-other@email.com',
        password: 'StrongPassword123',
      })
      .expect(201);

    const otherLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'training-other@email.com',
        password: 'StrongPassword123',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
      .send({
        name: 'Other User',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
      .send({
        fitnessProfileId: ownerFitness.body.fitnessProfile.id,
      })
      .expect(404);

    expect(response.body).toEqual({
      code: 'FITNESS_PROFILE_NOT_FOUND',
      message: 'Fitness profile not found.',
    });
  });
});
