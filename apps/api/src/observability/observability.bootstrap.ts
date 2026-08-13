import { NoopObservabilityProvider } from './providers/noop-observability.provider';
import { OtlpObservabilityProvider } from './providers/otel-observability.provider';
import type {
  ObservabilityConfig,
  ObservabilityProvider,
} from './observability.types';

export function createObservabilityProvider(
  config: ObservabilityConfig,
): ObservabilityProvider {
  if (config.mode === 'disabled') {
    return new NoopObservabilityProvider();
  }
  if (config.mode === 'enabled_without_exporter') {
    return new NoopObservabilityProvider(true);
  }
  return new OtlpObservabilityProvider(config);
}
