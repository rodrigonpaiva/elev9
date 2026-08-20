export type RateLimitKeyStrategy = 'ip' | 'ip+user';

export type RateLimitPolicy = {
  id: string;
  max: number;
  windowMs: number;
  keyStrategy: RateLimitKeyStrategy;
};

export type RateLimitConfig = {
  enabled: boolean;
  store: 'memory' | 'redis';
  policies: readonly RateLimitPolicy[];
};

const MINUTE = 60_000;

export const DEFAULT_RATE_LIMIT_POLICIES: readonly RateLimitPolicy[] = [
  { id: 'auth.register', max: 5, windowMs: MINUTE, keyStrategy: 'ip' },
  { id: 'auth.login', max: 10, windowMs: MINUTE, keyStrategy: 'ip' },
  { id: 'ai.chat', max: 20, windowMs: MINUTE, keyStrategy: 'ip+user' },
  { id: 'ai.coach-feedback', max: 5, windowMs: MINUTE, keyStrategy: 'ip+user' },
  {
    id: 'fitness.profile.write',
    max: 10,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'training.plan.write',
    max: 5,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'progress.check-in.write',
    max: 20,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'progress.workout.write',
    max: 20,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'progress.session.write',
    max: 10,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'nutrition.profile.write',
    max: 10,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'nutrition.calculation.write',
    max: 10,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'nutrition.plan.write',
    max: 5,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'nutrition.meal.write',
    max: 30,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'nutrition.recommendation.write',
    max: 10,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
  {
    id: 'notifications.engagement.write',
    max: 30,
    windowMs: MINUTE,
    keyStrategy: 'ip+user',
  },
];

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error('RATE_LIMIT_ENABLED must be true or false.');
}

function isNonProductionEnvironment(nodeEnv?: string): boolean {
  const normalized = nodeEnv?.trim().toLowerCase();
  return (
    normalized === 'development' || normalized === 'test' || normalized === 'ci'
  );
}

function readPositiveInteger(
  key: string,
  fallback: number,
  maximum: number,
): number {
  const raw = process.env[key]?.trim();

  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${key} must be a positive integer.`);
  }

  const value = Number(raw);

  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${key} is outside the allowed range.`);
  }

  return value;
}

export function resolveRateLimitConfig(options?: {
  nodeEnv?: string;
  enabled?: string;
  store?: string;
}): RateLimitConfig {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV;
  const enabled = parseBoolean(
    options?.enabled ?? process.env.RATE_LIMIT_ENABLED,
  );
  const resolvedEnabled =
    enabled ?? (isNonProductionEnvironment(nodeEnv) ? true : undefined);

  if (resolvedEnabled === undefined) {
    throw new Error(
      'RATE_LIMIT_ENABLED must be configured outside development/test.',
    );
  }

  const configuredStore = (options?.store ?? process.env.RATE_LIMIT_STORE)
    ?.trim()
    .toLowerCase();
  const store =
    configuredStore ??
    (isNonProductionEnvironment(nodeEnv) ? 'memory' : undefined);

  if (store !== 'memory' && store !== 'redis') {
    throw new Error('RATE_LIMIT_STORE must be memory or redis.');
  }

  const llmQuotaMax = readPositiveInteger(
    'AI_LLM_MAX_REQUESTS_PER_USER',
    20,
    10000,
  );
  const llmQuotaWindowMs = readPositiveInteger(
    'AI_LLM_QUOTA_WINDOW_MS',
    MINUTE,
    86400000,
  );
  const policies = DEFAULT_RATE_LIMIT_POLICIES.map((policy) =>
    policy.id === 'ai.chat'
      ? { ...policy, max: llmQuotaMax, windowMs: llmQuotaWindowMs }
      : policy,
  );

  return {
    enabled: resolvedEnabled,
    store,
    policies,
  };
}

export function findRateLimitPolicy(
  method: string,
  path: string,
  policies: readonly RateLimitPolicy[] = DEFAULT_RATE_LIMIT_POLICIES,
): RateLimitPolicy | undefined {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.split('?')[0];

  if (normalizedMethod === 'POST' && normalizedPath === '/auth/register') {
    return policies.find((policy) => policy.id === 'auth.register');
  }
  if (normalizedMethod === 'POST' && normalizedPath === '/auth/login') {
    return policies.find((policy) => policy.id === 'auth.login');
  }
  if (
    normalizedMethod === 'POST' &&
    (normalizedPath === '/ai/chat' || normalizedPath === '/ai/chat/stream')
  ) {
    return policies.find((policy) => policy.id === 'ai.chat');
  }
  if (normalizedMethod === 'POST' && normalizedPath === '/ai/coach-feedback') {
    return policies.find((policy) => policy.id === 'ai.coach-feedback');
  }
  if (normalizedMethod === 'POST' && normalizedPath === '/fitness/profile') {
    return policies.find((policy) => policy.id === 'fitness.profile.write');
  }
  if (normalizedMethod === 'POST' && normalizedPath === '/training/plans') {
    return policies.find((policy) => policy.id === 'training.plan.write');
  }
  if (
    normalizedMethod === 'POST' &&
    normalizedPath === '/progress/daily-check-in'
  ) {
    return policies.find((policy) => policy.id === 'progress.check-in.write');
  }
  if (
    normalizedMethod === 'POST' &&
    normalizedPath === '/progress/workout-logs'
  ) {
    return policies.find((policy) => policy.id === 'progress.workout.write');
  }
  if (
    normalizedMethod === 'POST' &&
    /^\/progress\/workout-sessions(?:\/[^/]+\/complete|\/start)$/.test(
      normalizedPath,
    )
  ) {
    return policies.find((policy) => policy.id === 'progress.session.write');
  }
  if (normalizedMethod === 'POST' && normalizedPath === '/nutrition/profile') {
    return policies.find((policy) => policy.id === 'nutrition.profile.write');
  }
  if (
    normalizedMethod === 'POST' &&
    normalizedPath === '/nutrition/macro-targets/calculate'
  ) {
    return policies.find(
      (policy) => policy.id === 'nutrition.calculation.write',
    );
  }
  if (normalizedMethod === 'POST' && normalizedPath === '/nutrition/plans') {
    return policies.find((policy) => policy.id === 'nutrition.plan.write');
  }
  if (
    normalizedMethod === 'POST' &&
    (/^\/nutrition\/logs$/.test(normalizedPath) ||
      /^\/nutrition\/meals\/[^/]+\/replace$/.test(normalizedPath))
  ) {
    return policies.find((policy) => policy.id === 'nutrition.meal.write');
  }
  if (
    normalizedMethod === 'POST' &&
    normalizedPath === '/nutrition/recommendations'
  ) {
    return policies.find(
      (policy) => policy.id === 'nutrition.recommendation.write',
    );
  }
  if (
    normalizedMethod === 'POST' &&
    /^\/notifications\/[^/]+\/events$/.test(normalizedPath)
  ) {
    return policies.find(
      (policy) => policy.id === 'notifications.engagement.write',
    );
  }

  return undefined;
}
