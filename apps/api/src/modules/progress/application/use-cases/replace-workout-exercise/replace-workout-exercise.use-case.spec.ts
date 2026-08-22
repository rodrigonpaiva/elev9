import { WorkoutSession } from '../../../domain/entities/workout-session.entity';
import { ReplaceWorkoutExerciseUseCase } from './replace-workout-exercise.use-case';
import {
  REPLACE_WORKOUT_EXERCISE_ERROR_CODES,
  ReplaceWorkoutExerciseError,
} from './replace-workout-exercise.errors';

const sessionId = '507f1f77bcf86cd799439011';
const session = (
  overrides: Partial<ConstructorParameters<typeof WorkoutSession>[0]> = {},
) =>
  new WorkoutSession({
    id: sessionId,
    userProfileId: 'profile-1',
    trainingPlanId: 'plan-1',
    workoutDayIndex: 0,
    date: '2099-01-01',
    status: 'active',
    startedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

function makeSubject(current = session()) {
  const sessions = {
    findById: jest.fn().mockResolvedValue(current),
    replaceExercise: jest.fn().mockImplementation(
      async ({ replacement }: { replacement: unknown }) =>
        new WorkoutSession({
          ...current,
          replacements: [...current.replacements, replacement as never],
        }),
    ),
  };
  const subject = new ReplaceWorkoutExerciseUseCase(
    {
      findByAuthUserId: jest.fn().mockResolvedValue({ id: 'profile-1' }),
    } as never,
    {
      findById: jest.fn().mockResolvedValue({
        id: 'plan-1',
        weeklySchedule: [
          {
            dayIndex: 0,
            focus: 'strength',
            format: 'strength',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: '8', restSeconds: 60 },
            ],
          },
        ],
      }),
    } as never,
    sessions as never,
  );
  return { subject, sessions };
}

const input = {
  authUserId: 'auth-1',
  sessionId,
  exerciseIndex: 0,
  currentExerciseName: 'Bench Press',
  replacementExercise: { name: 'Push Up', sets: 3, reps: '8', restSeconds: 60 },
  reason: 'no_equipment' as const,
  idempotencyKey: 'replacement-1',
};

describe('ReplaceWorkoutExerciseUseCase', () => {
  it('persists a valid replacement with the session scope', async () => {
    const { subject, sessions } = makeSubject();

    const result = await subject.execute(input);

    expect(sessions.replaceExercise).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId }),
    );
    expect(result.workoutSession.replacements[0]).toMatchObject({
      exerciseIndex: 0,
      replacementExercise: input.replacementExercise,
    });
  });

  it('rejects an alternative outside the compatible catalog', async () => {
    const { subject } = makeSubject();

    await expect(
      subject.execute({
        ...input,
        replacementExercise: {
          ...input.replacementExercise,
          name: 'Unknown Exercise',
        },
      }),
    ).rejects.toMatchObject({
      code: REPLACE_WORKOUT_EXERCISE_ERROR_CODES.INVALID_ALTERNATIVE,
    });
  });

  it('rejects a completed session', async () => {
    const { subject } = makeSubject(session({ status: 'completed' }));

    await expect(subject.execute(input)).rejects.toMatchObject({
      code: REPLACE_WORKOUT_EXERCISE_ERROR_CODES.SESSION_COMPLETED,
    });
  });

  it('returns the existing replacement for the same idempotency key', async () => {
    const existing = session({
      replacements: [
        {
          exerciseIndex: 0,
          originalExercise: {
            name: 'Bench Press',
            sets: 3,
            reps: '8',
            restSeconds: 60,
          },
          replacementExercise: input.replacementExercise,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey,
          replacedAt: new Date(),
        },
      ],
    });
    const { subject, sessions } = makeSubject(existing);

    const result = await subject.execute(input);

    expect(result.workoutSession).toBe(existing);
    expect(sessions.replaceExercise).not.toHaveBeenCalled();
  });
});
