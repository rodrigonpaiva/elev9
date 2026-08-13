export const OBSERVABILITY_CONFIG = Symbol('OBSERVABILITY_CONFIG');
export const OBSERVABILITY_PROVIDER = Symbol('OBSERVABILITY_PROVIDER');

export const SAFE_RESOURCE_ATTRIBUTE_KEYS = ['service.namespace'] as const;

export const FORBIDDEN_RESOURCE_ATTRIBUTE_KEYS = [
  'user.id',
  'tenant.id',
  'profile.id',
  'request.id',
  'trace.id',
  'span.id',
  'email',
  'token',
  'authorization',
  'cookie',
  'prompt',
  'message',
  'nutrition',
  'health',
] as const;
