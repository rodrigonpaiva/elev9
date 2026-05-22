import { EventEmitter } from 'events';

import type { NextFunction, Response } from 'express';

import type { RequestWithCorrelationId } from '../http/request-with-correlation.interface';
import { requestLoggingMiddleware } from './request-logging.middleware';

describe('requestLoggingMiddleware', () => {
  const createRequest = (requestId?: string) =>
    ({
      method: 'GET',
      originalUrl: '/health',
      requestId,
    }) as RequestWithCorrelationId;

  const createResponse = (statusCode: number) =>
    Object.assign(new EventEmitter(), {
      statusCode,
    }) as Response;

  const createNext = () => jest.fn() as unknown as NextFunction;

  it('logs request details when the response finishes', () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_012);
    const request = createRequest('test-123');
    const response = createResponse(200);
    const next = createNext();

    requestLoggingMiddleware(request, response, next);
    response.emit('finish');

    expect(logSpy).toHaveBeenCalledWith(
      '[Request] requestId=test-123 method=GET path=/health status=200 durationMs=12',
    );
    expect(next).toHaveBeenCalledTimes(1);

    logSpy.mockRestore();
    nowSpy.mockRestore();
  });

  it('logs request details when the response closes with an error status', () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(2_030);
    const request = createRequest('error-123');
    const response = createResponse(500);
    const next = createNext();

    requestLoggingMiddleware(request, response, next);
    response.emit('close');

    expect(logSpy).toHaveBeenCalledWith(
      '[Request] requestId=error-123 method=GET path=/health status=500 durationMs=30',
    );

    logSpy.mockRestore();
    nowSpy.mockRestore();
  });
});
