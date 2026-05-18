import { FitnessProfile } from '../../../../fitness/domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { TrainingPlan } from '../../../../training/domain/entities/training-plan.entity';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { WorkoutLog } from '../../../domain/entities/workout-log.entity';
import { WorkoutLogRepository } from '../../../domain/repositories/workout-log.repository';
import { Clock } from '../../../domain/services/clock.service';
import { LOG_WORKOUT_ERROR_CODES } from './log-workout.errors';
import { LogWorkoutUseCase } from './log-workout.use-case';

describe('LogWorkoutUseCase', () => {
  const validTrainingPlanId = '507f1f77bcf86cd799439011';
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let clock: jest.Mocked<Clock>;
  let useCase: LogWorkoutUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };

    fitnessProfileRepository = {
      findById: jest.fn(),
      findActiveByUserProfileId: jest.fn(),
      create: jest.fn(),
    };

    trainingPlanRepository = {
      findById: jest.fn(),
      findActiveByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    };

    workoutLogRepository = {
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      create: jest.fn(),
    };

    clock = {
      now: jest.fn().mockReturnValue(new Date('2026-04-30T10:00:00.000Z')),
      todayUtcDateString: jest.fn().mockReturnValue('2026-04-30'),
    };

    useCase = new LogWorkoutUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      clock,
    );
  });

  it('creates a workout log successfully', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 180,
        weightKg: 82,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    trainingPlanRepository.findById.mockResolvedValue(
      new TrainingPlan({
        id: validTrainingPlanId,
        fitnessProfileId: 'fitness_123',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklySchedule: [
          {
            dayIndex: 1,
            title: 'Upper Body Strength',
            focus: 'upper_body_strength',
            format: 'strength',
            intensity: 'high',
            exercises: [],
          },
        ],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    workoutLogRepository.findByTrainingPlanDayAndDate.mockResolvedValue(null);
    workoutLogRepository.create.mockResolvedValue(
      new WorkoutLog({
        id: 'log_123',
        trainingPlanId: validTrainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
        feedback: {
          difficulty: 'medium',
          notes: 'Good session',
        },
        date: '2026-04-30',
        createdAt: new Date('2026-04-30T10:00:00.000Z'),
        updatedAt: new Date('2026-04-30T10:00:00.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      trainingPlanId: validTrainingPlanId,
      workoutDayIndex: 1,
      durationMinutes: 45,
      completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
      feedback: {
        difficulty: 'medium',
        notes: 'Good session',
      },
    });

    expect(result.workoutLog.date).toBe('2026-04-30');
  });

  it('returns TRAINING_PLAN_NOT_FOUND for invalid ownership', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 180,
        weightKg: 82,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    trainingPlanRepository.findById.mockResolvedValue(
      new TrainingPlan({
        id: validTrainingPlanId,
        fitnessProfileId: 'fitness_other',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklySchedule: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        trainingPlanId: validTrainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
      }),
    ).rejects.toMatchObject({
      code: LOG_WORKOUT_ERROR_CODES.TRAINING_PLAN_NOT_FOUND,
    });
  });

  it('returns WORKOUT_LOG_INVALID_INPUT for invalid workoutDayIndex', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: 'fitness_123',
        userProfileId: 'profile_123',
        heightCm: 180,
        weightKg: 82,
        goal: 'gain_muscle',
        activityLevel: 'medium',
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    trainingPlanRepository.findById.mockResolvedValue(
      new TrainingPlan({
        id: validTrainingPlanId,
        fitnessProfileId: 'fitness_123',
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklySchedule: [
          {
            dayIndex: 1,
            title: 'Upper Body Strength',
            focus: 'upper_body_strength',
            format: 'strength',
            intensity: 'high',
            exercises: [],
          },
        ],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        trainingPlanId: validTrainingPlanId,
        workoutDayIndex: 2,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
      }),
    ).rejects.toMatchObject({
      code: LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
    });
  });

  it('returns WORKOUT_LOG_INVALID_INPUT for invalid payload', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        trainingPlanId: validTrainingPlanId,
        workoutDayIndex: 1,
        durationMinutes: 0,
        completedExercises: [],
      }),
    ).rejects.toMatchObject({
      code: LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
    });
  });
});
