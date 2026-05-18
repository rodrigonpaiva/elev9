import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { WorkoutLogRepository } from '../../../domain/repositories/workout-log.repository';
import {
  GET_WORKOUT_HISTORY_ERROR_CODES,
  GetWorkoutHistoryError,
} from './get-workout-history.errors';
import { GetWorkoutHistoryUseCase } from './get-workout-history.use-case';

describe('GetWorkoutHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let useCase: GetWorkoutHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    fitnessProfileRepository = {
      findActiveByUserProfileId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<FitnessProfileRepository>;
    trainingPlanRepository = {
      findById: jest.fn(),
      findActiveByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<TrainingPlanRepository>;
    workoutLogRepository = {
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<WorkoutLogRepository>;

    useCase = new GetWorkoutHistoryUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
    );
  });

  it('returns ordered workout history successfully', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo',
      birthDate: undefined,
      gender: undefined,
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'fitness_profile_123',
      userProfileId: 'user_profile_123',
      heightCm: 180,
      weightKg: 80,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: { daysPerWeek: 4, minutesPerSession: 60 },
      limitations: [],
      status: 'active',
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue({
      id: 'training_plan_123',
      fitnessProfileId: 'fitness_profile_123',
      goal: 'gain_muscle',
      activityLevel: 'medium',
      weeklySchedule: [],
      status: 'active',
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([
      {
        id: 'log_123',
        trainingPlanId: 'training_plan_123',
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
        feedback: { difficulty: 'medium', notes: 'Good' },
        date: '2026-05-01',
        createdAt: new Date('2026-05-01T12:00:00.000Z'),
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
      },
    ]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
    });

    expect(
      workoutLogRepository.findByTrainingPlanIdsOrdered,
    ).toHaveBeenCalledWith({
      trainingPlanIds: ['training_plan_123'],
      limit: 20,
    });
    expect(result).toEqual({
      workoutLogs: [
        {
          id: 'log_123',
          trainingPlanId: 'training_plan_123',
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [{ name: 'push_up', setsDone: 4, repsDone: 12 }],
          feedback: { difficulty: 'medium', notes: 'Good' },
          date: '2026-05-01',
          createdAt: '2026-05-01T12:00:00.000Z',
        },
      ],
    });
  });

  it('returns empty array when no active training plan exists', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo',
      birthDate: undefined,
      gender: undefined,
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'fitness_profile_123',
      userProfileId: 'user_profile_123',
      heightCm: 180,
      weightKg: 80,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: { daysPerWeek: 4, minutesPerSession: 60 },
      limitations: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 10,
    });

    expect(result).toEqual({ workoutLogs: [] });
    expect(
      workoutLogRepository.findByTrainingPlanIdsOrdered,
    ).not.toHaveBeenCalled();
  });

  it('returns empty array when no workout logs exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo',
      birthDate: undefined,
      gender: undefined,
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue({
      id: 'fitness_profile_123',
      userProfileId: 'user_profile_123',
      heightCm: 180,
      weightKg: 80,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: { daysPerWeek: 4, minutesPerSession: 60 },
      limitations: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue({
      id: 'training_plan_123',
      fitnessProfileId: 'fitness_profile_123',
      goal: 'gain_muscle',
      activityLevel: 'medium',
      weeklySchedule: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    workoutLogRepository.findByTrainingPlanIdsOrdered.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      limit: 5,
    });

    expect(result).toEqual({ workoutLogs: [] });
  });

  it('throws USER_PROFILE_NOT_FOUND when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_WORKOUT_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('throws FITNESS_PROFILE_NOT_FOUND when active fitness profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo',
      birthDate: undefined,
      gender: undefined,
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_WORKOUT_HISTORY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it('throws INVALID_INPUT when limit is greater than 50', async () => {
    await expect(
      useCase.execute({ authUserId: 'auth_user_123', limit: 51 }),
    ).rejects.toMatchObject({
      code: GET_WORKOUT_HISTORY_ERROR_CODES.INVALID_INPUT,
    });
  });

  it('maps unexpected repository failures to INTERNAL_ERROR', async () => {
    userProfileRepository.findByAuthUserId.mockRejectedValue(
      new Error('database failed'),
    );

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toEqual(
      new GetWorkoutHistoryError(
        GET_WORKOUT_HISTORY_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      ),
    );
  });
});
