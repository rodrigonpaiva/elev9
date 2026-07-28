import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ApiClientError } from '@elev9/api-client';
import type { LoginUserResponse } from '@elev9/types';
import type { NutritionGoal, TrainingPlanResponse } from '@elev9/types';

import { apiClient, mobileApiClient } from '../api/client';
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
        if (nextToken) await ensureSessionOwnerKey();
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
          try {
            await clearRecoveryCacheForOwner(await getSessionOwnerKey());
          } finally {
            try {
              await clearSessionOwnerKey();
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
  let fitnessGoal: NutritionGoal = 'muscle_gain';

  if (!dashboard) {
    await createProfileIfNeeded();
    dashboard = (await apiClient.dashboard.getHome()).dashboard;
  }

  if (!dashboard.fitnessProfile) {
    const response = await createFitnessProfileIfNeeded();
    fitnessGoal = mapFitnessGoalToNutritionGoal(response.fitnessProfile.goal);

    if (!dashboard.trainingPlan) {
      await createTrainingPlanIfNeeded(response.fitnessProfile.id);
    }

    await ensureDemoNutritionSetup(fitnessGoal);
    await ensureDemoWorkoutHistory();
    return;
  }

  fitnessGoal = mapFitnessGoalToNutritionGoal(dashboard.fitnessProfile.goal);

  if (!dashboard.trainingPlan) {
    await createTrainingPlanIfNeeded(dashboard.fitnessProfile.id);
  }

  await ensureDemoNutritionSetup(fitnessGoal);
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

async function ensureDemoNutritionSetup(goal: NutritionGoal): Promise<void> {
  const [profileResult, planResult] = await Promise.allSettled([
    apiClient.nutrition.getNutritionProfile(),
    apiClient.nutrition.getCurrentNutritionPlan(),
  ]);

  if (
    profileResult.status === 'rejected' &&
    profileResult.reason instanceof ApiClientError &&
    profileResult.reason.code === 'NUTRITION_PROFILE_NOT_FOUND'
  ) {
    await mobileApiClient.nutrition.createNutritionProfile({
      goal,
      mealsPerDay: 4,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: [],
    });
  } else if (profileResult.status === 'rejected') {
    throw profileResult.reason;
  }

  if (
    planResult.status === 'rejected' &&
    planResult.reason instanceof ApiClientError &&
    (planResult.reason.code === 'NUTRITION_PLAN_NOT_FOUND' ||
      planResult.reason.code === 'NUTRITION_PROFILE_NOT_FOUND')
  ) {
    await apiClient.nutrition.createNutritionPlan();
  } else if (planResult.status === 'rejected') {
    throw planResult.reason;
  }
}

function mapFitnessGoalToNutritionGoal(goal: string): NutritionGoal {
  switch (goal) {
    case 'lose_weight':
      return 'fat_loss';
    case 'maintain':
      return 'maintenance';
    case 'gain_muscle':
    default:
      return 'muscle_gain';
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
  await createSessionOwnerKey();
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
