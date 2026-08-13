import type {
  ObservabilityProvider,
  ObservabilityState,
} from '../observability.types';

export class NoopObservabilityProvider implements ObservabilityProvider {
  private readonly state: ObservabilityState;

  constructor(private readonly enabledWithoutExporter = false) {
    this.state = enabledWithoutExporter ? 'ready' : 'disabled';
  }

  async start(): Promise<void> {}

  async shutdown(): Promise<void> {}

  getState(): ObservabilityState {
    return this.state;
  }
}
