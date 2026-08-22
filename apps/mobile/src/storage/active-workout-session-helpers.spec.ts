import { getRestTimerRemaining } from './active-workout-session-helpers';
import type { ActiveWorkoutTimer } from './active-workout-session-storage';

const timer: ActiveWorkoutTimer = {
  status: 'running',
  exerciseName: 'Squat',
  nextExerciseName: 'Press',
  nextSetNumber: 2,
  totalSets: 3,
  reps: '8',
  restSeconds: 60,
  isWorkoutComplete: false,
  targetEndAt: 106_000,
  remainingSeconds: 60,
};

describe('active workout session helpers', () => {
  it('restores a running timer from its absolute end timestamp', () => {
    expect(getRestTimerRemaining(timer, 100_001)).toBe(6);
  });

  it('does not resurrect an expired running timer', () => {
    expect(getRestTimerRemaining(timer, 106_001)).toBe(0);
  });

  it('preserves a paused timer without advancing it', () => {
    expect(
      getRestTimerRemaining(
        { ...timer, status: 'paused', targetEndAt: null },
        999_999,
      ),
    ).toBe(60);
  });

  it('clamps invalid negative remaining time', () => {
    expect(
      getRestTimerRemaining(
        { ...timer, status: 'paused', targetEndAt: null, remainingSeconds: -2 },
        0,
      ),
    ).toBe(0);
  });
});
