import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TodayWorkout } from '@elev9/types';

export const ACTIVE_WORKOUT_SESSION_KEY = 'elev9.active-workout-session.v1';
export const ACTIVE_WORKOUT_SESSION_VERSION = 1 as const;

export type ActiveWorkoutMode = 'real' | 'demo';
export type ActiveWorkoutPhase = 'exercise' | 'paused' | 'complete';
export type ActiveWorkoutSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export type ActiveWorkoutProgress = {
  completedSets: boolean[];
};

export type ActiveWorkoutTimer = {
  status: 'running' | 'paused';
  exerciseName: string;
  nextExerciseName: string;
  nextSetNumber: number;
  totalSets: number;
  reps: string;
  restSeconds: number;
  isWorkoutComplete: boolean;
  targetEndAt: number | null;
  remainingSeconds: number;
};

export type ActiveWorkoutSessionSnapshot = {
  version: typeof ACTIVE_WORKOUT_SESSION_VERSION;
  ownerKey: string;
  mode: ActiveWorkoutMode;
  workoutSessionId: string;
  trainingPlanId: string;
  workoutDayIndex: number;
  workout: TodayWorkout;
  exerciseIndex: number;
  progress: ActiveWorkoutProgress[];
  phase: ActiveWorkoutPhase;
  startedAt: number;
  timer: ActiveWorkoutTimer | null;
  lastSynchronizedAt: string | null;
  syncStatus: ActiveWorkoutSyncStatus;
  updatedAt: string;
};

export type ActiveWorkoutSessionInput = Omit<
  ActiveWorkoutSessionSnapshot,
  'version' | 'updatedAt'
>;

export async function loadActiveWorkoutSession(
  ownerKey: string,
  mode: ActiveWorkoutMode,
): Promise<ActiveWorkoutSessionSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
    if (!raw) return null;

    const value: unknown = JSON.parse(raw);
    if (
      !isActiveWorkoutSession(value) ||
      value.ownerKey !== ownerKey ||
      value.mode !== mode
    ) {
      return null;
    }

    return value;
  } catch {
    await clearActiveWorkoutSession();
    return null;
  }
}

export async function saveActiveWorkoutSession(
  input: ActiveWorkoutSessionInput,
): Promise<void> {
  try {
    const snapshot: ActiveWorkoutSessionSnapshot = {
      ...input,
      version: ACTIVE_WORKOUT_SESSION_VERSION,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(
      ACTIVE_WORKOUT_SESSION_KEY,
      JSON.stringify(snapshot),
    );
  } catch {
    // Local recovery is best effort and never blocks a workout action.
  }
}

export async function updateActiveWorkoutSession(
  ownerKey: string,
  mode: ActiveWorkoutMode,
  update: (
    current: ActiveWorkoutSessionSnapshot,
  ) => ActiveWorkoutSessionInput | null,
): Promise<void> {
  const current = await loadActiveWorkoutSession(ownerKey, mode);
  if (!current) return;

  const next = update(current);
  if (!next) {
    await clearActiveWorkoutSession();
    return;
  }

  await saveActiveWorkoutSession(next);
}

export async function clearActiveWorkoutSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ACTIVE_WORKOUT_SESSION_KEY);
  } catch {
    // Logout/completion must continue even when local storage is unavailable.
  }
}

function isActiveWorkoutSession(
  value: unknown,
): value is ActiveWorkoutSessionSnapshot {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const progress = candidate.progress;
  const workout = candidate.workout;

  return (
    candidate.version === ACTIVE_WORKOUT_SESSION_VERSION &&
    typeof candidate.ownerKey === 'string' &&
    (candidate.mode === 'real' || candidate.mode === 'demo') &&
    typeof candidate.workoutSessionId === 'string' &&
    typeof candidate.trainingPlanId === 'string' &&
    Number.isInteger(candidate.workoutDayIndex) &&
    isWorkout(workout) &&
    Number.isInteger(candidate.exerciseIndex) &&
    Array.isArray(progress) &&
    progress.every(isProgress) &&
    (candidate.phase === 'exercise' ||
      candidate.phase === 'paused' ||
      candidate.phase === 'complete') &&
    typeof candidate.startedAt === 'number' &&
    (candidate.timer === null || isTimer(candidate.timer)) &&
    (candidate.lastSynchronizedAt === null ||
      typeof candidate.lastSynchronizedAt === 'string') &&
    (candidate.syncStatus === 'local' ||
      candidate.syncStatus === 'syncing' ||
      candidate.syncStatus === 'synced' ||
      candidate.syncStatus === 'error') &&
    typeof candidate.updatedAt === 'string'
  );
}

function isProgress(value: unknown): value is ActiveWorkoutProgress {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    Array.isArray((value as { completedSets?: unknown }).completedSets) &&
    (value as { completedSets: unknown[] }).completedSets.every(
      (item) => typeof item === 'boolean',
    )
  );
}

function isTimer(value: unknown): value is ActiveWorkoutTimer {
  if (!value || typeof value !== 'object') return false;
  const timer = value as Record<string, unknown>;
  return (
    (timer.status === 'running' || timer.status === 'paused') &&
    typeof timer.exerciseName === 'string' &&
    typeof timer.nextExerciseName === 'string' &&
    Number.isInteger(timer.nextSetNumber) &&
    Number.isInteger(timer.totalSets) &&
    typeof timer.reps === 'string' &&
    Number.isInteger(timer.restSeconds) &&
    (timer.targetEndAt === null || typeof timer.targetEndAt === 'number') &&
    Number.isInteger(timer.remainingSeconds) &&
    typeof timer.isWorkoutComplete === 'boolean'
  );
}

function isWorkout(value: unknown): value is TodayWorkout {
  if (!value || typeof value !== 'object') return false;
  const workout = value as Record<string, unknown>;
  return (
    Number.isInteger(workout.dayIndex) &&
    typeof workout.title === 'string' &&
    typeof workout.focus === 'string' &&
    typeof workout.format === 'string' &&
    (workout.intensity === 'low' ||
      workout.intensity === 'moderate' ||
      workout.intensity === 'high') &&
    Array.isArray(workout.exercises) &&
    workout.exercises.every((exercise) => {
      if (!exercise || typeof exercise !== 'object') return false;
      const item = exercise as Record<string, unknown>;
      return (
        typeof item.name === 'string' &&
        Number.isInteger(item.sets) &&
        typeof item.reps === 'string' &&
        Number.isInteger(item.restSeconds)
      );
    })
  );
}
