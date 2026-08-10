import { createObservabilityConfig } from './observability.config';
import { createSafeResource } from './observability.resource';

describe('createSafeResource', () => {
  it('creates only safe low-cardinality resource attributes', () => {
    const config = createObservabilityConfig({
      OBSERVABILITY_SERVICE_VERSION: '0.1.0',
      OBSERVABILITY_RESOURCE_ATTRIBUTES: 'service.namespace=elev9',
    });
    const resource = createSafeResource(config);

    expect(resource.attributes).toEqual({
      'service.name': 'elev9-api',
      'service.version': '0.1.0',
      'deployment.environment': 'local',
      'service.namespace': 'elev9',
    });
  });
});
