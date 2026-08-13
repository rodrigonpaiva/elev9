import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FORBIDDEN_RESOURCE_ATTRIBUTE_KEYS,
  SAFE_RESOURCE_ATTRIBUTE_KEYS,
} from './observability.constants';
import type {
  ObservabilityConfig,
  ObservabilityDiagnosticLogLevel,
  ObservabilityExportProtocol,
} from './observability.types';

const ENVIRONMENTS = ['local', 'test', 'ci', 'staging', 'production'] as const;
const DIAGNOSTIC_LEVELS = ['none', 'error', 'warn', 'info', 'debug'] as const;
const DEFAULT_EXPORT_TIMEOUT_MS = 3_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30_000;

export class ObservabilityConfigurationError extends Error {
  constructor(message: string) {
    super(`Invalid observability configuration: ${message}`);
    this.name = 'ObservabilityConfigurationError';
  }
}

export function createObservabilityConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ObservabilityConfig {
  const enabled = parseBoolean(
    environment.OBSERVABILITY_ENABLED,
    false,
    'OBSERVABILITY_ENABLED',
  );
  const serviceName = parseSafeText(
    environment.OBSERVABILITY_SERVICE_NAME ?? 'elev9-api',
    'OBSERVABILITY_SERVICE_NAME',
  );
  const serviceVersion = resolveServiceVersion(environment);
  const deploymentEnvironment = parseEnvironment(
    environment.OBSERVABILITY_ENVIRONMENT ?? 'local',
  );
  const exportProtocol = parseProtocol(
    environment.OBSERVABILITY_EXPORT_PROTOCOL ?? 'http',
  );
  const exportTimeoutMs = parseTimeout(
    environment.OBSERVABILITY_EXPORT_TIMEOUT_MS,
    DEFAULT_EXPORT_TIMEOUT_MS,
    'OBSERVABILITY_EXPORT_TIMEOUT_MS',
  );
  const shutdownTimeoutMs = parseTimeout(
    environment.OBSERVABILITY_SHUTDOWN_TIMEOUT_MS,
    DEFAULT_SHUTDOWN_TIMEOUT_MS,
    'OBSERVABILITY_SHUTDOWN_TIMEOUT_MS',
  );
  const diagnosticLogLevel = parseDiagnosticLogLevel(
    environment.OBSERVABILITY_DIAGNOSTIC_LOG_LEVEL ?? 'error',
  );
  const resourceAttributes = parseResourceAttributes(
    environment.OBSERVABILITY_RESOURCE_ATTRIBUTES ?? '',
  );
  const otlpEndpoint = enabled
    ? parseEndpoint(environment.OBSERVABILITY_OTLP_ENDPOINT)
    : undefined;

  return Object.freeze({
    enabled,
    mode: !enabled
      ? 'disabled'
      : otlpEndpoint
        ? 'enabled_with_otlp'
        : 'enabled_without_exporter',
    serviceName,
    serviceVersion,
    environment: deploymentEnvironment,
    ...(otlpEndpoint ? { otlpEndpoint } : {}),
    exportProtocol,
    exportTimeoutMs,
    shutdownTimeoutMs,
    resourceAttributes: Object.freeze(resourceAttributes),
    diagnosticLogLevel,
  });
}

function parseBoolean(
  value: string | undefined,
  fallback: boolean,
  variableName: string,
): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ObservabilityConfigurationError(
    `${variableName} must be exactly true or false`,
  );
}

function parseSafeText(value: string, variableName: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || /[\r\n]/.test(normalized)) {
    throw new ObservabilityConfigurationError(
      `${variableName} must be a non-empty single-line value of at most 128 characters`,
    );
  }
  return normalized;
}

function parseEnvironment(value: string): ObservabilityConfig['environment'] {
  const normalized = value.trim().toLowerCase();
  if ((ENVIRONMENTS as readonly string[]).includes(normalized)) {
    return normalized as ObservabilityConfig['environment'];
  }
  throw new ObservabilityConfigurationError(
    'OBSERVABILITY_ENVIRONMENT must be local, test, ci, staging or production',
  );
}

function parseProtocol(value: string): ObservabilityExportProtocol {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'http' || normalized === 'grpc') return normalized;
  throw new ObservabilityConfigurationError(
    'OBSERVABILITY_EXPORT_PROTOCOL must be http or grpc',
  );
}

function parseDiagnosticLogLevel(
  value: string,
): ObservabilityDiagnosticLogLevel {
  const normalized = value.trim().toLowerCase();
  if ((DIAGNOSTIC_LEVELS as readonly string[]).includes(normalized)) {
    return normalized as ObservabilityDiagnosticLogLevel;
  }
  throw new ObservabilityConfigurationError(
    'OBSERVABILITY_DIAGNOSTIC_LOG_LEVEL is not allowlisted',
  );
}

function parseTimeout(
  value: string | undefined,
  fallback: number,
  variableName: string,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  if (!/^\d+$/.test(value.trim())) {
    throw new ObservabilityConfigurationError(
      `${variableName} must be an integer in milliseconds`,
    );
  }
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < MIN_TIMEOUT_MS ||
    parsed > MAX_TIMEOUT_MS
  ) {
    throw new ObservabilityConfigurationError(
      `${variableName} must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}`,
    );
  }
  return parsed;
}

function parseEndpoint(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') return undefined;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ObservabilityConfigurationError(
      'OBSERVABILITY_OTLP_ENDPOINT must be a valid URL',
    );
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ObservabilityConfigurationError(
      'OBSERVABILITY_OTLP_ENDPOINT must use http or https',
    );
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new ObservabilityConfigurationError(
      'OBSERVABILITY_OTLP_ENDPOINT must not contain credentials, query parameters or fragments',
    );
  }
  return parsed.toString().replace(/\/$/, '');
}

function parseResourceAttributes(value: string): Record<string, string> {
  if (!value.trim()) return {};

  const attributes: Record<string, string> = {};
  for (const pair of value.split(',')) {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex <= 0) {
      throw new ObservabilityConfigurationError(
        'OBSERVABILITY_RESOURCE_ATTRIBUTES must contain key=value pairs',
      );
    }
    const key = pair.slice(0, separatorIndex).trim();
    const attributeValue = pair.slice(separatorIndex + 1).trim();
    if (
      !SAFE_RESOURCE_ATTRIBUTE_KEYS.includes(
        key as (typeof SAFE_RESOURCE_ATTRIBUTE_KEYS)[number],
      )
    ) {
      const forbidden = FORBIDDEN_RESOURCE_ATTRIBUTE_KEYS.includes(
        key as (typeof FORBIDDEN_RESOURCE_ATTRIBUTE_KEYS)[number],
      );
      throw new ObservabilityConfigurationError(
        forbidden
          ? `resource attribute ${key} is forbidden`
          : `resource attribute ${key} is not allowlisted`,
      );
    }
    if (
      !attributeValue ||
      attributeValue.length > 128 ||
      /[\r\n]/.test(attributeValue)
    ) {
      throw new ObservabilityConfigurationError(
        'resource attribute values must be non-empty single-line values of at most 128 characters',
      );
    }
    attributes[key] = attributeValue;
  }
  return attributes;
}

function resolveServiceVersion(environment: NodeJS.ProcessEnv): string {
  const explicit = environment.OBSERVABILITY_SERVICE_VERSION?.trim();
  if (explicit) return parseSafeText(explicit, 'OBSERVABILITY_SERVICE_VERSION');

  for (const key of ['RELEASE_VERSION', 'BUILD_VERSION', 'APP_VERSION']) {
    const value = environment[key]?.trim();
    if (value) return parseSafeText(value, key);
  }

  try {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { version?: unknown };
    if (typeof packageJson.version === 'string' && packageJson.version.trim()) {
      return parseSafeText(packageJson.version, 'package.json version');
    }
  } catch {
    // Runtime package discovery is best effort and must never block telemetry.
  }

  return 'unknown';
}
