const DEVELOPMENT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8081',
] as const;

export type CorsOriginCallback = (
  error: Error | null,
  allowed?: boolean,
) => void;

function normalizeEnvironment(nodeEnv?: string): string | undefined {
  const normalized = nodeEnv?.trim().toLowerCase();
  return normalized || undefined;
}

export function isExplicitDevelopment(nodeEnv = process.env.NODE_ENV): boolean {
  return normalizeEnvironment(nodeEnv) === 'development';
}

export function resolveJwtSecret(options?: {
  nodeEnv?: string;
  jwtSecret?: string;
}): string {
  const nodeEnv = normalizeEnvironment(
    options?.nodeEnv ?? process.env.NODE_ENV,
  );
  const configuredSecret = (
    options?.jwtSecret ?? process.env.JWT_SECRET
  )?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (nodeEnv === 'development') {
    return 'dev-secret';
  }

  throw new Error(
    'JWT_SECRET must be configured outside an explicit development environment.',
  );
}

function parseConfiguredOrigins(rawOrigins?: string): string[] {
  return (rawOrigins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveCorsOrigins(options?: {
  nodeEnv?: string;
  configuredOrigins?: string;
}): readonly string[] {
  const configuredOrigins = parseConfiguredOrigins(
    options?.configuredOrigins ?? process.env.CORS_ALLOWED_ORIGINS,
  );

  if (configuredOrigins.includes('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS must not contain a wildcard origin.');
  }

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  if (isExplicitDevelopment(options?.nodeEnv ?? process.env.NODE_ENV)) {
    return DEVELOPMENT_CORS_ORIGINS;
  }

  throw new Error(
    'CORS_ALLOWED_ORIGINS must be configured outside an explicit development environment.',
  );
}

export function createCorsOrigin(options?: {
  nodeEnv?: string;
  configuredOrigins?: string;
}): (origin: string | undefined, callback: CorsOriginCallback) => void {
  const allowedOrigins = new Set(resolveCorsOrigins(options));

  return (origin, callback) => {
    // Native clients do not send an Origin header. Browser origins are checked.
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by the configured CORS policy.'));
  };
}

export function areInternalEndpointsEnabled(options?: {
  nodeEnv?: string;
  configuredFlag?: string;
}): boolean {
  const configuredFlag = (
    options?.configuredFlag ?? process.env.INTERNAL_ENDPOINTS_ENABLED
  )
    ?.trim()
    .toLowerCase();

  return (
    isExplicitDevelopment(options?.nodeEnv ?? process.env.NODE_ENV) &&
    configuredFlag !== 'false'
  );
}
