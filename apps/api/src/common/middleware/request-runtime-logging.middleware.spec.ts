import { NextFunction, Request, Response } from 'express';

import { requestRuntimeLoggingMiddleware } from './request-runtime-logging.middleware';

describe('requestRuntimeLoggingMiddleware', () => {
  it('reuses the incoming x-request-id and logs the completed request', () => {
    const finishHandlers: Array<() => void> = [];
    const setHeader = jest.fn();
    const next = jest.fn() as NextFunction;
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    const request = {
      headers: { 'x-request-id': 'request-123' },
      method: 'GET',
      originalUrl: '/nutrition/history?email=person@example.com&token=secret',
      url: '/health',
    } as unknown as Request;

    const response = {
      statusCode: 200,
      setHeader,
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') {
          finishHandlers.push(handler);
        }

        return response;
      }),
    } as unknown as Response;

    requestRuntimeLoggingMiddleware(request, response, next);
    finishHandlers[0]?.();

    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request-123');
    expect(next).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Request] requestId=request-123 method=GET path=/nutrition/history status=200 durationMs=',
      ),
    );
    expect(infoSpy.mock.calls[0]?.[0]).not.toContain('person@example.com');
    expect(infoSpy.mock.calls[0]?.[0]).not.toContain('secret');

    infoSpy.mockRestore();
  });

  it('does not log query parameters from runtime URLs', () => {
    const finishHandlers: Array<() => void> = [];
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const request = {
      headers: { 'x-request-id': 'request-123' },
      method: 'GET',
      originalUrl: '/coach?prompt=private-health-data',
      url: '/coach?prompt=private-health-data',
    } as unknown as Request;
    const response = {
      statusCode: 400,
      setHeader: jest.fn(),
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') finishHandlers.push(handler);
        return response;
      }),
    } as unknown as Response;

    requestRuntimeLoggingMiddleware(request, response, jest.fn());
    finishHandlers[0]?.();

    expect(infoSpy.mock.calls[0]?.[0]).toContain('path=/coach');
    expect(infoSpy.mock.calls[0]?.[0]).not.toContain('private-health-data');
    infoSpy.mockRestore();
  });

  it('generates a request id when the header is absent', () => {
    const finishHandlers: Array<() => void> = [];
    const setHeader = jest.fn();
    const next = jest.fn() as NextFunction;
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    const request = {
      headers: {},
      method: 'GET',
      originalUrl: '/health/ready',
      url: '/health/ready',
    } as unknown as Request;

    const response = {
      statusCode: 200,
      setHeader,
      on: jest.fn((event: string, handler: () => void) => {
        if (event === 'finish') {
          finishHandlers.push(handler);
        }

        return response;
      }),
    } as unknown as Response;

    requestRuntimeLoggingMiddleware(request, response, next);
    finishHandlers[0]?.();

    expect(setHeader).toHaveBeenCalledWith(
      'x-request-id',
      expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      ),
    );
    expect(next).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Request] requestId='),
    );

    infoSpy.mockRestore();
  });
});
