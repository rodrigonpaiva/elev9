export type DemoConfig = {
  email: string;
  password: string;
  apiUrl: string;
};

export function getDemoConfig(
  env: Record<string, string | undefined> = process.env,
): DemoConfig | null {
  if (env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
    return null;
  }

  const email = env.EXPO_PUBLIC_DEMO_EMAIL?.trim();
  const password = env.EXPO_PUBLIC_DEMO_PASSWORD;
  const apiUrl = env.EXPO_PUBLIC_DEMO_API_URL?.trim();

  if (!email || !password || !apiUrl) {
    return null;
  }

  return { email, password, apiUrl };
}

export function isDemoConfigurationValid(
  config: DemoConfig | null,
  applicationApiUrl: string,
): boolean {
  return Boolean(
    config && normalize(config.apiUrl) === normalize(applicationApiUrl),
  );
}

function normalize(value: string): string {
  return value.replace(/\/$/, '');
}
