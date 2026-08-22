import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { WorkoutLog } from '../../../domain/entities/workout-log.entity';
import { WorkoutSession } from '../../../domain/entities/workout-session.entity';
import { CompleteWorkoutUseCase } from './complete-workout.use-case';
import { COMPLETE_WORKOUT_ERROR_CODES } from './complete-workout.errors';

const sessionId = '507f1f77bcf86cd799439011';

function buildSession(status: 'active' | 'completed' = 'active') {
  return new WorkoutSession({
    id: sessionId,
    userProfileId: 'profile-1',
    trainingPlanId: 'plan-1',
    workoutDayIndex: 1,
    date: '2026-04-30',
    status,
    startedAt: new Date('2026-04-30T09:00:00.000Z'),
    updatedAt: new Date('2026-04-30T09:00:00.000Z'),
  });
}

function buildSubject(session = buildSession()) {
  const sessionRepository = {
    findById: jest.fn().mockResolvedValue(session),
    complete: jest.fn().mockResolvedValue(
      new WorkoutSession({
        ...session,
        status: 'completed',
        completedAt: new Date(),
      }),
    ),
  };
  const logRepository = {
    findByTrainingPlanDayAndDate: jest.fn(),
  };
  const useCase = new CompleteWorkoutUseCase(
    {
      findByAuthUserId: jest.fn().mockResolvedValue(
        new UserProfile({
          id: 'profile-1',
          authUserId: 'auth-1',
          name: 'Test User',
          language: 'en-US',
          timezone: 'UTC',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    } as never,
    sessionRepository as never,
    {
      now: jest.fn().mockReturnValue(new Date('2026-04-30T10:00:00.000Z')),
      todayUtcDateString: jest.fn().mockReturnValue('2026-04-30'),
    } as never,
    logRepository as never,
  );
  return { useCase, sessionRepository, logRepository };
}

const log = new WorkoutLog({
  id: 'log-1',
  trainingPlanId: 'plan-1',
  workoutDayIndex: 1,
  durationMinutes: 30,
  completedExercises: [{ name: 'Push Up', setsDone: 3, repsDone: 10 }],
  date: '2026-04-30',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CompleteWorkoutUseCase reconciliation', () => {
  it('does not complete a session while its workout log is missing', async () => {
    const { useCase, sessionRepository, logRepository } = buildSubject();
    logRepository.findByTrainingPlanDayAndDate.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth-1', sessionId }),
    ).rejects.toMatchObject({
      code: COMPLETE_WORKOUT_ERROR_CODES.WORKOUT_LOG_REQUIRED,
    });
    expect(sessionRepository.complete).not.toHaveBeenCalled();
  });

  it('completes only after the log is confirmed', async () => {
    const { useCase, sessionRepository, logRepository } = buildSubject();
    logRepository.findByTrainingPlanDayAndDate.mockResolvedValue(log);

    await useCase.execute({ authUserId: 'auth-1', sessionId });

    expect(sessionRepository.complete).toHaveBeenCalledWith(
      sessionId,
      expect.any(Date),
    );
  });

  it('keeps repeated completion idempotent after confirmation', async () => {
    const { useCase, sessionRepository } = buildSubject(
      buildSession('completed'),
    );

    const result = await useCase.execute({ authUserId: 'auth-1', sessionId });

    expect(result.workoutSession.status).toBe('completed');
    expect(sessionRepository.complete).not.toHaveBeenCalled();
  });

  it('returns SESSION_EXPIRED before requiring a workout log', async () => {
    const expiredSession = new WorkoutSession({
      ...buildSession(),
      date: '2026-04-29',
    });
    const { useCase, sessionRepository, logRepository } =
      buildSubject(expiredSession);

    await expect(
      useCase.execute({ authUserId: 'auth-1', sessionId }),
    ).rejects.toMatchObject({
      code: COMPLETE_WORKOUT_ERROR_CODES.SESSION_EXPIRED,
    });
    expect(logRepository.findByTrainingPlanDayAndDate).not.toHaveBeenCalled();
    expect(sessionRepository.complete).not.toHaveBeenCalled();
  });
});
