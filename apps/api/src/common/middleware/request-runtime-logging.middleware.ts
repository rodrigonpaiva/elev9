import { randomUUID } from 'node:crypto';

import { NextFunction, Request, Response } from 'express';

import { sanitizeRequestId, sanitizeRequestPath } from '../security/redaction';

function resolveRequestId(request: Request): string {
  const headerValue = request.headers['x-request-id'];

  const requestId = sanitizeRequestId(headerValue);
  if (requestId) {
    return requestId;
  }

  return randomUUID();
}

export function requestRuntimeLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = resolveRequestId(request);
  const startedAt = process.hrtime.bigint();

  response.setHeader('x-request-id', requestId);

  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const path = sanitizeRequestPath(request.originalUrl || request.url);

    console.info(
      `[Request] requestId=${requestId} method=${request.method} path=${path} status=${response.statusCode} durationMs=${durationMs.toFixed(1)}`,
    );
  });

  next();
}
