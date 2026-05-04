import { FitnessProfile } from "../../../../fitness/domain/entities/fitness-profile.entity";
import { FitnessProfileRepository } from "../../../../fitness/domain/repositories/fitness-profile.repository";
import { WorkoutLog } from "../../../../progress/domain/entities/workout-log.entity";
import { WorkoutLogRepository } from "../../../../progress/domain/repositories/workout-log.repository";
import { Clock } from "../../../../progress/domain/services/clock.service";
import { TrainingPlan } from "../../../../training/domain/entities/training-plan.entity";
import { TrainingPlanRepository } from "../../../../training/domain/repositories/training-plan.repository";
import { UserProfile } from "../../../../users/domain/entities/user-profile.entity";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import { CoachFeedbackGenerator } from "../../services/coach-feedback/coach-feedback-generator.service";
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
} from "./generate-coach-feedback.errors";
import { GenerateCoachFeedbackUseCase } from "./generate-coach-feedback.use-case";

describe("GenerateCoachFeedbackUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let workoutLogRepository: jest.Mocked<WorkoutLogRepository>;
  let clock: jest.Mocked<Clock>;
  let coachFeedbackGenerator: CoachFeedbackGenerator;
  let useCase: GenerateCoachFeedbackUseCase;

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
      now: jest.fn().mockReturnValue(new Date("2026-05-04T10:00:00.000Z")),
      todayUtcDateString: jest.fn().mockReturnValue("2026-05-04"),
    };
    coachFeedbackGenerator = new CoachFeedbackGenerator();

    useCase = new GenerateCoachFeedbackUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
      workoutLogRepository,
      clock,
      coachFeedbackGenerator,
    );
  });

  it("returns deterministic feedback for an authenticated user with recent logs", async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository);
    mockTrainingPlan(trainingPlanRepository);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog("2026-05-01", 30, "2026-05-01T08:00:00.000Z"),
      buildWorkoutLog("2026-05-02", 35, "2026-05-02T08:00:00.000Z"),
      buildWorkoutLog("2026-05-03", 40, "2026-05-03T08:00:00.000Z"),
      buildWorkoutLog("2026-05-04", 50, "2026-05-04T08:00:00.000Z"),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).toHaveBeenCalledWith(
      {
        trainingPlanIds: ["training_123"],
        startDate: "2026-04-28",
        endDate: "2026-05-04",
      },
    );
    expect(result.message).toBe(
      "Great consistency this week. You're on a 4-day streak.",
    );
  });

  it("still returns feedback when no active training plan exists", async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository, undefined);
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.message).toBe(
      "You are ready to start your first training streak today.",
    );
    expect(workoutLogRepository.findByTrainingPlanIdsAndDateRange).not.toHaveBeenCalled();
  });

  it("uses activity level fallback when training availability is missing", async () => {
    mockUserProfile(userProfileRepository);
    mockFitnessProfile(fitnessProfileRepository, 4, false, "high");
    mockTrainingPlan(trainingPlanRepository);
    workoutLogRepository.findByTrainingPlanIdsAndDateRange.mockResolvedValue([
      buildWorkoutLog("2026-04-28", 30),
      buildWorkoutLog("2026-05-01", 35),
      buildWorkoutLog("2026-05-04", 40),
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.message).toBe(
      "You have room to rebuild your rhythm this week.",
    );
    expect(result.recommendations).toContain(
      "Schedule your next session within the next 24 hours",
    );
  });

  it("returns USER_PROFILE_NOT_FOUND when user profile is missing", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it("returns FITNESS_PROFILE_NOT_FOUND when fitness profile is missing", async () => {
    mockUserProfile(userProfileRepository);
    fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it("returns AUTH_INVALID_SESSION when authUserId is blank", async () => {
    await expect(
      useCase.execute({
        authUserId: "   ",
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION,
    });
  });

  it("maps unexpected failures to AI_COACH_INTERNAL_ERROR", async () => {
    userProfileRepository.findByAuthUserId.mockRejectedValue(
      new Error("database unavailable"),
    );

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.INTERNAL_ERROR,
    });
  });
});

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
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

function mockFitnessProfile(
  fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>,
  daysPerWeek = 4,
  includeTrainingAvailability = true,
  activityLevel: "low" | "medium" | "high" = "medium",
): void {
  fitnessProfileRepository.findActiveByUserProfileId.mockResolvedValue(
    new FitnessProfile({
      id: "fitness_123",
      userProfileId: "profile_123",
      heightCm: 180,
      weightKg: 82.5,
      goal: "gain_muscle",
      activityLevel,
      trainingAvailability: includeTrainingAvailability
        ? {
            daysPerWeek,
            minutesPerSession: 60,
          }
        : ({
            daysPerWeek: undefined,
            minutesPerSession: 60,
          } as unknown as FitnessProfile["trainingAvailability"]),
      limitations: [],
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

function mockTrainingPlan(
  trainingPlanRepository: jest.Mocked<TrainingPlanRepository>,
): void {
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
}

function buildWorkoutLog(
  date: string,
  durationMinutes: number,
  createdAt = `${date}T10:00:00.000Z`,
): WorkoutLog {
  return new WorkoutLog({
    id: `${date}-${durationMinutes}`,
    trainingPlanId: "training_123",
    workoutDayIndex: 1,
    durationMinutes,
    completedExercises: [],
    date,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  });
}
