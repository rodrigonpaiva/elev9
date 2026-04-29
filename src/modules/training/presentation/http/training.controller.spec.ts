import { ConflictException, NotFoundException } from "@nestjs/common";

import {
  CREATE_TRAINING_PLAN_ERROR_CODES,
  CreateTrainingPlanError,
} from "../../application/use-cases/create-training-plan/create-training-plan.errors";
import { CreateTrainingPlanUseCase } from "../../application/use-cases/create-training-plan/create-training-plan.use-case";
import { TrainingController } from "./training.controller";

describe("TrainingController", () => {
  let createTrainingPlanUseCase: jest.Mocked<CreateTrainingPlanUseCase>;
  let controller: TrainingController;

  beforeEach(() => {
    createTrainingPlanUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateTrainingPlanUseCase>;

    controller = new TrainingController(createTrainingPlanUseCase);
  });

  it("returns the safe response on success", async () => {
    createTrainingPlanUseCase.execute.mockResolvedValue({
      trainingPlan: {
        id: "training_123",
        fitnessProfileId: "fitness_123",
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
      },
    });

    const result = await controller.createPlan(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {
        fitnessProfileId: "fitness_123",
      },
    );

    expect(createTrainingPlanUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      fitnessProfileId: "fitness_123",
    });
    expect(result.trainingPlan.createdAt).toBe("2026-04-29T10:30:00.000Z");
  });

  it("maps FITNESS_PROFILE_NOT_FOUND to HTTP 404", async () => {
    createTrainingPlanUseCase.execute.mockRejectedValue(
      new CreateTrainingPlanError(
        CREATE_TRAINING_PLAN_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
        "Fitness profile not found.",
      ),
    );

    await expect(
      controller.createPlan(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          fitnessProfileId: "fitness_123",
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps TRAINING_PLAN_ALREADY_EXISTS to HTTP 409", async () => {
    createTrainingPlanUseCase.execute.mockRejectedValue(
      new CreateTrainingPlanError(
        CREATE_TRAINING_PLAN_ERROR_CODES.ALREADY_EXISTS,
        "Training plan already exists.",
      ),
    );

    await expect(
      controller.createPlan(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          fitnessProfileId: "fitness_123",
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
