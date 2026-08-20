import {
  REDACTED_VALUE,
  formatSafeError,
  redactStructuredValue,
  redactText,
  sanitizeRequestId,
  sanitizeRequestPath,
} from './redaction';

describe('redaction policy', () => {
  it('redacts authorization, cookies, tokens, emails and health data', () => {
    const result = redactStructuredValue({
      authorization: 'Bearer secret-token',
      cookie: 'session=secret-cookie',
      refreshToken: 'refresh-secret',
      email: 'person@example.com',
      userProfileId: 'profile-private',
      healthContext: { fatigueLevel: 'HIGH' },
      operation: 'get_recovery',
      requestId: 'request-123',
    });

    expect(result).toEqual({
      authorization: REDACTED_VALUE,
      cookie: REDACTED_VALUE,
      refreshToken: REDACTED_VALUE,
      email: REDACTED_VALUE,
      userProfileId: REDACTED_VALUE,
      healthContext: REDACTED_VALUE,
      operation: 'get_recovery',
      requestId: 'request-123',
    });
  });

  it('redacts secrets and emails embedded in error text', () => {
    const text = redactText(
      'login failed for person@example.com with Bearer abc.def.ghi password=hunter2',
    );

    expect(text).not.toContain('person@example.com');
    expect(text).not.toContain('abc.def.ghi');
    expect(text).not.toContain('hunter2');
  });

  it('removes query parameters while preserving the logical route', () => {
    expect(
      sanitizeRequestPath('/nutrition/history?email=person@example.com'),
    ).toBe('/nutrition/history');
  });

  it('preserves safe request ids and hashes unsafe identifiers', () => {
    expect(sanitizeRequestId('request-123')).toBe('request-123');
    expect(sanitizeRequestId('person@example.com')).toMatch(
      /^redacted-[a-f0-9]{16}$/,
    );
    expect(sanitizeRequestId('abc.def.ghi')).toMatch(/^redacted-[a-f0-9]{16}$/);
  });

  it('does not include internal error details in bootstrap diagnostics', () => {
    const safe = formatSafeError(
      new Error('connection failed password=hunter2 for person@example.com'),
    );

    expect(safe).toContain('Error:');
    expect(safe).not.toContain('hunter2');
    expect(safe).not.toContain('person@example.com');
  });
});
