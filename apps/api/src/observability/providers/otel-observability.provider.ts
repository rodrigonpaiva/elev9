import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter as OtlpGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter as OtlpHttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import type { SpanExporter } from '@opentelemetry/sdk-trace-base';

import { createSafeResource } from '../observability.resource';
import type {
  ObservabilityConfig,
  ObservabilityProvider,
  ObservabilityState,
} from '../observability.types';

export type NodeSdkFactory = (
  config: ObservabilityConfig,
  exporter?: SpanExporter,
) => NodeSDK;

export const createNodeSdk: NodeSdkFactory = (config, exporter) => {
  const traceExporter = exporter ?? createTraceExporter(config);

  return new NodeSDK({
    autoDetectResources: false,
    resource: createSafeResource(config),
    textMapPropagator: new W3CTraceContextPropagator(),
    instrumentations: [],
    traceExporter,
  });
};

export class OtlpObservabilityProvider implements ObservabilityProvider {
  private state: ObservabilityState = 'disabled';
  private readonly sdk: NodeSDK;

  constructor(
    private readonly config: ObservabilityConfig,
    sdkFactory: NodeSdkFactory = createNodeSdk,
  ) {
    this.sdk = sdkFactory(config);
    this.state = 'initializing';
  }

  async start(): Promise<void> {
    if (this.config.mode !== 'enabled_with_otlp') {
      this.state = 'ready';
      return;
    }

    try {
      this.sdk.start();
      this.state = 'ready';
    } catch {
      this.state = 'failed';
      throw new Error('OpenTelemetry SDK initialization failed.');
    }
  }

  async shutdown(): Promise<void> {
    this.state = 'shutting_down';
    try {
      await this.sdk.shutdown();
      this.state = 'stopped';
    } catch {
      this.state = 'degraded';
      throw new Error('OpenTelemetry SDK shutdown failed.');
    }
  }

  getState(): ObservabilityState {
    return this.state;
  }
}

function createTraceExporter(config: ObservabilityConfig): SpanExporter {
  if (!config.otlpEndpoint) {
    throw new Error('OTLP endpoint is required for the OTLP provider.');
  }

  const url =
    config.exportProtocol === 'http'
      ? `${config.otlpEndpoint}/v1/traces`
      : config.otlpEndpoint;
  const exporterConfig = {
    url,
    timeoutMillis: config.exportTimeoutMs,
  };

  return config.exportProtocol === 'http'
    ? new OtlpHttpTraceExporter(exporterConfig)
    : new OtlpGrpcTraceExporter(exporterConfig);
}
