import type { ActiveWorkoutTimer } from './active-workout-session-storage';

export function getRestTimerRemaining(
  timer: ActiveWorkoutTimer,
  now: number,
): number {
  if (timer.status === 'paused' || timer.targetEndAt === null) {
    return Math.max(0, timer.remainingSeconds);
  }

  return Math.max(0, Math.ceil((timer.targetEndAt - now) / 1000));
}
