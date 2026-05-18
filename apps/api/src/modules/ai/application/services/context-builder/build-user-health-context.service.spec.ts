import {
  FitnessProfile,
  FitnessProfileLimitation,
} from '../../../../fitness/domain/entities/fitness-profile.entity';
import { FitnessProfileRepository } from '../../../../fitness/domain/repositories/fitness-profile.repository';
import { NutritionProfile } from '../../../../nutrition/domain/entities/nutrition-profile.entity';
import { NutritionProfileRepository } from '../../../../nutrition/domain/repositories/nutrition-profile.repository';
import { DailyCheckIn } from '../../../../progress/domain/entities/daily-check-in.entity';
import { DailyCheckInRepository } from '../../../../progress/domain/repositories/daily-check-in.repository';
import { WorkoutLog } from '../../../../progress/domain/entities/workout-log.entity';
import { WorkoutLogRepository } from '../../../../progress/domain/repositories/workout-log.repository';
import { Clock } from '../../../../progress/domain/services/clock.service';
import { TrainingPlan } from '../../../../training/domain/entities/training-plan.entity';
import { TrainingPlanRepository } from '../../../../training/domain/repositories/training-plan.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { BuildUserHealthContextService } from './build-user-health-context.service';

describe('BuildUserHealthContextService', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let nutritionProfileRepository: jest.Mocked<NutritionProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let clock: jest.Mocked<Clock>;
  let service: BuildUserHealthContextService;

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
    nutritionProfileRepository = {
      findActiveByUserProfileId: jest.fn().mockResolvedValue(null),
      upsertByUserProfileId: jest.fn(),
    };
    trainingPlanRepository = {
      findById: jest.fn(),
      findActiveByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    };
    dailyCheckInRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn().mockResolvedValue(null),
      findManyByUserProfileId: jest.fn(),
    };
    workoutLogRepository = {
      findByTrainingPlanDayAndDate: jest.fn(),
      findByTrainingPlanIdsOrdered: jest.fn(),
      findByTrainingPlanIdsAndDateRange: jest.fn(),
      create: jest.fn(),
    };
    clock = {
      now: jest.fn().mockReturnValue(new Date('2026-05-04T10:00:00.000Z')),
      todayUtcDateString: jest.fn().mockReturnValue('2026-05-04'),
    };

    service = new BuildUserHealthContextService(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      dailyCheckInRepository,
      workoutLogRepository,
      nutritionProfileRepository,
      clock,
    );
  });

  it('builds a context with complete user data', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository, [
      buildLimitation('knee_pain', 'medium'),
    ]);
    mockTrainingPlan(trainingPlanRepository);
    dailyCheckInRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDailyCheckIn('2026-05-04T09:00:00.000Z'),
    );
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionProfile(),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
      buildWorkoutLog('2026-05-04', 50, '2026-05-04T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(
      workoutLogRepository.findByTrainingPlanIdsAndDateRange,
    ).toHaveBeenCalledWith({
      trainingPlanIds: ['training_123'],
      startDate: '2026-04-28',
      endDate: '2026-05-04',
    });
    expect(result).toMatchObject({
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      userName: 'Rodrigo Paiva',
      goal: 'gain_muscle',
      activityLevel: 'medium',
      weeklyFrequency: 4,
      adherenceScore: 75,
      currentStreak: 3,
      averageWorkoutDuration: 41.67,
      fatigueLevel: 'MODERATE',
      activeTrainingPlanId: 'training_123',
      limitations: [
        {
          type: 'knee_pain',
          severity: 'medium',
        },
      ],
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
        createdAt: new Date('2026-05-04T09:00:00.000Z'),
      },
      nutritionProfile: {
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: ['rice', 'eggs'],
      },
      todayWorkout: {
        dayIndex: 1,
        title: 'Upper Body Strength',
      },
    });
    expect(result.recentWorkoutLogs).toHaveLength(3);
    expect(result.availableEquipment).toEqual([]);
  });

  it('returns a partial context when only user data exists', async () => {
    mockUserProfile(userProfileRepository);
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(
      trainingPlanRepository.findActiveByFitnessProfileId,
    ).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      userName: 'Rodrigo Paiva',
      adherenceScore: 0,
      currentStreak: 0,
      averageWorkoutDuration: 0,
      fatigueLevel: 'MODERATE',
      todayWorkout: null,
      recentWorkoutLogs: [],
      limitations: [],
      availableEquipment: [],
    });
    expect(result.goal).toBeUndefined();
    expect(result.weeklyFrequency).toBeUndefined();
    expect(result.latestCheckIn).toBeUndefined();
    expect(result.nutritionProfile).toBeUndefined();
  });

  it('includes nutritionProfile when one exists', async () => {
    mockUserProfile(userProfileRepository);
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      buildNutritionProfile({
        goal: 'fat_loss',
        mealsPerDay: 3,
        preferredFoods: ['oats'],
      }),
    );

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(
      nutritionProfileRepository.findActiveByUserProfileId,
    ).toHaveBeenCalledWith('profile_123');
    expect(result.nutritionProfile).toEqual({
      goal: 'fat_loss',
      mealsPerDay: 3,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: ['oats'],
    });
  });

  it('works safely without nutritionProfile', async () => {
    mockUserProfile(userProfileRepository);
    nutritionProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      null,
    );

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.nutritionProfile).toBeUndefined();
  });

  it('returns a safe context when there is no active training plan', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository, [
      buildLimitation('shoulder_sensitivity', 'low'),
    ]);
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(
      workoutLogRepository.findByTrainingPlanIdsAndDateRange,
    ).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      goal: 'gain_muscle',
      activityLevel: 'medium',
      weeklyFrequency: 4,
      adherenceScore: 0,
      currentStreak: 0,
      averageWorkoutDuration: 0,
      fatigueLevel: 'MODERATE',
      todayWorkout: null,
      recentWorkoutLogs: [],
      limitations: [
        {
          type: 'shoulder_sensitivity',
          severity: 'low',
        },
      ],
    });
  });

  it('falls back safely when there is not enough progress data', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue(
      [],
    );

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result).toMatchObject({
      authUserId: 'auth_user_123',
      activeTrainingPlanId: 'training_123',
      adherenceScore: 0,
      currentStreak: 0,
      averageWorkoutDuration: 0,
      fatigueLevel: 'MODERATE',
      todayWorkout: {
        dayIndex: 1,
        title: 'Upper Body Strength',
      },
      recentWorkoutLogs: [],
    });
    expect(result.latestCheckIn).toBeUndefined();
  });

  it('includes latestCheckIn when the user has a recent check-in', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    dailyCheckInRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDailyCheckIn('2026-05-04T09:00:00.000Z'),
    );

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(
      dailyCheckInRepository.findLatestByUserProfileId,
    ).toHaveBeenCalledWith('profile_123');
    expect(result.latestCheckIn).toEqual({
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
      createdAt: new Date('2026-05-04T09:00:00.000Z'),
    });
  });

  it('returns HIGH when current streak is 6 or more', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-04-29', 40, '2026-04-29T08:00:00.000Z'),
      buildWorkoutLog('2026-04-30', 40, '2026-04-30T08:00:00.000Z'),
      buildWorkoutLog('2026-05-01', 40, '2026-05-01T08:00:00.000Z'),
      buildWorkoutLog('2026-05-02', 40, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
      buildWorkoutLog('2026-05-04', 40, '2026-05-04T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('HIGH');
    expect(result.currentStreak).toBe(6);
  });

  it('returns HIGH when energy level is 2 or lower', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    dailyCheckInRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDailyCheckIn('2026-05-04T09:00:00.000Z', {
        energyLevel: 2,
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('HIGH');
    expect(result.latestCheckIn?.energyLevel).toBe(2);
  });

  it('returns HIGH when sleep quality is 2 or lower', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    dailyCheckInRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDailyCheckIn('2026-05-04T09:00:00.000Z', {
        sleepQuality: 2,
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('HIGH');
    expect(result.latestCheckIn?.sleepQuality).toBe(2);
  });

  it('returns HIGH when muscle soreness is 4 or higher', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    dailyCheckInRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDailyCheckIn('2026-05-04T09:00:00.000Z', {
        muscleSoreness: 4,
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('HIGH');
    expect(result.latestCheckIn?.muscleSoreness).toBe(4);
  });

  it('returns HIGH when average workout duration is very high', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 80, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 90, '2026-05-03T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('HIGH');
    expect(result.averageWorkoutDuration).toBe(85);
  });

  it('returns LOW when consistency is healthy and duration is controlled', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
      buildWorkoutLog('2026-05-04', 45, '2026-05-04T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('LOW');
    expect(result.currentStreak).toBe(3);
    expect(result.averageWorkoutDuration).toBe(40);
  });

  it('returns LOW when the latest check-in indicates good recovery', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    dailyCheckInRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDailyCheckIn('2026-05-04T09:00:00.000Z', {
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 2,
        motivationLevel: 5,
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 50, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 55, '2026-05-03T08:00:00.000Z'),
      buildWorkoutLog('2026-05-04', 60, '2026-05-04T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('LOW');
    expect(result.latestCheckIn).toEqual({
      energyLevel: 4,
      sleepQuality: 4,
      muscleSoreness: 2,
      motivationLevel: 5,
      createdAt: new Date('2026-05-04T09:00:00.000Z'),
    });
  });

  it('falls back to the previous heuristic when there is no latest check-in', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
      buildWorkoutLog('2026-05-04', 45, '2026-05-04T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('LOW');
    expect(result.latestCheckIn).toBeUndefined();
  });

  it('returns MODERATE when the latest check-in does not clearly indicate low or high fatigue', async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    dailyCheckInRepository.findLatestByUserProfileId.mockResolvedValue(
      buildDailyCheckIn('2026-05-04T09:00:00.000Z', {
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog('2026-05-02', 35, '2026-05-02T08:00:00.000Z'),
      buildWorkoutLog('2026-05-03', 40, '2026-05-03T08:00:00.000Z'),
    ]);

    const result = await service.build({
      authUserId: 'auth_user_123',
    });

    expect(result.fatigueLevel).toBe('MODERATE');
    expect(result.latestCheckIn).toEqual({
      energyLevel: 3,
      sleepQuality: 3,
      muscleSoreness: 3,
      motivationLevel: 3,
      createdAt: new Date('2026-05-04T09:00:00.000Z'),
    });
  });
});

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
  userProfileRepository.findByAuthUserId.mockResolvedValue(
    new UserProfile({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo Paiva',
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
      updatedAt: new Date('2026-04-01T10:00:00.000Z'),
    }),
  );
}

function mockFitnessProfile(
  fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>,
  limitations: FitnessProfileLimitation[] = [],
): void {
  fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
    new FitnessProfile({
      id: 'fitness_123',
      userProfileId: 'profile_123',
      heightCm: 178,
      weightKg: 76,
      goal: 'gain_muscle',
      activityLevel: 'medium',
      trainingAvailability: {
        daysPerWeek: 4,
        minutesPerSession: 50,
      },
      limitations,
      status: 'active',
      createdAt: new Date('2026-04-02T10:00:00.000Z'),
      updatedAt: new Date('2026-04-02T10:00:00.000Z'),
    }),
  );
}

function mockTrainingPlan(
  trainingPlanRepository: jest.Mocked<TrainingPlanRepository>,
): void {
  trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
    new TrainingPlan({
      id: 'training_123',
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
          exercises: [
            {
              name: 'push_up',
              sets: 4,
              reps: '8-12',
              restSeconds: 90,
            },
          ],
        },
      ],
      status: 'active',
      createdAt: new Date('2026-04-03T10:00:00.000Z'),
      updatedAt: new Date('2026-04-03T10:00:00.000Z'),
    }),
  );
}

function buildWorkoutLog(
  date: string,
  durationMinutes: number,
  createdAt = `${date}T10:00:00.000Z`,
): WorkoutLog {
  return new WorkoutLog({
    id: `${date}-${durationMinutes}`,
    trainingPlanId: 'training_123',
    workoutDayIndex: 1,
    durationMinutes,
    completedExercises: [],
    date,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });
}

function buildLimitation(
  type: string,
  severity: FitnessProfileLimitation['severity'],
): FitnessProfileLimitation {
  return {
    type,
    severity,
  };
}

function buildDailyCheckIn(
  createdAt: string,
  overrides?: Partial<{
    energyLevel: number;
    sleepQuality: number;
    muscleSoreness: number;
    motivationLevel: number;
  }>,
): DailyCheckIn {
  return new DailyCheckIn({
    id: `daily-check-in-${createdAt}`,
    userProfileId: 'profile_123',
    energyLevel: overrides?.energyLevel ?? 4,
    sleepQuality: overrides?.sleepQuality ?? 3,
    muscleSoreness: overrides?.muscleSoreness ?? 2,
    motivationLevel: overrides?.motivationLevel ?? 5,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });
}

function buildNutritionProfile(
  overrides: Partial<{
    goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
    mealsPerDay: number;
    dietaryRestrictions: string[];
    allergies: string[];
    dislikedFoods: string[];
    preferredFoods: string[];
  }> = {},
): NutritionProfile {
  return new NutritionProfile({
    id: 'nutrition_123',
    userProfileId: 'profile_123',
    goal: overrides.goal ?? 'muscle_gain',
    mealsPerDay: overrides.mealsPerDay ?? 4,
    dietaryRestrictions: overrides.dietaryRestrictions ?? [],
    allergies: overrides.allergies ?? [],
    dislikedFoods: overrides.dislikedFoods ?? [],
    preferredFoods: overrides.preferredFoods ?? ['rice', 'eggs'],
    status: 'active',
    createdAt: new Date('2026-05-04T09:30:00.000Z'),
    updatedAt: new Date('2026-05-04T09:30:00.000Z'),
  });
}
