import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { requestCorrelationMiddleware } from './common/middleware/request-correlation.middleware';
import { requestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AppModule } from './app.module';
import { requestRuntimeLoggingMiddleware } from './common/middleware/request-runtime-logging.middleware';
import { formatSafeError } from './common/security/redaction';
import { createCorsOrigin } from './config/security.config';

function resolvePort(): number {
  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a valid positive integer.');
  }

  return port;
}

function formatBootstrapError(error: unknown): string {
  return formatSafeError(error);
}

async function bootstrap(): Promise<void> {
  const port = resolvePort();
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase() ?? 'unset';

  console.info('[Bootstrap] Starting Elev9 API...');
  console.info(`[Bootstrap] Runtime mode: NODE_ENV=${nodeEnv}`);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.use(requestRuntimeLoggingMiddleware);
  console.info('[Bootstrap] Request correlation enabled');
  console.info('[Bootstrap] Request logging enabled');

  app.enableShutdownHooks();

  app.use(requestCorrelationMiddleware);
  app.use(requestLoggingMiddleware);
  app.enableCors({
    origin: createCorsOrigin({ nodeEnv }),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  console.info(
    '[Bootstrap] Health endpoints enabled: GET /health, GET /health/ready',
  );

  await app.listen(port, '0.0.0.0');

  console.info(`[Bootstrap] API listening on port ${port}`);
  console.info('[Bootstrap] Runtime ready');
}

void bootstrap().catch((error: unknown) => {
  console.error(`[Bootstrap] Startup failed: ${formatBootstrapError(error)}`);
  process.exit(1);
});
