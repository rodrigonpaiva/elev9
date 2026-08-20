import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

import { RateLimitMetrics } from './rate-limit.metrics';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitInterceptor {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly rateLimitMetrics: RateLimitMetrics,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & { authUser?: { id: string }; requestId?: string }
    >();
    const response = http.getResponse<Response>();
    const decision = await this.rateLimitService.check(request);

    if (!decision) return next.handle();

    const { policy, result } = decision;
    const remaining = Math.max(policy.max - result.count, 0);
    response.setHeader('RateLimit-Limit', policy.max);
    response.setHeader('RateLimit-Remaining', remaining);
    response.setHeader('RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!decision.allowed) {
      const retryAfter = Math.max(
        Math.ceil((result.resetAt - Date.now()) / 1000),
        1,
      );
      response.setHeader('Retry-After', retryAfter);
      this.rateLimitMetrics.recordExceeded({
        policy,
        method: request.method,
        requestId: request.requestId ?? request.header('x-request-id'),
      });
      throw new HttpException(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }
}
