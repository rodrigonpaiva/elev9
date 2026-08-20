import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import { disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Auth and onboarding E2E', () => {
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
    if (app) await app.close();
    await disconnect();
    if (mongoMemoryServer) await mongoMemoryServer.stop();
  });

  it('registers, logs in, persists the session and completes onboarding', async () => {
    const credentials = {
      name: 'Auth Onboarding User',
      email: 'auth-onboarding-complete@email.com',
      password: 'StrongPassword123',
    };

    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    expect(registered.body.user).toMatchObject({
      email: credentials.email,
      name: credentials.name,
      isEmailVerified: false,
    });

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    const token = login.body.accessToken as string;
    expect(login.body.user).toMatchObject({
      id: registered.body.user.id,
      email: credentials.email,
    });

    const session = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(session.body).toEqual({
      user: { id: registered.body.user.id, email: credentials.email },
    });

    const profile = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: credentials.name,
        birthDate: '1994-06-15',
        gender: 'prefer_not_to_say',
      })
      .expect(201);

    const fitness = await request(app.getHttpServer())
      .post('/fitness/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        heightCm: 178,
        weightKg: 78,
        goal: 'gain_muscle',
        activityLevel: 'high',
        trainingAvailability: { daysPerWeek: 4, minutesPerSession: 45 },
      })
      .expect(201);

    const plan = await request(app.getHttpServer())
      .post('/training/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ fitnessProfileId: fitness.body.fitnessProfile.id })
      .expect(201);

    const currentPlan = await request(app.getHttpServer())
      .get('/training/plans/current')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profile.body.userProfile).toMatchObject({
      id: expect.any(String),
      authUserId: registered.body.user.id,
      status: 'active',
    });
    expect(plan.body.trainingPlan).toMatchObject({
      id: expect.any(String),
      fitnessProfileId: fitness.body.fitnessProfile.id,
      status: 'active',
    });
    expect(currentPlan.body).toEqual(plan.body);
  });

  it('keeps onboarding incomplete states explicit and rejects invalid data', async () => {
    const user = await createUser(app, 'auth-onboarding-incomplete');

    const noProfile = await request(app.getHttpServer())
      .get('/fitness/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404);
    expect(noProfile.body.code).toBe('USER_PROFILE_NOT_FOUND');

    const invalidProfile = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'x', gender: 'invalid' })
      .expect(400);
    expect(invalidProfile.body.message).toBeDefined();

    const profile = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ name: 'Incomplete User' })
      .expect(201);

    const noPlan = await request(app.getHttpServer())
      .get('/training/plans/current')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404);
    expect(noPlan.body.code).toBe('FITNESS_PROFILE_NOT_FOUND');
    expect(profile.body.userProfile.authUserId).toBe(user.id);
  });

  it('rejects duplicate registration and invalid credentials', async () => {
    const credentials = {
      name: 'Duplicate Auth User',
      email: 'auth-duplicate@email.com',
      password: 'StrongPassword123',
    };

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(409);
    expect(duplicate.body.code).toBe('AUTH_EMAIL_ALREADY_EXISTS');

    const invalidPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword123' })
      .expect(401);
    expect(invalidPassword.body.code).toBe('AUTH_INVALID_CREDENTIALS');

    const invalidPayload = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
    expect(invalidPayload.body.message).toBeDefined();
  });

  it('rejects absent and expired sessions, and unauthorised profile access', async () => {
    const owner = await createUser(app, 'auth-owner');
    const otherUser = await createUser(app, 'auth-other');

    const absent = await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
    expect(absent.body.code).toBe('AUTH_INVALID_SESSION');

    const expiredToken = sign(
      { sub: owner.id, email: owner.email },
      process.env.JWT_SECRET ?? 'dev-secret',
      { expiresIn: -1 },
    );
    const expired = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
    expect(expired.body.code).toBe('AUTH_INVALID_SESSION');

    const ownerProfile = await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Owner Profile' })
      .expect(201);

    const otherProfile = await request(app.getHttpServer())
      .get('/fitness/profile')
      .set('Authorization', `Bearer ${otherUser.token}`)
      .expect(404);
    expect(otherProfile.body.code).toBe('USER_PROFILE_NOT_FOUND');
    expect(ownerProfile.body.userProfile.authUserId).toBe(owner.id);

    const noAuthProfile = await request(app.getHttpServer())
      .post('/users/profile')
      .send({ name: 'No Auth Profile' })
      .expect(401);
    expect(noAuthProfile.body.code).toBe('AUTH_INVALID_SESSION');
  });
});

async function createUser(
  app: INestApplication,
  prefix: string,
): Promise<{
  id: string;
  email: string;
  token: string;
}> {
  const email = `${prefix}@email.com`;
  const password = 'StrongPassword123';

  const registration = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ name: prefix, email, password })
    .expect(201);
  const login = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    id: registration.body.user.id as string,
    email,
    token: login.body.accessToken as string,
  };
}
