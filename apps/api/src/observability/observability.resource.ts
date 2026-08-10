import { resourceFromAttributes } from '@opentelemetry/resources';

import type { ObservabilityConfig } from './observability.types';

export function createSafeResource(config: ObservabilityConfig) {
  return resourceFromAttributes({
    'service.name': config.serviceName,
    'service.version': config.serviceVersion,
    'deployment.environment': config.environment,
    ...config.resourceAttributes,
  });
}
