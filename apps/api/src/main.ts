import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { requestRuntimeLoggingMiddleware } from './common/middleware/request-runtime-logging.middleware';

function resolvePort(): number {
  const rawPort = process.env.PORT ?? '3000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a valid positive integer.');
  }

  return port;
}

function formatBootstrapError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function bootstrap(): Promise<void> {
  const port = resolvePort();
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  console.info('[Bootstrap] Starting Elev9 API...');
  console.info(`[Bootstrap] Runtime mode: NODE_ENV=${nodeEnv}`);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.use(requestRuntimeLoggingMiddleware);
  console.info('[Bootstrap] Request correlation enabled');
  console.info('[Bootstrap] Request logging enabled');

  app.enableCors({
    origin: true,
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
  console.error(
    `[Bootstrap] Startup failed: ${formatBootstrapError(error)}`,
    error,
  );
  process.exit(1);
});
