import { getDemoConfig, isDemoConfigurationValid } from './demo-config';

describe('demo configuration', () => {
  it('does not enable demo without explicit environment credentials', () => {
    expect(getDemoConfig({ EXPO_PUBLIC_DEMO_MODE: 'true' })).toBeNull();
  });

  it('requires an explicit dedicated API configuration', () => {
    const config = getDemoConfig({
      EXPO_PUBLIC_DEMO_MODE: 'true',
      EXPO_PUBLIC_DEMO_EMAIL: 'demo@example.invalid',
      EXPO_PUBLIC_DEMO_PASSWORD: '<provided-by-host>',
      EXPO_PUBLIC_DEMO_API_URL: 'https://demo.example.invalid/',
    });

    expect(config).not.toBeNull();
    expect(
      isDemoConfigurationValid(config, 'https://demo.example.invalid'),
    ).toBe(true);
    expect(
      isDemoConfigurationValid(config, 'https://api.example.invalid'),
    ).toBe(false);
  });

  it('does not expose credentials in analytics-shaped data', () => {
    const config = getDemoConfig({
      EXPO_PUBLIC_DEMO_MODE: 'true',
      EXPO_PUBLIC_DEMO_EMAIL: 'demo@example.invalid',
      EXPO_PUBLIC_DEMO_PASSWORD: '<provided-by-host>',
      EXPO_PUBLIC_DEMO_API_URL: 'https://demo.example.invalid',
    });

    expect({ mode: 'demo' }).not.toHaveProperty('email');
    expect({ mode: 'demo' }).not.toHaveProperty('password');
    expect(config?.password).toBe('<provided-by-host>');
  });
});
