import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';

import type { RequestWithCorrelationId } from '../http/request-with-correlation.interface';
import { sanitizeRequestId } from '../security/redaction';

const REQUEST_ID_HEADER = 'x-request-id';

export function requestCorrelationMiddleware(
  request: RequestWithCorrelationId,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId = sanitizeRequestId(request.get(REQUEST_ID_HEADER));
  const requestId = incomingRequestId ?? randomUUID();

  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
