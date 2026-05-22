import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';

import type { RequestWithCorrelationId } from '../http/request-with-correlation.interface';

const REQUEST_ID_HEADER = 'x-request-id';

function normalizeRequestId(requestId: unknown): string | undefined {
  if (typeof requestId !== 'string') {
    return undefined;
  }

  const trimmedRequestId = requestId.trim();

  return trimmedRequestId.length > 0 ? trimmedRequestId : undefined;
}

export function requestCorrelationMiddleware(
  request: RequestWithCorrelationId,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId = normalizeRequestId(request.get(REQUEST_ID_HEADER));
  const requestId = incomingRequestId ?? randomUUID();

  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
