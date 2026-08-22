export type WorkoutAvailabilityState =
  | 'loading'
  | 'error'
  | 'available'
  | 'unavailable';

export function resolveWorkoutAvailabilityState(input: {
  isLoading: boolean;
  errorMessage?: string | null;
  hasWorkout: boolean;
}): WorkoutAvailabilityState {
  if (input.isLoading) return 'loading';
  if (input.errorMessage) return 'error';
  return input.hasWorkout ? 'available' : 'unavailable';
}

export function canStartWorkout(input: {
  isStarting: boolean;
  trainingPlanId: string | null;
  hasWorkout: boolean;
}): boolean {
  return Boolean(!input.isStarting && input.trainingPlanId && input.hasWorkout);
}
