export type ObservabilityMode =
  | 'disabled'
  | 'enabled_without_exporter'
  | 'enabled_with_otlp';

export type ObservabilityState =
  | 'disabled'
  | 'initializing'
  | 'ready'
  | 'degraded'
  | 'failed'
  | 'shutting_down'
  | 'stopped';

export type ObservabilityExportProtocol = 'http' | 'grpc';
export type ObservabilityDiagnosticLogLevel =
  | 'none'
  | 'error'
  | 'warn'
  | 'info'
  | 'debug';

export type ObservabilityConfig = Readonly<{
  enabled: boolean;
  mode: ObservabilityMode;
  serviceName: string;
  serviceVersion: string;
  environment: 'local' | 'test' | 'ci' | 'staging' | 'production';
  otlpEndpoint?: string;
  exportProtocol: ObservabilityExportProtocol;
  exportTimeoutMs: number;
  shutdownTimeoutMs: number;
  resourceAttributes: Readonly<Record<string, string>>;
  diagnosticLogLevel: ObservabilityDiagnosticLogLevel;
}>;

export interface ObservabilityProvider {
  start(): Promise<void>;
  shutdown(): Promise<void>;
  getState(): ObservabilityState;
}
