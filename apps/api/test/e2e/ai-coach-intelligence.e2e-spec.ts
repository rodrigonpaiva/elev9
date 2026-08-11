import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { disconnect } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { requestCorrelationMiddleware } from '../../src/common/middleware/request-correlation.middleware';
import {
  COACH_INTELLIGENCE_ERROR_CODES,
  GetCoachIntelligenceError,
} from '../../src/modules/ai/application/services/coach-intelligence/coach-intelligence.errors';
import { GetCoachIntelligenceUseCase } from '../../src/modules/ai/application/use-cases/get-coach-intelligence/get-coach-intelligence.use-case';
import { AiModule } from '../../src/modules/ai/ai.module';
import {
  Clock,
  CLOCK,
} from '../../src/modules/progress/domain/services/clock.service';
import { buildCoachIntelligenceAggregateFixture } from '../fixtures/coach-intelligence.fixture';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('AI Coach Intelligence E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;
  let getCoachIntelligenceUseCase: jest.Mocked<GetCoachIntelligenceUseCase>;
  let currentNow: Date;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        ip: '127.0.0.1',
        port: 27018,
        portGeneration: false,
      },
    });
    const mongoUri = mongoMemoryServer.getUri();
    currentNow = new Date('2026-07-13T10:00:00.000Z');

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
        AiModule,
      ],
    });

    getCoachIntelligenceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachIntelligenceUseCase>;

    moduleBuilder
      .overrideProvider(GetCoachIntelligenceUseCase)
      .useValue(getCoachIntelligenceUseCase);
    moduleBuilder.overrideProvider(CLOCK).useValue(testClock);

    const moduleRef: TestingModule = await moduleBuilder.compile();

    app = moduleRef.createNestApplication();
    app.use(requestCorrelationMiddleware);
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

  beforeEach(() => {
    getCoachIntelligenceUseCase.execute.mockReset();
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .get('/ai/coach-intelligence')
      .expect(401);
  });

  it('returns the canonical aggregate for an authenticated request', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-intelligence@email.com',
    );
    const aggregate = buildCoachIntelligenceAggregateFixture();
    getCoachIntelligenceUseCase.execute.mockResolvedValue(aggregate as never);

    const response = await request(app.getHttpServer())
      .get('/ai/coach-intelligence')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getCoachIntelligenceUseCase.execute).toHaveBeenCalledWith({
      authUserId: expect.any(String),
      requestId: expect.any(String),
    });
    expect(response.body).toEqual(aggregate);
  });

  it('returns partial aggregates as 200 without transforming the payload', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-intelligence-partial@email.com',
    );
    const aggregate = {
      ...buildCoachIntelligenceAggregateFixture(),
      availability: {
        ...buildCoachIntelligenceAggregateFixture().availability,
        status: 'degraded',
        fallbackUsed: true,
        retryable: true,
        reasonCode: 'PARTIAL_FAILURE',
      },
      metadata: {
        ...buildCoachIntelligenceAggregateFixture().metadata,
        partialResult: true,
        fallbackUsed: true,
      },
    } as const;

    getCoachIntelligenceUseCase.execute.mockResolvedValue(aggregate as never);

    const response = await request(app.getHttpServer())
      .get('/ai/coach-intelligence')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(aggregate);
  });

  it('maps feature disabled to 503', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-intelligence-disabled@email.com',
    );

    getCoachIntelligenceUseCase.execute.mockRejectedValue(
      new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.FEATURE_DISABLED,
        'Coach intelligence aggregate is disabled.',
      ),
    );

    const response = await request(app.getHttpServer())
      .get('/ai/coach-intelligence')
      .set('Authorization', `Bearer ${token}`)
      .expect(503);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 503,
      }),
    );
  });

  it('maps unexpected fatal failures to 500', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-intelligence-fatal@email.com',
    );

    getCoachIntelligenceUseCase.execute.mockRejectedValue(new Error('boom'));

    const response = await request(app.getHttpServer())
      .get('/ai/coach-intelligence')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);

    expect(response.body).toEqual(
      expect.objectContaining({
        statusCode: 500,
      }),
    );
  });

  it('keeps existing AI routes working alongside the new endpoint', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-intelligence-legacy@email.com',
    );
    getCoachIntelligenceUseCase.execute.mockResolvedValue(
      buildCoachIntelligenceAggregateFixture() as never,
    );

    await request(app.getHttpServer())
      .get('/ai/coach-intelligence')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const historyResponse = await request(app.getHttpServer())
      .get('/ai/chat/history')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(historyResponse.body).toEqual([]);
  });

  async function createAuthenticatedUser(email: string): Promise<{
    token: string;
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
      .send({
        name: 'Rodrigo Paiva',
      })
      .expect(201);

    return { token };
  }
});
