import type {
  ObservabilityConfig,
  ObservabilityProvider,
} from './observability.types';
import { ObservabilityService } from './observability.service';

const config: ObservabilityConfig = {
  enabled: false,
  mode: 'disabled',
  serviceName: 'elev9-api',
  serviceVersion: 'unknown',
  environment: 'test',
  exportProtocol: 'http',
  exportTimeoutMs: 3000,
  shutdownTimeoutMs: 100,
  resourceAttributes: {},
  diagnosticLogLevel: 'error',
};

function provider(
  overrides: Partial<ObservabilityProvider> = {},
): ObservabilityProvider {
  return {
    start: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn().mockReturnValue('disabled'),
    ...overrides,
  };
}

describe('ObservabilityService', () => {
  it('starts and shuts down the provider through the Nest lifecycle', async () => {
    const currentProvider = provider();
    const service = new ObservabilityService(config, currentProvider);

    await service.onModuleInit();
    await service.onApplicationShutdown();

    expect(currentProvider.start).toHaveBeenCalledTimes(1);
    expect(currentProvider.shutdown).toHaveBeenCalledTimes(1);
  });

  it('does not propagate provider startup failures to the API lifecycle', async () => {
    const currentProvider = provider({
      start: jest.fn().mockRejectedValue(new Error('collector unavailable')),
    });
    const service = new ObservabilityService(config, currentProvider);

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it('bounds a hanging provider shutdown', async () => {
    const currentProvider = provider({
      shutdown: jest.fn(() => new Promise<void>(() => undefined)),
    });
    const service = new ObservabilityService(config, currentProvider);

    await expect(service.onApplicationShutdown()).resolves.toBeUndefined();
  });
});
