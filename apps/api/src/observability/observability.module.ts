import { Global, Module } from '@nestjs/common';

import { createObservabilityConfig } from './observability.config';
import {
  OBSERVABILITY_CONFIG,
  OBSERVABILITY_PROVIDER,
} from './observability.constants';
import { createObservabilityProvider } from './observability.bootstrap';
import { ObservabilityService } from './observability.service';

@Global()
@Module({
  providers: [
    {
      provide: OBSERVABILITY_CONFIG,
      useFactory: createObservabilityConfig,
    },
    {
      provide: OBSERVABILITY_PROVIDER,
      inject: [OBSERVABILITY_CONFIG],
      useFactory: createObservabilityProvider,
    },
    ObservabilityService,
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
