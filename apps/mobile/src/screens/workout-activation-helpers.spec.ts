import {
  canStartWorkout,
  resolveWorkoutAvailabilityState,
} from './workout-activation-helpers';

describe('workout activation helpers', () => {
  it('represents loading, error, available and empty states', () => {
    expect(
      resolveWorkoutAvailabilityState({ isLoading: true, hasWorkout: false }),
    ).toBe('loading');
    expect(
      resolveWorkoutAvailabilityState({
        isLoading: false,
        errorMessage: 'offline',
        hasWorkout: false,
      }),
    ).toBe('error');
    expect(
      resolveWorkoutAvailabilityState({ isLoading: false, hasWorkout: true }),
    ).toBe('available');
    expect(
      resolveWorkoutAvailabilityState({ isLoading: false, hasWorkout: false }),
    ).toBe('unavailable');
  });

  it('blocks duplicate starts and incomplete starts', () => {
    expect(
      canStartWorkout({
        isStarting: false,
        trainingPlanId: 'plan-1',
        hasWorkout: true,
      }),
    ).toBe(true);
    expect(
      canStartWorkout({
        isStarting: true,
        trainingPlanId: 'plan-1',
        hasWorkout: true,
      }),
    ).toBe(false);
    expect(
      canStartWorkout({
        isStarting: false,
        trainingPlanId: null,
        hasWorkout: true,
      }),
    ).toBe(false);
    expect(
      canStartWorkout({
        isStarting: false,
        trainingPlanId: 'plan-1',
        hasWorkout: false,
      }),
    ).toBe(false);
  });
});
