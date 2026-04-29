import { FitnessProfile } from "../../../../fitness/domain/entities/fitness-profile.entity";
import { FitnessProfileRepository } from "../../../../fitness/domain/repositories/fitness-profile.repository";
import { UserProfile } from "../../../../users/domain/entities/user-profile.entity";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import { TrainingPlan } from "../../../domain/entities/training-plan.entity";
import { TrainingPlanRepository } from "../../../domain/repositories/training-plan.repository";
import {
  CREATE_TRAINING_PLAN_ERROR_CODES,
} from "./create-training-plan.errors";
import { CreateTrainingPlanUseCase } from "./create-training-plan.use-case";

describe("CreateTrainingPlanUseCase", () => {
  const validFitnessProfileId = "507f1f77bcf86cd799439011";
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let fitnessProfileRepository: jest.Mocked<FitnessProfileRepository>;
  let trainingPlanRepository: jest.Mocked<TrainingPlanRepository>;
  let useCase: CreateTrainingPlanUseCase;

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
      findActiveByFitnessProfileId: jest.fn(),
      create: jest.fn(),
    };

    useCase = new CreateTrainingPlanUseCase(
      userProfileRepository,
      fitnessProfileRepository,
      trainingPlanRepository,
    );
  });

  it("creates a training plan successfully", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "auth_user_123",
        name: "Rodrigo Paiva",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      }),
    );
    fitnessProfileRepository.findById.mockResolvedValue(
      new FitnessProfile({
        id: validFitnessProfileId,
        userProfileId: "profile_123",
        heightCm: 180,
        weightKg: 82.5,
        goal: "gain_muscle",
        activityLevel: "medium",
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: "active",
        createdAt: new Date("2026-04-29T10:20:00.000Z"),
        updatedAt: new Date("2026-04-29T10:20:00.000Z"),
      }),
    );
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    trainingPlanRepository.create.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: validFitnessProfileId,
        goal: "gain_muscle",
        activityLevel: "medium",
        weeklySchedule: [
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
        ],
        status: "active",
        createdAt: new Date("2026-04-29T10:30:00.000Z"),
        updatedAt: new Date("2026-04-29T10:30:00.000Z"),
      }),
    );

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      fitnessProfileId: validFitnessProfileId,
    });

    expect(result.trainingPlan.id).toBe("training_123");
    expect(result.trainingPlan.fitnessProfileId).toBe(validFitnessProfileId);
  });

  it("returns FITNESS_PROFILE_NOT_FOUND when user profile is missing", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        fitnessProfileId: validFitnessProfileId,
      }),
    ).rejects.toMatchObject({
      code: CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it("returns FITNESS_PROFILE_NOT_FOUND for invalid fitnessProfileId before querying Mongo", async () => {
    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        fitnessProfileId: "invalid-id",
      }),
    ).rejects.toMatchObject({
      code: CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });

    expect(userProfileRepository.findByAuthUserId).not.toHaveBeenCalled();
    expect(fitnessProfileRepository.findById).not.toHaveBeenCalled();
    expect(
      trainingPlanRepository.findActiveByFitnessProfileId,
    ).not.toHaveBeenCalled();
  });

  it("returns FITNESS_PROFILE_NOT_FOUND for invalid ownership", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "auth_user_123",
        name: "Rodrigo Paiva",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      }),
    );
    fitnessProfileRepository.findById.mockResolvedValue(
      new FitnessProfile({
        id: validFitnessProfileId,
        userProfileId: "profile_other",
        heightCm: 180,
        weightKg: 82.5,
        goal: "maintain",
        activityLevel: "medium",
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: "active",
        createdAt: new Date("2026-04-29T10:20:00.000Z"),
        updatedAt: new Date("2026-04-29T10:20:00.000Z"),
      }),
    );

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        fitnessProfileId: validFitnessProfileId,
      }),
    ).rejects.toMatchObject({
      code: CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
    });
  });

  it("returns TRAINING_PLAN_ALREADY_EXISTS when an active plan exists", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "auth_user_123",
        name: "Rodrigo Paiva",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      }),
    );
    fitnessProfileRepository.findById.mockResolvedValue(
      new FitnessProfile({
        id: validFitnessProfileId,
        userProfileId: "profile_123",
        heightCm: 180,
        weightKg: 82.5,
        goal: "maintain",
        activityLevel: "medium",
        trainingAvailability: {
          daysPerWeek: 4,
          minutesPerSession: 60,
        },
        limitations: [],
        status: "active",
        createdAt: new Date("2026-04-29T10:20:00.000Z"),
        updatedAt: new Date("2026-04-29T10:20:00.000Z"),
      }),
    );
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(
      new TrainingPlan({
        id: "training_123",
        fitnessProfileId: validFitnessProfileId,
        goal: "maintain",
        activityLevel: "medium",
        weeklySchedule: [],
        status: "active",
        createdAt: new Date("2026-04-29T10:30:00.000Z"),
        updatedAt: new Date("2026-04-29T10:30:00.000Z"),
      }),
    );

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        fitnessProfileId: validFitnessProfileId,
      }),
    ).rejects.toMatchObject({
      code: CREATE_TRAINING_PLAN_ERROR_CODES.ALREADY_EXISTS,
    });
  });

  it("does not exceed fitness profile training availability", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: "profile_123",
        authUserId: "auth_user_123",
        name: "Rodrigo Paiva",
        language: "en-US",
        timezone: "UTC",
        status: "active",
        createdAt: new Date("2026-04-29T10:00:00.000Z"),
        updatedAt: new Date("2026-04-29T10:00:00.000Z"),
      }),
    );
    fitnessProfileRepository.findById.mockResolvedValue(
      new FitnessProfile({
        id: validFitnessProfileId,
        userProfileId: "profile_123",
        heightCm: 180,
        weightKg: 82.5,
        goal: "lose_weight",
        activityLevel: "high",
        trainingAvailability: {
          daysPerWeek: 2,
          minutesPerSession: 60,
        },
        limitations: [],
        status: "active",
        createdAt: new Date("2026-04-29T10:20:00.000Z"),
        updatedAt: new Date("2026-04-29T10:20:00.000Z"),
      }),
    );
    trainingPlanRepository.findActiveByFitnessProfileId.mockResolvedValue(null);
    trainingPlanRepository.create.mockImplementation(async (input) => {
      expect(input.weeklySchedule).toHaveLength(2);
      return new TrainingPlan({
        id: "training_123",
        fitnessProfileId: input.fitnessProfileId,
        goal: input.goal,
        activityLevel: input.activityLevel,
        weeklySchedule: input.weeklySchedule,
        status: "active",
        createdAt: new Date("2026-04-29T10:30:00.000Z"),
        updatedAt: new Date("2026-04-29T10:30:00.000Z"),
      });
    });

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      fitnessProfileId: validFitnessProfileId,
    });

    expect(result.trainingPlan.weeklySchedule).toHaveLength(2);
  });
});
