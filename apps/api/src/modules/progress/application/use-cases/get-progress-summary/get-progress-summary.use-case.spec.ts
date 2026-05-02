import { FitnessProfile } from "../../../../fitness/domain/entities/fitness-profile.entity";
import { FitnessProfileRepository } from "../../../../fitness/domain/repositories/fitness-profile.repository";
import { TrainingPlan } from "../../../../training/domain/entities/training-plan.entity";
import { TrainingPlanRepository } from "../../../../training/domain/repositories/training-plan.repository";
import { UserProfile } from "../../../../users/domain/entities/user-profile.entity";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import { WorkoutLog } from "../../../domain/entities/workout-log.entity";
import { WorkoutLogRepository } from "../../../domain/repositories/workout-log.repository";
import { Clock } from "../../../domain/services/clock.service";
import {
  GET_PROGRESS_SUMMARY_ERROR_CODES,
} from "./get-progress-summary.errors";
import { GetProgressSummaryUseCase } from "./get-progress-summary.use-case";

describe("GetProgressSummaryUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let clock: jest.Mocked<Clock>;
  let useCase: GetProgressSummaryUseCase;

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
      now: jest.fn().mockReturnValue(new Date("2026-04-30T10:00:00.000Z")),
      todayUtcDateString: jest.fn().mockReturnValue("2026-04-30"),
    };

    useCase = new GetProgressSummaryUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      clock,
    );
  });

  function mockActiveScope(): void {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "auth_user_123",
        name: "Rodrigo",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
      new FitnessProfile({
        id: "fitness_123",
        userProfileId: "profile_123",
        heightCm: 180,
        weightKg: 82,
        goal: "gain_muscle",
        activityLevel: "medium",
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

  it("returns zeros when there are no training plans", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result).toEqual({
      summary: {
        period: "week",
        workoutsCompleted: 0,
        totalDurationMinutes: 0,
        averageDurationMinutes: 0,
        lastWorkoutDate: null,
        currentStreak: 0,
      },
    });
    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).not.toHaveBeenCalled();
  });

  it("returns zeros when there are no logs", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.summary.workoutsCompleted).toBe(0);
    expect(result.summary.lastWorkoutDate).toBeNull();
    expect(result.summary.currentStreak).toBe(0);
  });

  it("filters week logs inside the last 7 UTC days", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);

    await useCase.execute({
      authUserId: "auth_user_123",
      period: "week",
    });

    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).toHaveBeenCalledWith({
      trainingPlanIds: ["training_123"],
      startDate: "2026-04-24",
      endDate: "2026-04-30",
    });
  });

  it("filters month logs inside the last 30 UTC days", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([]);

    await useCase.execute({
      authUserId: "auth_user_123",
      period: "month",
    });

    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).toHaveBeenCalledWith({
      trainingPlanIds: ["training_123"],
      startDate: "2026-04-01",
      endDate: "2026-04-30",
    });
  });

  it("rounds averageDurationMinutes to 2 decimal places", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      new WorkoutLog({
        id: "log_1",
        trainingPlanId: "training_123",
        workoutDayIndex: 1,
        durationMinutes: 50,
        completedExercises: [],
        date: "2026-04-29",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new WorkoutLog({
        id: "log_2",
        trainingPlanId: "training_123",
        workoutDayIndex: 2,
        durationMinutes: 55,
        completedExercises: [],
        date: "2026-04-30",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.summary.averageDurationMinutes).toBe(52.5);
    expect(result.summary.currentStreak).toBe(2);
  });

  it("ignores logs from other trainingPlanIds by repository filter", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      new WorkoutLog({
        id: "log_1",
        trainingPlanId: "training_123",
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [],
        date: "2026-04-30",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.summary.workoutsCompleted).toBe(1);
    expect(result.summary.currentStreak).toBe(1);
    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).toHaveBeenCalledWith({
      trainingPlanIds: ["training_123"],
      startDate: "2026-04-24",
      endDate: "2026-04-30",
    });
  });

  it("returns the correct lastWorkoutDate", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
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
        workoutDayIndex: 2,
        durationMinutes: 30,
        completedExercises: [],
        date: "2026-04-30",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.summary.lastWorkoutDate).toBe("2026-04-30");
    expect(result.summary.currentStreak).toBe(2);
  });

  it("breaks the current streak when there is a missing day", async () => {
    mockActiveScope();
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: "fitness_123",
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      new WorkoutLog({
        id: "log_1",
        trainingPlanId: "training_123",
        workoutDayIndex: 1,
        durationMinutes: 40,
        completedExercises: [],
        date: "2026-04-30",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      new WorkoutLog({
        id: "log_2",
        trainingPlanId: "training_123",
        workoutDayIndex: 2,
        durationMinutes: 35,
        completedExercises: [],
        date: "2026-04-28",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.summary.currentStreak).toBe(1);
  });

  it("returns USER_PROFILE_NOT_FOUND when user profile is missing", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toMatchObject({
      code: GET_PROGRESS_SUMMARY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it("returns FITNESS_PROFILE_NOT_FOUND when active fitness profile is missing", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "auth_user_123",
        name: "Rodrigo",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toMatchObject({
      code: GET_PROGRESS_SUMMARY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it("returns PROGRESS_SUMMARY_INVALID_INPUT for invalid period", async () => {
    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        period: "year" as "week",
      }),
    ).rejects.toMatchObject({
      code: GET_PROGRESS_SUMMARY_ERROR_CODES.INVALID_INPUT,
    });
  });
});
