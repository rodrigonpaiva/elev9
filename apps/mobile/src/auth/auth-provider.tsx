import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiClientError } from '@elev9/api-client';
import type { LoginUserResponse } from '@elev9/types';
import type { RegisterUserRequest } from '@elev9/types';

import { apiClient, currentApiBaseUrl } from '../api/client';
import {
  ONBOARDING_ANALYTICS_SCHEMA_VERSION,
  onboardingAnalytics,
} from '../analytics/onboarding-analytics';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../storage/token-storage';
import { clearDailyCheckInOfflineStorage } from '../features/daily-check-in/offline/daily-check-in-storage';
import { clearRecoveryCacheForOwner } from '../features/recovery/cache/recovery-cache';
import {
  clearSessionOwnerKey,
  createSessionOwnerKey,
  ensureSessionOwnerKey,
  getSessionOwnerKey,
} from '../storage/session-owner-storage';
import { clearOnboardingProgress } from '../storage/onboarding-progress-storage';
import { clearActiveWorkoutSession } from '../storage/active-workout-session-storage';
import {
  clearSessionMode,
  getSessionMode,
  setSessionMode,
} from '../storage/session-mode-storage';
import {
  createRegistrationSubmitter,
  registerAndCreateSession,
} from './registration-flow';
import { getDemoConfig, isDemoConfigurationValid } from './demo-config';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  accessToken: string | null;
  status: AuthStatus;
  signIn(input: { email: string; password: string }): Promise<void>;
  signUp(input: RegisterUserRequest): Promise<void>;
  signInDemo(): Promise<void>;
  signOut(options?: {
    preserveOnboardingProgress?: boolean;
    preserveActiveWorkoutSession?: boolean;
  }): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const preserveOwnerKeyForNextSession = useRef(false);

  const signUp = useMemo(
    () =>
      createRegistrationSubmitter(async (input: RegisterUserRequest) => {
        await registerAndCreateSession(input, {
          register: (registrationInput) =>
            apiClient.auth.register(registrationInput),
          login: (loginInput) => apiClient.auth.login(loginInput),
          persistSession: (response) =>
            persistSession(response, setAccessTokenState, setStatus, false),
          clearPartialSession: async () => {
            await clearAccessToken();
            await clearSessionOwnerKey();
            await clearSessionMode();
            setAccessTokenState(null);
            setStatus('unauthenticated');
          },
        });
      }),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      let nextToken: string | null = null;

      try {
        nextToken = await getAccessToken();
        if (nextToken) {
          try {
            await apiClient.auth.me();
            if ((await getSessionMode()) === 'demo') {
              onboardingAnalytics.begin('demo');
            }
            await ensureSessionOwnerKey();
          } catch (error) {
            if (error instanceof ApiClientError && error.status === 401) {
              await clearAccessToken();
              await clearSessionMode();
              nextToken = null;
            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error('AuthProvider bootstrap error:', error);
      } finally {
        if (isMounted) {
          setAccessTokenState(nextToken);
          setStatus(nextToken ? 'authenticated' : 'unauthenticated');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      status,
      signUp,
      async signIn(input) {
        await persistSession(
          await apiClient.auth.login(input),
          setAccessTokenState,
          setStatus,
          preserveOwnerKeyForNextSession.current,
        );
        preserveOwnerKeyForNextSession.current = false;
      },
      async signInDemo() {
        setStatus('loading');
        const demoConfig = getDemoConfig();
        if (
          !demoConfig ||
          !isDemoConfigurationValid(demoConfig, currentApiBaseUrl)
        ) {
          setStatus('unauthenticated');
          throw new ApiClientError({
            code: 'DEMO_NOT_CONFIGURED',
            message: 'Demo is unavailable in this environment.',
            status: 503,
          });
        }

        const demoContext = onboardingAnalytics.begin('demo');
        onboardingAnalytics.track('demo_started', {
          schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
          ...demoContext,
        });

        try {
          const response = await apiClient.auth.login({
            email: demoConfig.email,
            password: demoConfig.password,
          });
          await persistSession(
            response,
            setAccessTokenState,
            setStatus,
            false,
            'demo',
          );
          onboardingAnalytics.track('demo_completed', {
            schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
            ...demoContext,
          });
        } catch (error) {
          await clearAccessToken();
          await clearSessionOwnerKey();
          await clearSessionMode();
          onboardingAnalytics.reset();
          setAccessTokenState(null);
          setStatus('unauthenticated');
          throw error;
        }
      },
      async signOut(options) {
        setStatus('loading');
        const preserveOnboardingProgress =
          options?.preserveOnboardingProgress === true;
        const preserveActiveWorkoutSession =
          options?.preserveActiveWorkoutSession === true;
        const wasDemo = onboardingAnalytics.getContext()?.mode === 'demo';

        if (wasDemo && !preserveOnboardingProgress) {
          onboardingAnalytics.track('demo_reset', {
            schemaVersion: ONBOARDING_ANALYTICS_SCHEMA_VERSION,
            ...onboardingAnalytics.getContext()!,
          });
        }

        try {
          await clearAccessToken();
        } finally {
          try {
            await clearRecoveryCacheForOwner(await getSessionOwnerKey());
          } finally {
            try {
              if (!preserveOnboardingProgress) {
                await clearOnboardingProgress();
                await clearSessionOwnerKey();
                await clearSessionMode();
                onboardingAnalytics.reset();
              } else {
                preserveOwnerKeyForNextSession.current = true;
              }
            } finally {
              try {
                if (!preserveActiveWorkoutSession) {
                  await clearActiveWorkoutSession();
                }
              } finally {
                try {
                  await clearDailyCheckInOfflineStorage();
                } finally {
                  setAccessTokenState(null);
                  setStatus('unauthenticated');
                }
              }
            }
          }
        }
      },
    }),
    [accessToken, signUp, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function persistSession(
  response: LoginUserResponse,
  setAccessTokenState: (value: string | null) => void,
  setStatus: (value: AuthStatus) => void,
  preserveOwnerKey = false,
  mode: 'real' | 'demo' = 'real',
): Promise<void> {
  await setAccessToken(response.accessToken);
  await setSessionMode(mode);
  if (!preserveOwnerKey) {
    await createSessionOwnerKey();
  } else {
    await ensureSessionOwnerKey();
  }
  setAccessTokenState(response.accessToken);
  setStatus('authenticated');
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
