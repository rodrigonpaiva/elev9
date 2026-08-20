export type RuntimeEnvironment =
  | 'development'
  | 'test'
  | 'ci'
  | 'preproduction'
  | 'production';

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(`Runtime configuration error: ${message}`);
    this.name = 'RuntimeConfigurationError';
  }
}

const SAFE_ENVIRONMENTS = new Set<RuntimeEnvironment>([
  'development',
  'test',
  'ci',
]);
const EXPLICIT_LLM_LIMITS = [
  'AI_LLM_MAX_CONTEXT_CHARS',
  'AI_LLM_MAX_PROMPT_CHARS',
  'AI_LLM_MAX_COMPLETION_TOKENS',
  'AI_LLM_TIMEOUT_MS',
  'AI_LLM_MAX_REQUESTS_PER_USER',
  'AI_LLM_QUOTA_WINDOW_MS',
] as const;

function environmentOf(value?: string): RuntimeEnvironment {
  const normalized = value?.trim().toLowerCase() || 'development';

  if (normalized === 'staging' || normalized === 'pre-prod') {
    return 'preproduction';
  }

  if (
    normalized !== 'development' &&
    normalized !== 'test' &&
    normalized !== 'ci' &&
    normalized !== 'preproduction' &&
    normalized !== 'production'
  ) {
    throw new RuntimeConfigurationError('NODE_ENV is not supported.');
  }

  return normalized;
}

function isTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function requireValue(
  env: NodeJS.ProcessEnv,
  key: string,
  required: boolean,
): void {
  if (required && !env[key]?.trim()) {
    throw new RuntimeConfigurationError(`${key} is required.`);
  }
}

function validatePositiveInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  required: boolean,
  maximum: number,
): void {
  const raw = env[key]?.trim();

  if (!raw) {
    if (required) {
      throw new RuntimeConfigurationError(`${key} is required.`);
    }
    return;
  }

  if (!/^\d+$/.test(raw)) {
    throw new RuntimeConfigurationError(`${key} must be a positive integer.`);
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new RuntimeConfigurationError(`${key} is outside the allowed range.`);
  }
}

export function validateRuntimeConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): RuntimeEnvironment {
  const runtimeEnvironment = environmentOf(env.NODE_ENV);
  const safeEnvironment =
    SAFE_ENVIRONMENTS.has(runtimeEnvironment) && Boolean(env.NODE_ENV?.trim());

  requireValue(env, 'JWT_SECRET', !safeEnvironment);
  requireValue(env, 'MONGODB_URI', true);
  requireValue(env, 'CORS_ALLOWED_ORIGINS', !safeEnvironment);
  requireValue(env, 'RATE_LIMIT_ENABLED', !safeEnvironment);
  requireValue(env, 'RATE_LIMIT_STORE', !safeEnvironment);
  validatePositiveInteger(env, 'HEALTH_MONGO_TIMEOUT_MS', false, 5_000);
  validatePositiveInteger(env, 'GRACEFUL_SHUTDOWN_TIMEOUT_MS', false, 30_000);

  const llmEnabled = isTrue(env.AI_LLM_ENABLED);

  if (llmEnabled) {
    requireValue(env, 'OPENAI_API_KEY', true);

    for (const key of EXPLICIT_LLM_LIMITS) {
      validatePositiveInteger(
        env,
        key,
        !safeEnvironment,
        key === 'AI_LLM_MAX_COMPLETION_TOKENS'
          ? 16384
          : key === 'AI_LLM_TIMEOUT_MS'
            ? 15000
            : 120000,
      );
    }
  }

  // Values are deliberately never included in errors. This function is called
  // before the Nest application is assembled so unsafe startup fails early.
  return runtimeEnvironment;
}
