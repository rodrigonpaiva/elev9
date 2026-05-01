import { NotFoundException, UnauthorizedException, ConflictException } from "@nestjs/common";

import {
  CREATE_TRAINING_PLAN_ERROR_CODES,
  CreateTrainingPlanError,
} from "../../application/use-cases/create-training-plan/create-training-plan.errors";
import { CreateTrainingPlanUseCase } from "../../application/use-cases/create-training-plan/create-training-plan.use-case";
import {
  GET_MY_TRAINING_PLAN_ERROR_CODES,
  GetMyTrainingPlanError,
} from "../../application/use-cases/get-my-training-plan/get-my-training-plan.errors";
import { GetMyTrainingPlanUseCase } from "../../application/use-cases/get-my-training-plan/get-my-training-plan.use-case";
import { TrainingController } from "./training.controller";

describe("TrainingController", () => {
  let createTrainingPlanUseCase: jest.Mocked<CreateTrainingPlanUseCase>;
  let getMyTrainingPlanUseCase: jest.Mocked<GetMyTrainingPlanUseCase>;
  let controller: TrainingController;

  beforeEach(() => {
    createTrainingPlanUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateTrainingPlanUseCase>;

    getMyTrainingPlanUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMyTrainingPlanUseCase>;

    controller = new TrainingController(
      createTrainingPlanUseCase,
      getMyTrainingPlanUseCase,
    );
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

  it("returns the current training plan safely on success", async () => {
    getMyTrainingPlanUseCase.execute.mockResolvedValue({
      trainingPlan: {
        id: "training_123",
        fitnessProfileId: "fitness_123",
        status: "active",
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
        createdAt: new Date("2026-04-29T10:30:00.000Z"),
      },
    });

    const result = await controller.getCurrentPlan(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
      {},
    );

    expect(result.trainingPlan.createdAt).toBe("2026-04-29T10:30:00.000Z");
  });

  it("maps TRAINING_PLAN_NOT_FOUND to HTTP 404", async () => {
    getMyTrainingPlanUseCase.execute.mockRejectedValue(
      new GetMyTrainingPlanError(
        GET_MY_TRAINING_PLAN_ERROR_CODES.TRAINING_PLAN_NOT_FOUND,
        "Training plan not found.",
      ),
    );

    await expect(
      controller.getCurrentPlan(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps AUTH_INVALID_SESSION to HTTP 401", async () => {
    getMyTrainingPlanUseCase.execute.mockRejectedValue(
      new GetMyTrainingPlanError(
        GET_MY_TRAINING_PLAN_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.getCurrentPlan(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
