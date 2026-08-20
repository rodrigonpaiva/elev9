import 'reflect-metadata';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { disconnect } from 'mongoose';
import { sign } from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { createAiApi } from '../../../../packages/api-client/src/ai-api';
import type { HttpClient } from '../../../../packages/api-client/src/http-client';
import { AiModule } from '../../src/modules/ai/ai.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { FitnessModule } from '../../src/modules/fitness/fitness.module';
import { ProgressModule } from '../../src/modules/progress/progress.module';
import { NutritionModule } from '../../src/modules/nutrition/nutrition.module';
import { TrainingModule } from '../../src/modules/training/training.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('AI Coach Chat E2E', () => {
  let app: INestApplication;
  let mongoMemoryServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        ip: '127.0.0.1',
        portGeneration: true,
      },
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoMemoryServer.getUri()),
        AuthModule,
        UsersModule,
        FitnessModule,
        NutritionModule,
        TrainingModule,
        ProgressModule,
        AiModule,
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
    await app?.close();
    await disconnect();
    await mongoMemoryServer?.stop();
  });

  it('answers through api-client, persists the conversation, and reuses it', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-chat-main@email.com',
    );
    const aiApi = createAiApi(buildSupertestHttpClient(token));

    const first = await aiApi.sendChatMessage({
      message: 'Como devo organizar meu treino hoje?',
    });

    expect(first).toEqual({
      conversationId: expect.any(String),
      reply: expect.any(String),
    });
    expect(first.reply.length).toBeGreaterThan(0);

    const second = await aiApi.sendChatMessage({
      message: 'E como posso recuperar melhor depois?',
    });
    expect(second.conversationId).toBe(first.conversationId);

    const history = await aiApi.getChatHistory();
    expect(history).toHaveLength(4);
    expect(history.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'user', content: 'Como devo organizar meu treino hoje?' },
      { role: 'assistant', content: first.reply },
      { role: 'user', content: 'E como posso recuperar melhor depois?' },
      { role: 'assistant', content: second.reply },
    ]);

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    await request(app.getHttpServer())
      .get('/ai/chat/debug/reply-path')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    process.env.NODE_ENV = 'development';
    try {
      await request(app.getHttpServer())
        .get('/ai/chat/debug/reply-path')
        .expect(401);

      const debug = await request(app.getHttpServer())
        .get('/ai/chat/debug/reply-path')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(debug.body.replyPath).toEqual(
        expect.objectContaining({
          source: 'heuristic',
          fallbackActivated: true,
          fallbackReason: 'llm_disabled',
        }),
      );
      expect(JSON.stringify(debug.body)).not.toContain('OPENAI_API_KEY');
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('supports a user with an incomplete context through the deterministic fallback', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-chat-sparse@email.com',
    );

    const response = await request(app.getHttpServer())
      .post('/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Não tenho dados registrados ainda.' })
      .expect(200);

    expect(response.body).toEqual({
      conversationId: expect.any(String),
      reply: expect.any(String),
    });

    const history = await request(app.getHttpServer())
      .get('/ai/chat/history?limit=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(history.body).toEqual([
      {
        role: 'user',
        content: 'Não tenho dados registrados ainda.',
        createdAt: expect.any(String),
      },
      {
        role: 'assistant',
        content: response.body.reply,
        createdAt: expect.any(String),
      },
    ]);
  });

  it('rejects empty or malformed messages and protects the session boundary', async () => {
    const { token } = await createAuthenticatedUser(
      'coach-chat-invalid@email.com',
    );

    await request(app.getHttpServer())
      .post('/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: '   ' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'valid', unexpected: true })
      .expect(400);

    await request(app.getHttpServer())
      .post('/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'x'.repeat(1001) })
      .expect(400);

    await request(app.getHttpServer())
      .post('/ai/chat')
      .send({ message: 'valid' })
      .expect(401);

    const expiredToken = sign(
      { sub: 'expired-coach-user' },
      process.env.JWT_SECRET as string,
      { expiresIn: -1 },
    );
    await request(app.getHttpServer())
      .post('/ai/chat')
      .set('Authorization', `Bearer ${expiredToken}`)
      .send({ message: 'valid' })
      .expect(401);

    await request(app.getHttpServer())
      .get('/ai/chat/history?limit=0')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('keeps chat history isolated between authenticated users', async () => {
    const first = await createAuthenticatedUser('coach-chat-owner@email.com');
    const second = await createAuthenticatedUser('coach-chat-other@email.com');

    await request(app.getHttpServer())
      .post('/ai/chat')
      .set('Authorization', `Bearer ${first.token}`)
      .send({ message: 'Mensagem privada do primeiro usuário.' })
      .expect(200);

    const secondHistory = await request(app.getHttpServer())
      .get('/ai/chat/history')
      .set('Authorization', `Bearer ${second.token}`)
      .expect(200);
    expect(secondHistory.body).toEqual([]);

    const firstHistory = await request(app.getHttpServer())
      .get('/ai/chat/history')
      .set('Authorization', `Bearer ${first.token}`)
      .expect(200);
    expect(firstHistory.body[0].content).toBe(
      'Mensagem privada do primeiro usuário.',
    );
    expect(JSON.stringify(secondHistory.body)).not.toContain('privada');
  });

  function buildSupertestHttpClient(token: string): HttpClient {
    return {
      async request<TResponse>(input) {
        const result =
          input.method === 'POST'
            ? await request(app.getHttpServer())
                .post(input.path)
                .set('Authorization', `Bearer ${token}`)
                .send(input.body)
            : await request(app.getHttpServer())
                .get(input.path)
                .set('Authorization', `Bearer ${token}`);

        if (result.status >= 400) {
          throw new Error(`Unexpected status ${result.status}`);
        }

        return result.body as TResponse;
      },
    };
  }

  async function createAuthenticatedUser(
    email: string,
  ): Promise<{ token: string }> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Coach User', email, password: 'StrongPassword123' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'StrongPassword123' })
      .expect(200);
    const token = login.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Coach User' })
      .expect(201);

    return { token };
  }
});
