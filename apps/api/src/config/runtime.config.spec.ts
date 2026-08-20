import {
  RuntimeConfigurationError,
  validateRuntimeConfiguration,
} from './runtime.config';

function baseEnvironment(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    JWT_SECRET: 'configured-without-printing',
    MONGODB_URI: 'mongodb://configured-host/elev9',
    CORS_ALLOWED_ORIGINS: 'https://app.example.test',
    RATE_LIMIT_ENABLED: 'true',
    RATE_LIMIT_STORE: 'memory',
    AI_LLM_ENABLED: 'false',
  };
}

describe('runtime configuration', () => {
  it('rejects missing production secrets without exposing values', () => {
    const env = baseEnvironment();
    delete env.JWT_SECRET;

    expect(() => validateRuntimeConfiguration(env)).toThrow(
      RuntimeConfigurationError,
    );
    expect(() => validateRuntimeConfiguration(env)).toThrow('JWT_SECRET');
    expect(() => validateRuntimeConfiguration(env)).not.toThrow('configured');
  });

  it('permits safe defaults only in explicit development/test environments', () => {
    const development = baseEnvironment();
    development.NODE_ENV = 'development';
    delete development.JWT_SECRET;
    delete development.CORS_ALLOWED_ORIGINS;
    delete development.RATE_LIMIT_ENABLED;
    delete development.RATE_LIMIT_STORE;

    expect(validateRuntimeConfiguration(development)).toBe('development');

    const production = baseEnvironment();
    delete production.CORS_ALLOWED_ORIGINS;

    expect(() => validateRuntimeConfiguration(production)).toThrow(
      'CORS_ALLOWED_ORIGINS',
    );
  });

  it('requires every LLM operational limit when enabled outside safe environments', () => {
    const env = baseEnvironment();
    env.AI_LLM_ENABLED = 'true';
    env.OPENAI_API_KEY = 'redacted-test-value';

    expect(() => validateRuntimeConfiguration(env)).toThrow(
      'AI_LLM_MAX_CONTEXT_CHARS',
    );

    for (const key of [
      'AI_LLM_MAX_CONTEXT_CHARS',
      'AI_LLM_MAX_PROMPT_CHARS',
      'AI_LLM_MAX_COMPLETION_TOKENS',
      'AI_LLM_TIMEOUT_MS',
      'AI_LLM_MAX_REQUESTS_PER_USER',
      'AI_LLM_QUOTA_WINDOW_MS',
    ]) {
      env[key] = '100';
    }

    expect(validateRuntimeConfiguration(env)).toBe('production');
  });

  it('rejects invalid LLM limits explicitly', () => {
    const env = baseEnvironment();
    env.AI_LLM_ENABLED = 'true';
    env.OPENAI_API_KEY = 'redacted-test-value';
    env.AI_LLM_MAX_CONTEXT_CHARS = 'not-a-number';

    expect(() => validateRuntimeConfiguration(env)).toThrow(
      'AI_LLM_MAX_CONTEXT_CHARS',
    );
  });
});
