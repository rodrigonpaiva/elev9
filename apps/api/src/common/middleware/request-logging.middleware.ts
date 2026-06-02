import type { NextFunction, Response } from 'express';

import type { RequestWithCorrelationId } from '../http/request-with-correlation.interface';

function getRequestPath(request: RequestWithCorrelationId): string {
  return request.originalUrl.split('?')[0];
}

function formatDurationMs(startTime: number): number {
  return Date.now() - startTime;
}

export function requestLoggingMiddleware(
  request: RequestWithCorrelationId,
  response: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();
  const requestId = request.requestId ?? 'unknown';
  const requestPath = getRequestPath(request);
  let logged = false;

  const logRequest = (): void => {
    if (logged) {
      return;
    }

    logged = true;

    const statusCode = response.statusCode;
    const durationMs = formatDurationMs(startTime);

    console.log(
      `[Request] requestId=${requestId} method=${request.method} path=${requestPath} status=${statusCode} durationMs=${durationMs}`,
    );
  };

  response.once('finish', logRequest);
  response.once('close', logRequest);

  next();
}
