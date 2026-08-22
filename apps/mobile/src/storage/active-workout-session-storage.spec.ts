import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TodayWorkout } from '@elev9/types';
import {
  ACTIVE_WORKOUT_SESSION_KEY,
  clearActiveWorkoutSession,
  loadActiveWorkoutSession,
  saveActiveWorkoutSession,
  type ActiveWorkoutSessionInput,
} from './active-workout-session-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const workout: TodayWorkout = {
  dayIndex: 1,
  title: 'Strength',
  focus: 'Full body',
  format: 'strength',
  intensity: 'moderate',
  exercises: [{ name: 'Squat', sets: 3, reps: '8', restSeconds: 60 }],
};

function createSnapshot(
  overrides: Partial<ActiveWorkoutSessionInput> = {},
): ActiveWorkoutSessionInput {
  return {
    ownerKey: 'session-owner-1',
    mode: 'real',
    workoutSessionId: 'session-1',
    trainingPlanId: 'plan-1',
    workoutDayIndex: 1,
    workout,
    exerciseIndex: 0,
    progress: [{ completedSets: [true, false, false] }],
    phase: 'exercise',
    startedAt: 1_700_000_000_000,
    timer: null,
    lastSynchronizedAt: null,
    syncStatus: 'local',
    ...overrides,
  };
}

describe('active workout session storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists a versioned non-credential snapshot', async () => {
    await saveActiveWorkoutSession(createSnapshot());

    const serialized = storage.setItem.mock.calls[0][1];
    expect(storage.setItem).toHaveBeenCalledWith(
      ACTIVE_WORKOUT_SESSION_KEY,
      expect.any(String),
    );
    expect(serialized).toContain('"version":1');
    expect(serialized).toContain('"workoutSessionId":"session-1"');
    expect(serialized).not.toMatch(/password|token|credential|email/i);
  });

  it('isolates the snapshot by owner and mode', async () => {
    storage.getItem.mockResolvedValue(
      JSON.stringify({
        ...createSnapshot(),
        version: 1,
        updatedAt: '2026-08-22T00:00:00.000Z',
      }),
    );

    await expect(
      loadActiveWorkoutSession('session-owner-1', 'real'),
    ).resolves.toMatchObject({ workoutSessionId: 'session-1' });
    await expect(
      loadActiveWorkoutSession('session-owner-2', 'real'),
    ).resolves.toBeNull();
    await expect(
      loadActiveWorkoutSession('session-owner-1', 'demo'),
    ).resolves.toBeNull();
  });

  it('discards incompatible or corrupt versions safely', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ version: 99 }));

    await expect(
      loadActiveWorkoutSession('session-owner-1', 'real'),
    ).resolves.toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalled();

    storage.getItem.mockResolvedValue('{invalid');
    await expect(
      loadActiveWorkoutSession('session-owner-1', 'real'),
    ).resolves.toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith(ACTIVE_WORKOUT_SESSION_KEY);
  });

  it('clears the snapshot on logout or completion', async () => {
    await clearActiveWorkoutSession();
    expect(storage.removeItem).toHaveBeenCalledWith(ACTIVE_WORKOUT_SESSION_KEY);
  });
});
