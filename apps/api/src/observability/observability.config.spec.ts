import {
  createObservabilityConfig,
  ObservabilityConfigurationError,
} from './observability.config';

describe('createObservabilityConfig', () => {
  it('defaults to disabled without network configuration', () => {
    const config = createObservabilityConfig({});

    expect(config).toMatchObject({
      enabled: false,
      mode: 'disabled',
      serviceName: 'elev9-api',
      environment: 'local',
      exportProtocol: 'http',
      exportTimeoutMs: 3000,
      shutdownTimeoutMs: 5000,
    });
    expect(config.otlpEndpoint).toBeUndefined();
  });

  it('configures an OTLP HTTP endpoint only when explicitly enabled', () => {
    const config = createObservabilityConfig({
      OBSERVABILITY_ENABLED: 'true',
      OBSERVABILITY_OTLP_ENDPOINT: 'http://localhost:4318',
      OBSERVABILITY_ENVIRONMENT: 'staging',
      OBSERVABILITY_SERVICE_VERSION: 'release-2.2',
      OBSERVABILITY_RESOURCE_ATTRIBUTES: 'service.namespace=elev9',
    });

    expect(config).toMatchObject({
      enabled: true,
      mode: 'enabled_with_otlp',
      otlpEndpoint: 'http://localhost:4318',
      serviceVersion: 'release-2.2',
      environment: 'staging',
      resourceAttributes: { 'service.namespace': 'elev9' },
    });
  });

  it('supports enabled without exporter for controlled tests', () => {
    const config = createObservabilityConfig({
      OBSERVABILITY_ENABLED: 'true',
      OBSERVABILITY_OTLP_ENDPOINT: '',
    });

    expect(config.mode).toBe('enabled_without_exporter');
  });

  it.each([
    ['OBSERVABILITY_ENABLED', { OBSERVABILITY_ENABLED: 'yes' }],
    ['OBSERVABILITY_ENVIRONMENT', { OBSERVABILITY_ENVIRONMENT: 'prod' }],
    ['OBSERVABILITY_EXPORT_PROTOCOL', { OBSERVABILITY_EXPORT_PROTOCOL: 'udp' }],
    [
      'OBSERVABILITY_OTLP_ENDPOINT',
      {
        OBSERVABILITY_ENABLED: 'true',
        OBSERVABILITY_OTLP_ENDPOINT: 'ftp://collector',
      },
    ],
    [
      'OBSERVABILITY_RESOURCE_ATTRIBUTES',
      { OBSERVABILITY_RESOURCE_ATTRIBUTES: 'user.id=secret' },
    ],
  ])('rejects invalid %s', (_name, environment) => {
    expect(() => createObservabilityConfig(environment)).toThrow(
      ObservabilityConfigurationError,
    );
  });

  it('rejects unsafe timeout values and credentials in endpoint errors without echoing secrets', () => {
    expect(() =>
      createObservabilityConfig({ OBSERVABILITY_EXPORT_TIMEOUT_MS: '1' }),
    ).toThrow(ObservabilityConfigurationError);

    expect(() =>
      createObservabilityConfig({
        OBSERVABILITY_ENABLED: 'true',
        OBSERVABILITY_OTLP_ENDPOINT: 'http://secret:token@localhost:4318',
      }),
    ).toThrow(/credentials/);
    expect(() =>
      createObservabilityConfig({
        OBSERVABILITY_ENABLED: 'true',
        OBSERVABILITY_OTLP_ENDPOINT: 'http://secret:token@localhost:4318',
      }),
    ).not.toThrow(/token/);
  });
});
