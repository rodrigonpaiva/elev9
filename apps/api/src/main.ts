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

function resolveShutdownTimeout(): number {
  const rawTimeout = process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS?.trim();
  if (!rawTimeout) return 10_000;

  const timeout = Number(rawTimeout);
  if (!/^\d+$/.test(rawTimeout) || !Number.isSafeInteger(timeout)) {
    throw new Error('GRACEFUL_SHUTDOWN_TIMEOUT_MS must be a valid integer.');
  }

  return timeout;
}

function formatBootstrapError(error: unknown): string {
  return formatSafeError(error);
}

function installShutdownDeadline(
  app: { getHttpServer: () => { closeAllConnections?: () => void } },
  timeoutMs: number,
): void {
  const server = app.getHttpServer();
  const enforceDeadline = (): void => {
    const timer = setTimeout(() => {
      // Nest closes the listener and providers through enableShutdownHooks.
      // This final guard prevents keep-alive clients from extending shutdown
      // indefinitely; it does not expose an error response or secret.
      server.closeAllConnections?.();
    }, timeoutMs);
    timer.unref?.();
  };

  process.once('SIGTERM', enforceDeadline);
  process.once('SIGINT', enforceDeadline);
}

async function bootstrap(): Promise<void> {
  const port = resolvePort();
  const shutdownTimeoutMs = resolveShutdownTimeout();
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
  installShutdownDeadline(app, shutdownTimeoutMs);
  console.info(
    `[Bootstrap] Graceful shutdown enabled with timeout=${shutdownTimeoutMs}ms`,
  );

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
