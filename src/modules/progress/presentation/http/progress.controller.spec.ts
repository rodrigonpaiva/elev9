import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  LOG_WORKOUT_ERROR_CODES,
  LogWorkoutError,
} from "../../application/use-cases/log-workout/log-workout.errors";
import { LogWorkoutUseCase } from "../../application/use-cases/log-workout/log-workout.use-case";
import { ProgressController } from "./progress.controller";

describe("ProgressController", () => {
  let logWorkoutUseCase: jest.Mocked<LogWorkoutUseCase>;
  let controller: ProgressController;

  beforeEach(() => {
    logWorkoutUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LogWorkoutUseCase>;

    controller = new ProgressController(logWorkoutUseCase);
  });

  it("returns the safe response on success", async () => {
    logWorkoutUseCase.execute.mockResolvedValue({
      workoutLog: {
        id: "log_123",
        trainingPlanId: "507f1f77bcf86cd799439011",
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [
          { name: "push_up", setsDone: 4, repsDone: 12 },
        ],
        feedback: {
          difficulty: "medium",
          notes: "Good session",
        },
        date: "2026-04-30",
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
      },
    });

    const result = await controller.logWorkout(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {
        trainingPlanId: "507f1f77bcf86cd799439011",
        workoutDayIndex: 1,
        durationMinutes: 45,
        completedExercises: [
          { name: "push_up", setsDone: 4, repsDone: 12 },
        ],
        feedback: {
          difficulty: "medium",
          notes: "Good session",
        },
      },
    );

    expect(result.workoutLog.createdAt).toBe("2026-04-30T10:00:00.000Z");
  });

  it("maps invalid input to HTTP 400", async () => {
    logWorkoutUseCase.execute.mockRejectedValue(
      new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.INVALID_INPUT,
        "Invalid workout log input.",
      ),
    );

    await expect(
      controller.logWorkout(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          trainingPlanId: "507f1f77bcf86cd799439011",
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [
            { name: "push_up", setsDone: 4, repsDone: 12 },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps duplicate log to HTTP 409", async () => {
    logWorkoutUseCase.execute.mockRejectedValue(
      new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.ALREADY_EXISTS,
        "Workout log already exists.",
      ),
    );

    await expect(
      controller.logWorkout(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          trainingPlanId: "507f1f77bcf86cd799439011",
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [
            { name: "push_up", setsDone: 4, repsDone: 12 },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("maps training plan not found to HTTP 404", async () => {
    logWorkoutUseCase.execute.mockRejectedValue(
      new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.TRAINING_PLAN_NOT_FOUND,
        "Training plan not found.",
      ),
    );

    await expect(
      controller.logWorkout(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          trainingPlanId: "507f1f77bcf86cd799439011",
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [
            { name: "push_up", setsDone: 4, repsDone: 12 },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps invalid session to HTTP 401", async () => {
    logWorkoutUseCase.execute.mockRejectedValue(
      new LogWorkoutError(
        LOG_WORKOUT_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.logWorkout(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          trainingPlanId: "507f1f77bcf86cd799439011",
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [
            { name: "push_up", setsDone: 4, repsDone: 12 },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
