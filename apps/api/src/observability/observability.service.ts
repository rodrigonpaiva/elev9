import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';

import {
  OBSERVABILITY_CONFIG,
  OBSERVABILITY_PROVIDER,
} from './observability.constants';
import { shutdownWithTimeout } from './observability.shutdown';
import type {
  ObservabilityConfig,
  ObservabilityProvider,
  ObservabilityState,
} from './observability.types';

@Injectable()
export class ObservabilityService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(ObservabilityService.name);

  constructor(
    @Inject(OBSERVABILITY_CONFIG)
    private readonly config: ObservabilityConfig,
    @Inject(OBSERVABILITY_PROVIDER)
    private readonly provider: ObservabilityProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.provider.start();
    } catch {
      this.logger.error(
        'Observability provider initialization failed; API remains available.',
      );
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await shutdownWithTimeout(
      () => this.provider.shutdown(),
      this.config.shutdownTimeoutMs,
      () =>
        this.logger.error(
          'Observability shutdown did not complete within its timeout.',
        ),
    );
  }

  getState(): ObservabilityState {
    return this.provider.getState();
  }

  getMode(): ObservabilityConfig['mode'] {
    return this.config.mode;
  }
}
