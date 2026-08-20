import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { resolveRateLimitConfig } from './rate-limit.config';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import { RateLimitMetrics } from './rate-limit.metrics';
import { RateLimitService } from './rate-limit.service';
import { MemoryRateLimitStore, RATE_LIMIT_STORE } from './rate-limit.store';

@Global()
@Module({
  providers: [
    {
      provide: 'RATE_LIMIT_CONFIG',
      useFactory: () => resolveRateLimitConfig(),
    },
    {
      provide: RATE_LIMIT_STORE,
      useFactory: () => {
        const config = resolveRateLimitConfig();
        if (config.store === 'redis') {
          throw new Error(
            'RATE_LIMIT_STORE=redis is configured but no Redis adapter is installed.',
          );
        }
        return new MemoryRateLimitStore();
      },
    },
    {
      provide: RateLimitService,
      useFactory: (
        store: MemoryRateLimitStore,
        config: ReturnType<typeof resolveRateLimitConfig>,
      ) => new RateLimitService(store, config),
      inject: [RATE_LIMIT_STORE, 'RATE_LIMIT_CONFIG'],
    },
    RateLimitInterceptor,
    RateLimitMetrics,
    {
      provide: APP_INTERCEPTOR,
      useExisting: RateLimitInterceptor,
    },
  ],
  exports: [RateLimitService, RateLimitInterceptor, RateLimitMetrics],
})
export class RateLimitModule {}
