import { LogWorkoutUseCase } from './log-workout.use-case';

const input = {
  authUserId: 'auth-1',
  trainingPlanId: '507f1f77bcf86cd799439011',
  workoutDayIndex: 1,
  durationMinutes: 30,
  completedExercises: [{ name: 'Push Up', setsDone: 3, repsDone: 10 }],
};

function buildSubject(existingLog: unknown = null) {
  const workoutLogRepository = {
    findByTrainingPlanDayAndDate: jest.fn().mockResolvedValue(existingLog),
    create: jest.fn().mockResolvedValue({
      id: 'log-1',
      ...input,
      date: '2026-04-30',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };
  const recovery = { execute: jest.fn().mockResolvedValue({}) };
  const useCase = new LogWorkoutUseCase(
    {
      findByAuthUserId: jest.fn().mockResolvedValue({ id: 'profile-1' }),
    } as never,
    {
      findActiveByUserProfileId: jest
        .fn()
        .mockResolvedValue({ id: 'fitness-1' }),
    } as never,
    {
      findById: jest.fn().mockResolvedValue({
        fitnessProfileId: 'fitness-1',
        weeklySchedule: [{ dayIndex: 1, exercises: [] }],
      }),
    } as never,
    workoutLogRepository as never,
    {
      todayUtcDateString: jest.fn().mockReturnValue('2026-04-30'),
    } as never,
    recovery as never,
  );
  return { useCase, workoutLogRepository, recovery };
}

describe('LogWorkoutUseCase reconciliation', () => {
  it('rejects a duplicate log before recalculating Recovery', async () => {
    const existingLog = {
      id: 'existing-log',
      trainingPlanId: input.trainingPlanId,
      workoutDayIndex: input.workoutDayIndex,
      durationMinutes: input.durationMinutes,
      completedExercises: input.completedExercises,
      date: '2026-04-30',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { useCase, workoutLogRepository, recovery } =
      buildSubject(existingLog);

    await expect(useCase.execute(input)).rejects.toMatchObject({
      code: 'WORKOUT_LOG_ALREADY_EXISTS',
    });
    expect(workoutLogRepository.create).not.toHaveBeenCalled();
    expect(recovery.execute).not.toHaveBeenCalled();
  });

  it('reports Recovery as pending after creating the log', async () => {
    const { useCase, workoutLogRepository, recovery } = buildSubject();
    workoutLogRepository.create.mockResolvedValue({
      id: 'created-log',
      trainingPlanId: input.trainingPlanId,
      workoutDayIndex: input.workoutDayIndex,
      durationMinutes: input.durationMinutes,
      completedExercises: input.completedExercises,
      date: '2026-04-30',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    recovery.execute.mockRejectedValue(new Error('temporary failure'));

    await expect(useCase.execute(input)).resolves.toMatchObject({
      recoveryPending: true,
      workoutLog: { id: 'created-log' },
    });
    expect(workoutLogRepository.create).toHaveBeenCalledTimes(1);
  });
});
