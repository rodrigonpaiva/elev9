import { createHash } from 'node:crypto';

export const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'useridentity',
  'email',
  'userid',
  'userprofileid',
  'profileid',
  'prompt',
  'promptpreview',
  'message',
  'content',
  'health',
  'healthcontext',
  'nutrition',
  'nutritioncontext',
  'recovery',
  'sourcecontext',
  'body',
  'query',
]);

const JWT_PATTERN = /\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const JWT_GLOBAL_PATTERN =
  /\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CREDENTIAL_PATTERN =
  /\b(password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;&]+/gi;

export function redactText(value: string): string {
  return value
    .replace(BEARER_PATTERN, 'Bearer [REDACTED]')
    .replace(JWT_GLOBAL_PATTERN, REDACTED_VALUE)
    .replace(CREDENTIAL_PATTERN, '$1=[REDACTED]')
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
}

export function redactStructuredValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactStructuredValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        isSensitiveKey(key) ? REDACTED_VALUE : redactStructuredValue(entry),
      ]),
    );
  }

  return typeof value === 'string' ? redactText(value) : value;
}

export function sanitizeRequestPath(path: string): string {
  const withoutQuery = path.split(/[?#]/, 1)[0] || '/';
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

export function sanitizeRequestId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  if (!normalized || normalized.length > 128 || JWT_PATTERN.test(normalized)) {
    return normalized ? hashSensitiveIdentifier(normalized) : undefined;
  }

  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)) {
    return hashSensitiveIdentifier(normalized);
  }

  return normalized;
}

export function formatSafeError(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';
  return `${error.name}: ${redactText(error.message)}`;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.replace(/[-_]/g, '').toLowerCase());
}

export function hashSensitiveIdentifier(value: string): string {
  return `redacted-${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}
