import type { Request } from 'express';

export interface RequestWithCorrelationId extends Request {
  requestId?: string;
}
