import {
  areInternalEndpointsEnabled,
  createCorsOrigin,
  resolveCorsOrigins,
  resolveJwtSecret,
} from './security.config';

describe('security configuration', () => {
  it('requires JWT_SECRET outside explicit development', () => {
    expect(() =>
      resolveJwtSecret({ nodeEnv: 'production', jwtSecret: '' }),
    ).toThrow('JWT_SECRET must be configured');
    expect(() =>
      resolveJwtSecret({ nodeEnv: 'preproduction', jwtSecret: '' }),
    ).toThrow('JWT_SECRET must be configured');
  });

  it('allows the convenience JWT fallback only in explicit development', () => {
    expect(resolveJwtSecret({ nodeEnv: 'development', jwtSecret: '' })).toEqual(
      expect.any(String),
    );
    expect(() =>
      resolveJwtSecret({ nodeEnv: undefined, jwtSecret: '' }),
    ).toThrow('JWT_SECRET must be configured');
  });

  it('resolves a configured CORS allowlist and rejects a wildcard', () => {
    expect(
      resolveCorsOrigins({
        nodeEnv: 'production',
        configuredOrigins: 'https://app.example.com, https://admin.example.com',
      }),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
    expect(() =>
      resolveCorsOrigins({ nodeEnv: 'production', configuredOrigins: '*' }),
    ).toThrow('must not contain a wildcard');
  });

  it('allows configured origins and rejects origins outside the allowlist', () => {
    const origin = createCorsOrigin({
      nodeEnv: 'production',
      configuredOrigins: 'https://app.example.com',
    });
    const allowed = jest.fn();
    const rejected = jest.fn();

    origin('https://app.example.com', allowed);
    origin('https://attacker.example', rejected);

    expect(allowed).toHaveBeenCalledWith(null, true);
    expect(rejected).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Origin is not allowed by the configured CORS policy.',
      }),
    );
  });

  it('enables internal endpoints only in explicit development', () => {
    expect(areInternalEndpointsEnabled({ nodeEnv: 'development' })).toBe(true);
    expect(
      areInternalEndpointsEnabled({
        nodeEnv: 'development',
        configuredFlag: 'false',
      }),
    ).toBe(false);
    expect(
      areInternalEndpointsEnabled({
        nodeEnv: 'production',
        configuredFlag: 'true',
      }),
    ).toBe(false);
  });
});
