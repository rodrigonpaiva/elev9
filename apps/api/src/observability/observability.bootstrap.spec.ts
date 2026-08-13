import { trace } from '@opentelemetry/api';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace';
import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';

import { createObservabilityConfig } from './observability.config';
import { createObservabilityProvider } from './observability.bootstrap';
import { createNodeSdk } from './providers/otel-observability.provider';

describe('OpenTelemetry bootstrap', () => {
  it('uses a noop provider without an endpoint when disabled', async () => {
    const provider = createObservabilityProvider(
      createObservabilityConfig({ OBSERVABILITY_ENABLED: 'false' }),
    );

    await provider.start();
    await provider.shutdown();

    expect(provider.getState()).toBe('disabled');
  });

  it('initializes the SDK and flushes a safe test span without a backend', async () => {
    const config = createObservabilityConfig({
      OBSERVABILITY_ENABLED: 'true',
    });
    const finishedSpans: ReadableSpan[] = [];
    const exporter: SpanExporter = {
      export(spans: ReadableSpan[], callback: (result: ExportResult) => void) {
        finishedSpans.push(...spans);
        callback({ code: ExportResultCode.SUCCESS });
      },
      shutdown: async () => undefined,
    };
    const sdk = createNodeSdk(config, exporter);

    sdk.start();
    const span = trace.getTracer('elev9-test').startSpan('foundation-test');
    span.setAttribute('operation', 'bootstrap');
    span.end();
    await sdk.shutdown();

    expect(finishedSpans).toHaveLength(1);
    expect(finishedSpans[0]?.attributes).toEqual({
      operation: 'bootstrap',
    });
  });

  it('does not need a configured OTLP endpoint when an in-memory exporter is supplied', () => {
    const config = createObservabilityConfig({ OBSERVABILITY_ENABLED: 'true' });
    const exporter: SpanExporter = {
      export: (_spans, callback) =>
        callback({ code: ExportResultCode.SUCCESS }),
      shutdown: async () => undefined,
    };
    const sdk = createNodeSdk(config, exporter);

    expect(sdk).toBeDefined();
  });
});
