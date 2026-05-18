import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ApiClientError } from '@elev9/api-client';
import type { LoginUserResponse, TrainingPlanResponse } from '@elev9/types';

import { apiClient, mobileApiClient } from '../api/client';
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../storage/token-storage';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  accessToken: string | null;
  status: AuthStatus;
  signIn(input: { email: string; password: string }): Promise<void>;
  signInDemo(): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEMO_CREDENTIALS = {
  name: 'Demo Athlete',
  email: 'demo@elev9.com',
  password: 'StrongPassword123',
} as const;

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      let nextToken: string | null = null;

      try {
        nextToken = await getAccessToken();
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
      async signIn(input) {
        await persistSession(
          await apiClient.auth.login(input),
          setAccessTokenState,
          setStatus,
        );
      },
      async signInDemo() {
        setStatus('loading');

        try {
          const response = await loginOrProvisionDemoUser();
          await persistSession(response, setAccessTokenState, setStatus);
          await ensureDemoWorkspace();
        } catch (error) {
          setAccessTokenState(null);
          setStatus('unauthenticated');
          throw error;
        }
      },
      async signOut() {
        setStatus('loading');

        try {
          await clearAccessToken();
        } finally {
          setAccessTokenState(null);
          setStatus('unauthenticated');
        }
      },
    }),
    [accessToken, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function loginOrProvisionDemoUser(): Promise<LoginUserResponse> {
  try {
    return await apiClient.auth.login(DEMO_CREDENTIALS);
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.code !== 'INVALID_CREDENTIALS'
    ) {
      throw error;
    }
  }

  try {
    await apiClient.auth.register(DEMO_CREDENTIALS);
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.code !== 'EMAIL_ALREADY_EXISTS'
    ) {
      throw error;
    }
  }

  return apiClient.auth.login(DEMO_CREDENTIALS);
}

async function ensureDemoWorkspace(): Promise<void> {
  let dashboard = await getDashboardOrNull();

  if (!dashboard) {
    await createProfileIfNeeded();
    dashboard = (await apiClient.dashboard.getHome()).dashboard;
  }

  if (!dashboard.fitnessProfile) {
    const response = await createFitnessProfileIfNeeded();

    if (!dashboard.trainingPlan) {
      await createTrainingPlanIfNeeded(response.fitnessProfile.id);
    }

    return;
  }

  if (!dashboard.trainingPlan) {
    await createTrainingPlanIfNeeded(dashboard.fitnessProfile.id);
  }

  await ensureDemoWorkoutHistory();
}

async function getDashboardOrNull() {
  try {
    const response = await apiClient.dashboard.getHome();
    return response.dashboard;
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.code === 'USER_PROFILE_NOT_FOUND'
    ) {
      return null;
    }

    throw error;
  }
}

async function createProfileIfNeeded(): Promise<void> {
  try {
    await mobileApiClient.users.createProfile({
      name: DEMO_CREDENTIALS.name,
    });
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.code !== 'USER_PROFILE_ALREADY_EXISTS'
    ) {
      throw error;
    }
  }
}

async function createFitnessProfileIfNeeded() {
  try {
    return await mobileApiClient.fitness.createProfile({
      heightCm: 178,
      weightKg: 76,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: {
        daysPerWeek: 4,
        minutesPerSession: 50,
      },
    });
  } catch (error) {
    if (
      error instanceof ApiClientError &&
      error.code === 'FITNESS_PROFILE_ALREADY_EXISTS'
    ) {
      const existingProfile = await apiClient.fitness.getMyProfile();
      return {
        fitnessProfile: existingProfile.fitnessProfile,
      };
    }

    throw error;
  }
}

async function createTrainingPlanIfNeeded(
  fitnessProfileId: string,
): Promise<void> {
  try {
    await mobileApiClient.training.createPlan({ fitnessProfileId });
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.code !== 'TRAINING_PLAN_ALREADY_EXISTS'
    ) {
      throw error;
    }
  }
}

async function ensureDemoWorkoutHistory(): Promise<void> {
  const history = await mobileApiClient.progress.getWorkoutHistory(50);

  if (history.workoutLogs.length > 0) {
    return;
  }

  const dashboard = await apiClient.dashboard.getHome();
  const trainingPlanResponse = await apiClient.training.getCurrentPlan();
  const trainingPlan = trainingPlanResponse.trainingPlan;
  const targetWorkout =
    dashboard.dashboard.trainingPlan?.todayWorkout ??
    trainingPlan.weeklySchedule[0] ??
    null;

  if (!targetWorkout) {
    return;
  }

  try {
    await mobileApiClient.progress.logWorkout({
      trainingPlanId: trainingPlan.id,
      workoutDayIndex: targetWorkout.dayIndex,
      durationMinutes: 42,
      completedExercises: targetWorkout.exercises.map((exercise) => ({
        name: exercise.name,
        setsDone: exercise.sets,
        repsDone: parseReps(exercise.reps),
      })),
      feedback: {
        difficulty: 'medium',
        notes: 'Demo workout completed to unlock progress and history views.',
      },
    });
  } catch (error) {
    if (
      !(error instanceof ApiClientError) ||
      error.code !== 'WORKOUT_LOG_ALREADY_EXISTS'
    ) {
      throw error;
    }
  }
}

function parseReps(reps: string): number {
  const match = reps.match(/\d+/);
  return match ? Number(match[0]) : 10;
}

async function persistSession(
  response: LoginUserResponse,
  setAccessTokenState: (value: string | null) => void,
  setStatus: (value: AuthStatus) => void,
): Promise<void> {
  await setAccessToken(response.accessToken);
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
