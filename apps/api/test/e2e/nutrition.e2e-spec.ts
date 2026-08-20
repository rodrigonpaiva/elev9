import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, disconnect, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { createNutritionApi } from '../../../../packages/api-client/src/nutrition-api';
import type { HttpClient } from '../../../../packages/api-client/src/http-client';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { NutritionModule } from '../../src/modules/nutrition/nutrition.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Nutrition E2E', () => {
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
        NutritionModule,
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

  it('completes the nutrition journey and persists profile, plan, log and recommendation', async () => {
    const user = await createUser(app, 'nutrition-journey');
    const profile = await createUserProfile(app, user.token, user.name);
    const fitness = await createFitnessProfile(app, user.token);

    const nutritionProfileResponse = await request(app.getHttpServer())
      .post('/nutrition/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: ['vegetarian'],
        allergies: ['peanut'],
        dislikedFoods: ['mushroom'],
        preferredFoods: ['oats'],
      })
      .expect(201);

    expect(nutritionProfileResponse.body.nutritionProfile).toMatchObject({
      userProfileId: profile.id,
      goal: 'muscle_gain',
      mealsPerDay: 4,
      dietaryRestrictions: ['vegetarian'],
      allergies: ['peanut'],
      status: 'active',
    });

    const nutritionApi = createNutritionApi(
      buildSupertestHttpClient(app, user.token),
    );

    await expect(nutritionApi.getNutritionProfile()).resolves.toEqual(
      nutritionProfileResponse.body,
    );

    const macros = await request(app.getHttpServer())
      .post('/nutrition/macro-targets/calculate')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(macros.body.macroTargets).toMatchObject({
      calories: expect.any(Number),
      proteinGrams: expect.any(Number),
      carbsGrams: expect.any(Number),
      fatGrams: expect.any(Number),
      formulaVersion: expect.any(String),
    });

    const plan = await request(app.getHttpServer())
      .post('/nutrition/plans')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);
    expect(plan.body.nutritionPlan).toMatchObject({
      userProfileId: profile.id,
      nutritionProfileId: nutritionProfileResponse.body.nutritionProfile.id,
      fitnessProfileId: fitness.id,
      status: 'active',
      generatedBy: 'deterministic',
    });

    const currentPlan = await request(app.getHttpServer())
      .get('/nutrition/plans/current')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(currentPlan.body.nutritionPlan.id).toBe(plan.body.nutritionPlan.id);

    const today = await nutritionApi.getTodayNutrition();
    expect(today.todayNutrition).toMatchObject({
      availability: 'available',
      timezone: 'UTC',
      meals: expect.any(Array),
    });
    const meal = today.todayNutrition.meals[0];
    expect(meal).toBeDefined();

    const logged = await request(app.getHttpServer())
      .post('/nutrition/logs')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        mealId: meal.id,
        date: today.todayNutrition.date,
        status: 'consumed',
        actualMacros: {
          calories: 520,
          proteinGrams: 32,
          carbsGrams: 58,
          fatGrams: 18,
        },
      })
      .expect(201);
    expect(logged.body.nutritionLog).toMatchObject({
      userProfileId: profile.id,
      nutritionPlanId: plan.body.nutritionPlan.id,
      mealId: meal.id,
      date: today.todayNutrition.date,
      status: 'consumed',
    });

    const history = await nutritionApi.getHistory({
      from: today.todayNutrition.date,
      to: today.todayNutrition.date,
    });
    expect(history.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: today.todayNutrition.date }),
      ]),
    );

    const recommendation = await request(app.getHttpServer())
      .post('/nutrition/recommendations')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(201);
    expect(recommendation.body.nutritionRecommendation).toMatchObject({
      userProfileId: profile.id,
      generatorVersion: expect.any(String),
      recommendations: expect.any(Array),
    });

    const recommendations = await request(app.getHttpServer())
      .get('/nutrition/recommendations?limit=3')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(recommendations.body.recommendations).toHaveLength(1);

    const db = mongoConnection.db!;
    await expect(
      db
        .collection('nutrition_profiles')
        .findOne({ userProfileId: profile.id }),
    ).resolves.toMatchObject({
      userProfileId: profile.id,
      goal: 'muscle_gain',
    });
    await expect(
      db.collection('nutrition_plans').findOne({
        _id: new Types.ObjectId(plan.body.nutritionPlan.id),
      }),
    ).resolves.toBeTruthy();
    await expect(
      db
        .collection('nutrition_logs')
        .findOne({ userProfileId: profile.id, mealId: meal.id }),
    ).resolves.toMatchObject({
      status: 'consumed',
      actualMacros: { calories: 520 },
    });
    await expect(
      db
        .collection('nutrition_recommendations')
        .countDocuments({ userProfileId: profile.id }),
    ).resolves.toBe(1);
  });

  it('returns explicit empty state before nutrition is configured', async () => {
    const user = await createUser(app, 'nutrition-empty');
    await createUserProfile(app, user.token, user.name);

    const today = await request(app.getHttpServer())
      .get('/nutrition/today')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);
    expect(today.body.todayNutrition).toMatchObject({
      availability: 'not_configured',
      meals: [],
      progress: null,
    });

    const profile = await request(app.getHttpServer())
      .get('/nutrition/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(404);
    expect(profile.body.code).toBe('NUTRITION_PROFILE_NOT_FOUND');
  });

  it('rejects invalid input, invalid limit and expired/invalid sessions', async () => {
    const user = await createUser(app, 'nutrition-errors');

    await request(app.getHttpServer())
      .post('/nutrition/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ goal: 'invalid', mealsPerDay: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .get('/nutrition/recommendations?limit=51')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/nutrition/today')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    await request(app.getHttpServer()).get('/nutrition/today').expect(401);
  });
});

async function createUser(application: INestApplication, prefix: string) {
  const name = 'Nutrition Test User';
  const email = `${prefix}-${Date.now()}@email.com`;
  await request(application.getHttpServer())
    .post('/auth/register')
    .send({ name, email, password: 'StrongPassword123' })
    .expect(201);
  const login = await request(application.getHttpServer())
    .post('/auth/login')
    .send({ email, password: 'StrongPassword123' })
    .expect(200);
  return { name, email, token: login.body.accessToken as string };
}

async function createUserProfile(
  application: INestApplication,
  token: string,
  name: string,
) {
  const response = await request(application.getHttpServer())
    .post('/users/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ name })
    .expect(201);
  return response.body.userProfile as { id: string };
}

async function createFitnessProfile(
  application: INestApplication,
  token: string,
) {
  const response = await request(application.getHttpServer())
    .post('/fitness/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      heightCm: 180,
      weightKg: 82.5,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: { daysPerWeek: 4, minutesPerSession: 60 },
    })
    .expect(201);
  return response.body.fitnessProfile as { id: string };
}

function buildSupertestHttpClient(
  application: INestApplication,
  token: string,
): HttpClient {
  return {
    async request<TResponse>({ method = 'GET', path, body }) {
      const testRequest = request(application.getHttpServer());
      const response =
        method === 'GET'
          ? await testRequest.get(path).set('Authorization', `Bearer ${token}`)
          : await testRequest
              .post(path)
              .set('Authorization', `Bearer ${token}`)
              .send(body);

      if (response.status >= 400) {
        throw new Error(`Unexpected API status ${response.status}: ${path}`);
      }

      return response.body as TResponse;
    },
  };
}
