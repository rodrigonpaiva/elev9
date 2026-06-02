import type { NextFunction, Response } from 'express';

import type { RequestWithCorrelationId } from '../http/request-with-correlation.interface';
import { requestCorrelationMiddleware } from './request-correlation.middleware';

describe('requestCorrelationMiddleware', () => {
  const createResponse = () =>
    ({
      setHeader: jest.fn(),
    }) as unknown as Response;

  const createNext = () => jest.fn() as unknown as NextFunction;

  it('generates a request id when the header is missing', () => {
    const request = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as RequestWithCorrelationId;
    const response = createResponse();
    const next = createNext();

    requestCorrelationMiddleware(request, response, next);

    expect(request.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      expect.any(String),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves the incoming request id header', () => {
    const request = {
      get: jest.fn().mockReturnValue('test-123'),
    } as unknown as RequestWithCorrelationId;
    const response = createResponse();
    const next = createNext();

    requestCorrelationMiddleware(request, response, next);

    expect(request.requestId).toBe('test-123');
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'test-123');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
