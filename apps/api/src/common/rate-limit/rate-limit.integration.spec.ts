import { Controller, Post } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { RateLimitModule } from './rate-limit.module';
import { RateLimitMetrics } from './rate-limit.metrics';

@Controller('auth')
class AuthRateLimitProbeController {
  @Post('login')
  login(): { ok: true } {
    return { ok: true };
  }
}

@Controller('health')
class HealthRateLimitProbeController {
  @Post()
  health(): { ok: true } {
    return { ok: true };
  }
}

@Controller('ai')
class AiRateLimitProbeController {
  @Post('chat')
  chat(): { ok: true } {
    return { ok: true };
  }
}

describe('RateLimitInterceptor integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_STORE = 'memory';

    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitModule],
      controllers: [
        AuthRateLimitProbeController,
        HealthRateLimitProbeController,
        AiRateLimitProbeController,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts requests below the limit and returns 429 with headers after excess', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .expect(201)
        .expect((response) => {
          expect(response.headers['ratelimit-limit']).toBe('10');
          expect(response.headers['ratelimit-remaining']).toBe(
            String(9 - attempt),
          );
        });
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .expect(429)
      .expect((response) => {
        expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(response.headers['retry-after']).toEqual(expect.any(String));
        expect(response.headers['ratelimit-remaining']).toBe('0');
      });

    expect(app.get(RateLimitMetrics).snapshot()).toEqual([
      {
        route: 'auth.login',
        policyId: 'auth.login',
        method: 'POST',
        count: 1,
      },
    ]);
  });

  it('does not apply a policy to health endpoints', async () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await request(app.getHttpServer()).post('/health').expect(201);
    }
  });

  it('keeps endpoint policies independent', async () => {
    await request(app.getHttpServer())
      .post('/ai/chat')
      .expect(201)
      .expect((response) => {
        expect(response.headers['ratelimit-limit']).toBe('20');
      });
  });
});
