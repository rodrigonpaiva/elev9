import { FitnessProfile } from "../../../../fitness/domain/entities/fitness-profile.entity";
import { FitnessProfileRepository } from "../../../../fitness/domain/repositories/fitness-profile.repository";
import { DailyCheckIn } from "../../../../progress/domain/entities/daily-check-in.entity";
import { DailyCheckInRepository } from "../../../../progress/domain/repositories/daily-check-in.repository";
import { WorkoutLog } from "../../../../progress/domain/entities/workout-log.entity";
import { WorkoutLogRepository } from "../../../../progress/domain/repositories/workout-log.repository";
import { Clock } from "../../../../progress/domain/services/clock.service";
import { TrainingPlan } from "../../../../training/domain/entities/training-plan.entity";
import { TrainingPlanRepository } from "../../../../training/domain/repositories/training-plan.repository";
import { UserProfile } from "../../../../users/domain/entities/user-profile.entity";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import { BuildUserHealthContextService } from "../../../../ai/application/services/context-builder/build-user-health-context.service";
import {
  GET_HOME_DASHBOARD_ERROR_CODES,
} from "./get-home-dashboard.errors";
import { GetHomeDashboardUseCase } from "./get-home-dashboard.use-case";

describe("GetHomeDashboardUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let clock: jest.Mocked<Clock>;
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService["build"]>;
  };
  let useCase: GetHomeDashboardUseCase;

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
    dailyCheckInRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn().mockResolvedValue([]),
    };
    clock = {
      now: jest.fn().mockReturnValue(new Date("2026-04-30T10:00:00.000Z")),
      todayUtcDateString: jest.fn().mockReturnValue("2026-04-30"),
    };
    buildUserHealthContextService = {
      build: jest.fn().mockResolvedValue({
        authUserId: "auth_user_123",
        userProfileId: "profile_123",
        userName: "Rodrigo Paiva",
        goal: "gain_muscle",
        activityLevel: "high",
        weeklyFrequency: 4,
        adherenceScore: 0,
        currentStreak: 0,
        averageWorkoutDuration: 0,
        fatigueLevel: "MODERATE",
        availableEquipment: [],
        limitations: [],
        todayWorkout: null,
        recentWorkoutLogs: [],
        generatedAt: new Date("2026-04-30T10:00:00.000Z"),
      }),
    };

    useCase = new GetHomeDashboardUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      dailyCheckInRepository,
      clock,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
    );
  });

  function mockUserProfile(): void {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "auth_user_123",
        name: "Rodrigo Paiva",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  }

  function mockFitnessProfile(): void {
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: "fitness_123",
        userProfileId: "profile_123",
        heightCm: 180,
        weightKg: 82.5,
        goal: "gain_muscle",
        activityLevel: "high",
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  }

  function mockTrainingPlan(weeklySchedule?: TrainingPlan["weeklySchedule"]): void {
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "high",
        weeklySchedule: weeklySchedule ?? [
          {
            dayIndex: 4,
            title: "Upper Body Strength",
            focus: "upper_body_strength",
            format: "strength",
            intensity: "high",
            exercises: [
              { name: "push_up", sets: 4, reps: "8-12", restSeconds: 90 },
            ],
          },
        ],
        status: "active",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      }),
    );
  }

  function mockDailyCheckInHistory(
    entries: Array<{
      id: string;
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
      createdAt: string;
    }>,
  ): void {
    dailyCheckInRepository.findManyByUserProfileId.mockResolvedValue(
      entries.map(
        (entry) =>
          new DailyCheckIn({
            id: entry.id,
            userProfileId: "profile_123",
            energyLevel: entry.energyLevel,
            sleepQuality: entry.sleepQuality,
            muscleSoreness: entry.muscleSoreness,
            motivationLevel: entry.motivationLevel,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.createdAt),
          }),
      ),
    );
  }

  it("returns fitnessProfile and trainingPlan as null when no active fitness profile exists", async () => {
    mockUserProfile();
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result).toEqual({
      dashboard: {
        user: {
          name: "Rodrigo Paiva",
        },
        fitnessProfile: null,
        trainingPlan: null,
        progressSummary: {
          period: "week",
          workoutsCompleted: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          lastWorkoutDate: null,
        },
        recovery: {
          fatigueLevel: "MODERATE",
          recommendedIntensity: "medium",
          recoveryTrend: "stable",
        },
      },
    });
    expect(trainingPlanRepository.findActiveByFitnessProfileId).not.toHaveBeenCalled();
    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).not.toHaveBeenCalled();
  });

  it("returns trainingPlan as null and zero summary when no active training plan exists", async () => {
    mockUserProfile();
    mockFitnessProfile();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.dashboard.trainingPlan).toBeNull();
    expect(result.dashboard.progressSummary).toEqual({
      period: "week",
      workoutsCompleted: 0,
      totalDurationMinutes: 0,
      averageDurationMinutes: 0,
      lastWorkoutDate: null,
    });
    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: "MODERATE",
      recommendedIntensity: "medium",
      recoveryTrend: "stable",
    });
    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).not.toHaveBeenCalled();
  });

  it("returns todayWorkout when the UTC weekday matches weeklySchedule.dayIndex", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.dashboard.trainingPlan).toEqual({
      id: "training_123",
      todayWorkout: {
        dayIndex: 4,
        title: "Upper Body Strength",
        focus: "upper_body_strength",
        format: "strength",
        intensity: "high",
        exercises: [
          { name: "push_up", sets: 4, reps: "8-12", restSeconds: 90 },
        ],
      },
    });
  });

  it("returns todayWorkout as null when weeklySchedule does not contain the current UTC day", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan([
      {
        dayIndex: 1,
        title: "Upper Body Strength",
        focus: "upper_body_strength",
        format: "strength",
        intensity: "high",
        exercises: [
          { name: "push_up", sets: 4, reps: "8-12", restSeconds: 90 },
        ],
      },
    ]);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.dashboard.trainingPlan).toEqual({
      id: "training_123",
      todayWorkout: null,
    });
  });

  it("builds the weekly summary correctly", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      new WorkoutLog({
        id: "log_1",
        trainingPlanId: "training_123",
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [],
        date: "2026-04-29",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new WorkoutLog({
        id: "log_2",
        trainingPlanId: "training_123",
        workoutDayIndex: 4,
        durationMinutes: 50,
        completedExercises: [],
        date: "2026-04-30",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.dashboard.progressSummary).toEqual({
      period: "week",
      workoutsCompleted: 2,
      totalDurationMinutes: 95,
      averageDurationMinutes: 47.5,
      lastWorkoutDate: "2026-04-30",
    });
    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: "MODERATE",
      recommendedIntensity: "medium",
      recoveryTrend: "stable",
    });
  });

  it("isolates the summary by authenticated user's training plan id", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);

    await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).toHaveBeenCalledWith({
      trainingPlanIds: ["training_123"],
      startDate: "2026-04-24",
      endDate: "2026-04-30",
    });
  });

  it("returns USER_PROFILE_NOT_FOUND when the session user has no user profile", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toMatchObject({
      code: GET_HOME_DASHBOARD_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it("returns recovery with HIGH fatigue mapped to low intensity", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      adherenceScore: 0,
      currentStreak: 6,
      averageWorkoutDuration: 80,
      fatigueLevel: "HIGH",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-04-30T10:00:00.000Z"),
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: new Date("2026-04-30T09:00:00.000Z"),
      },
    });

    const result = await useCase.execute({ authUserId: "auth_user_123" });

    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: "HIGH",
      recommendedIntensity: "low",
      recoveryTrend: "stable",
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: "2026-04-30T09:00:00.000Z",
      },
    });
  });

  it("returns recovery with LOW fatigue mapped to normal intensity", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      adherenceScore: 0,
      currentStreak: 3,
      averageWorkoutDuration: 40,
      fatigueLevel: "LOW",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-04-30T10:00:00.000Z"),
      latestCheckIn: undefined,
    });

    const result = await useCase.execute({ authUserId: "auth_user_123" });

    expect(result.dashboard.recovery).toEqual({
      fatigueLevel: "LOW",
      recommendedIntensity: "normal",
      recoveryTrend: "stable",
    });
  });

  it("returns improving recovery trend with positive recent check-in signals", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    mockDailyCheckInHistory([
      {
        id: "check_in_3",
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: "2026-04-30T09:00:00.000Z",
      },
      {
        id: "check_in_2",
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: "2026-04-29T09:00:00.000Z",
      },
      {
        id: "check_in_1",
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: "2026-04-28T09:00:00.000Z",
      },
    ]);

    const result = await useCase.execute({ authUserId: "auth_user_123" });

    expect(result.dashboard.recovery.recoveryTrend).toBe("improving");
  });

  it("returns needs_recovery trend with negative recent check-in signals", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    mockDailyCheckInHistory([
      {
        id: "check_in_3",
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 2,
        createdAt: "2026-04-30T09:00:00.000Z",
      },
      {
        id: "check_in_2",
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
        createdAt: "2026-04-29T09:00:00.000Z",
      },
      {
        id: "check_in_1",
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: "2026-04-28T09:00:00.000Z",
      },
    ]);

    const result = await useCase.execute({ authUserId: "auth_user_123" });

    expect(result.dashboard.recovery.recoveryTrend).toBe("needs_recovery");
  });

  it("returns stable recovery trend with mixed recent check-in signals", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    mockDailyCheckInHistory([
      {
        id: "check_in_3",
        energyLevel: 4,
        sleepQuality: 2,
        muscleSoreness: 2,
        motivationLevel: 3,
        createdAt: "2026-04-30T09:00:00.000Z",
      },
      {
        id: "check_in_2",
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
        createdAt: "2026-04-29T09:00:00.000Z",
      },
      {
        id: "check_in_1",
        energyLevel: 2,
        sleepQuality: 4,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: "2026-04-28T09:00:00.000Z",
      },
    ]);

    const result = await useCase.execute({ authUserId: "auth_user_123" });

    expect(result.dashboard.recovery.recoveryTrend).toBe("stable");
  });

  it("returns stable recovery trend when there are fewer than three check-ins", async () => {
    mockUserProfile();
    mockFitnessProfile();
    mockTrainingPlan();
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);
    mockDailyCheckInHistory([
      {
        id: "check_in_2",
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 2,
        motivationLevel: 4,
        createdAt: "2026-04-30T09:00:00.000Z",
      },
      {
        id: "check_in_1",
        energyLevel: 3,
        sleepQuality: 3,
        muscleSoreness: 3,
        motivationLevel: 3,
        createdAt: "2026-04-29T09:00:00.000Z",
      },
    ]);

    const result = await useCase.execute({ authUserId: "auth_user_123" });

    expect(result.dashboard.recovery.recoveryTrend).toBe("stable");
  });
});
