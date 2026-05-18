import { CoachFeedbackRepository } from "../../../domain/repositories/coach-feedback.repository";
import { WorkoutLog } from "../../../../progress/domain/entities/workout-log.entity";
import {
  CoachFeedbackGenerator,
  CoachFeedbackGeneratorInput,
} from "../../services/coach-feedback/coach-feedback-generator.service";
import {
  BuildUserHealthContextService,
  UserHealthContext,
} from "../../services/context-builder/build-user-health-context.service";
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
} from "./generate-coach-feedback.errors";
import { GenerateCoachFeedbackUseCase } from "./generate-coach-feedback.use-case";

describe("GenerateCoachFeedbackUseCase", () => {
  let coachFeedbackRepository: jest.Mocked<CoachFeedbackRepository>;
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService["build"]>;
  };
  let coachFeedbackGenerator: CoachFeedbackGenerator;
  let generateSpy: jest.SpiedFunction<CoachFeedbackGenerator["generate"]>;
  let useCase: GenerateCoachFeedbackUseCase;

  beforeEach(() => {
    coachFeedbackRepository = {
      create: jest.fn(),
      findByUserProfileId: jest.fn(),
    };
    buildUserHealthContextService = {
      build: jest.fn(),
    };
    coachFeedbackGenerator = new CoachFeedbackGenerator();
    generateSpy = jest.spyOn(coachFeedbackGenerator, "generate");

    useCase = new GenerateCoachFeedbackUseCase(
      coachFeedbackRepository,
      coachFeedbackGenerator,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
    );
  });

  it("calls BuildUserHealthContextService and returns deterministic feedback with full data", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        weeklyFrequency: 4,
        averageWorkoutDuration: 38.75,
        currentStreak: 4,
        activeTrainingPlanId: "training_123",
        recentWorkoutLogs: [
          buildWorkoutLog("2026-05-01", 30, "2026-05-01T08:00:00.000Z"),
          buildWorkoutLog("2026-05-02", 35, "2026-05-02T08:00:00.000Z"),
          buildWorkoutLog("2026-05-03", 40, "2026-05-03T08:00:00.000Z"),
          buildWorkoutLog("2026-05-04", 50, "2026-05-04T08:00:00.000Z"),
        ],
      }),
    );

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(buildUserHealthContextService.build).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
    });
    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fatigueLevel: "MODERATE",
        latestCheckIn: undefined,
        nutritionProfile: undefined,
      }) as CoachFeedbackGeneratorInput,
    );
    expect(coachFeedbackRepository.create).toHaveBeenCalledWith({
      userProfileId: "profile_123",
      message: "Great consistency this week. You're on a 4-day streak.",
      insights: expect.any(Array),
      recommendations: expect.any(Array),
      influences: expect.any(Array),
    });
    expect(result.message).toBe(
      "Great consistency this week. You're on a 4-day streak.",
    );
    expect(result).not.toHaveProperty("influences");
  });

  it("continues generating feedback with partial context", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        weeklyFrequency: 3,
        averageWorkoutDuration: 0,
        currentStreak: 0,
        activeTrainingPlanId: undefined,
        recentWorkoutLogs: [],
      }),
    );

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.message).toBe(
      "You are ready to start your first training streak today.",
    );
  });

  it("uses activity-level fallback when weekly frequency is absent from context", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        activityLevel: "high",
        weeklyFrequency: undefined,
        averageWorkoutDuration: 35,
        currentStreak: 1,
        activeTrainingPlanId: "training_123",
        recentWorkoutLogs: [
          buildWorkoutLog("2026-04-28", 30),
          buildWorkoutLog("2026-05-01", 35),
          buildWorkoutLog("2026-05-04", 40),
        ],
      }),
    );

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
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        userProfileId: undefined,
        userName: undefined,
        goal: undefined,
        activityLevel: undefined,
        weeklyFrequency: undefined,
      }),
    );

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toMatchObject({
      code: GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it("returns FITNESS_PROFILE_NOT_FOUND when fitness profile is missing", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        goal: undefined,
        activityLevel: undefined,
        weeklyFrequency: undefined,
      }),
    );

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
    buildUserHealthContextService.build.mockRejectedValue(
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

  it("fails when coach feedback persistence fails", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        activeTrainingPlanId: "training_123",
        recentWorkoutLogs: [],
      }),
    );
    coachFeedbackRepository.create.mockRejectedValue(
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

  it("passes fatigueLevel from health context to the generator", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        fatigueLevel: "HIGH",
        currentStreak: 6,
        averageWorkoutDuration: 80,
      }),
    );

    await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        fatigueLevel: "HIGH",
      }) as CoachFeedbackGeneratorInput,
    );
  });

  it("passes latestCheckIn from health context to the generator", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        latestCheckIn: {
          energyLevel: 4,
          sleepQuality: 3,
          muscleSoreness: 2,
          motivationLevel: 5,
          createdAt: new Date("2026-05-04T09:00:00.000Z"),
        },
      }),
    );

    await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        latestCheckIn: {
          energyLevel: 4,
          sleepQuality: 3,
          muscleSoreness: 2,
          motivationLevel: 5,
          createdAt: new Date("2026-05-04T09:00:00.000Z"),
        },
      }) as CoachFeedbackGeneratorInput,
    );
  });

  it("passes nutritionProfile from health context to the generator", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        nutritionProfile: {
          goal: "muscle_gain",
          mealsPerDay: 4,
          dietaryRestrictions: [],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: ["rice", "eggs"],
        },
      }),
    );

    await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        nutritionProfile: {
          goal: "muscle_gain",
          mealsPerDay: 4,
          dietaryRestrictions: [],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: ["rice", "eggs"],
        },
      }) as CoachFeedbackGeneratorInput,
    );
    expect(coachFeedbackRepository.create).toHaveBeenCalledWith({
      userProfileId: "profile_123",
      message: expect.any(String),
      insights: expect.any(Array),
      recommendations: expect.any(Array),
      influences: expect.any(Array),
    });
  });

  it("persists influences generated from context signals", async () => {
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        fatigueLevel: "HIGH",
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 3,
          createdAt: new Date("2026-05-04T09:00:00.000Z"),
        },
        nutritionProfile: {
          goal: "fat_loss",
          mealsPerDay: 2,
          dietaryRestrictions: ["vegetarian"],
          allergies: [],
          dislikedFoods: [],
          preferredFoods: [],
        },
        recentWorkoutLogs: [
          buildWorkoutLog("2026-05-02", 40),
          buildWorkoutLog("2026-05-04", 44),
        ],
      }),
    );

    await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(coachFeedbackRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        influences: expect.arrayContaining([
          "fatigue:high",
          "recovery:needs_recovery",
          "checkin:low_energy",
          "checkin:poor_sleep",
          "checkin:high_soreness",
          "nutrition:fat_loss",
          "nutrition:low_meal_frequency",
          "nutrition:dietary_restrictions",
          "training:low_consistency",
        ]),
      }),
    );
  });
});

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

function buildHealthContext(
  overrides: Partial<UserHealthContext> = {},
): UserHealthContext {
  return {
    authUserId: "auth_user_123",
    userProfileId: "profile_123",
    userName: "Rodrigo Paiva",
    goal: "gain_muscle",
    activityLevel: "medium",
    weeklyFrequency: 4,
    adherenceScore: 0,
    currentStreak: 0,
    averageWorkoutDuration: 0,
    fatigueLevel: "MODERATE",
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: "training_123",
    recentWorkoutLogs: [],
    generatedAt: new Date("2026-05-04T10:00:00.000Z"),
    ...overrides,
  };
}
