import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  GET_WORKOUT_HISTORY_ERROR_CODES,
  GetWorkoutHistoryError,
} from "../../application/use-cases/get-workout-history/get-workout-history.errors";
import { GetWorkoutHistoryUseCase } from "../../application/use-cases/get-workout-history/get-workout-history.use-case";
import {
  GET_PROGRESS_SUMMARY_ERROR_CODES,
  GetProgressSummaryError,
} from "../../application/use-cases/get-progress-summary/get-progress-summary.errors";
import { GetProgressSummaryUseCase } from "../../application/use-cases/get-progress-summary/get-progress-summary.use-case";
import {
  LOG_WORKOUT_ERROR_CODES,
  LogWorkoutError,
} from "../../application/use-cases/log-workout/log-workout.errors";
import { LogWorkoutUseCase } from "../../application/use-cases/log-workout/log-workout.use-case";
import { ProgressController } from "./progress.controller";

describe("ProgressController", () => {
  let logWorkoutUseCase: jest.Mocked<LogWorkoutUseCase>;
  let getProgressSummaryUseCase: jest.Mocked<GetProgressSummaryUseCase>;
  let getWorkoutHistoryUseCase: jest.Mocked<GetWorkoutHistoryUseCase>;
  let controller: ProgressController;

  beforeEach(() => {
    logWorkoutUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<LogWorkoutUseCase>;
    getProgressSummaryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetProgressSummaryUseCase>;
    getWorkoutHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetWorkoutHistoryUseCase>;

    controller = new ProgressController(
      logWorkoutUseCase,
      getProgressSummaryUseCase,
      getWorkoutHistoryUseCase,
    );
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

  it("returns the safe summary response on success", async () => {
    getProgressSummaryUseCase.execute.mockResolvedValue({
      summary: {
        period: "week",
        workoutsCompleted: 3,
        totalDurationMinutes: 155,
        averageDurationMinutes: 51.67,
        lastWorkoutDate: "2026-04-30",
        currentStreak: 4,
      },
    });

    const result = await controller.getSummary(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {
        period: "week",
      },
      {},
    );

    expect(result).toEqual({
      summary: {
        period: "week",
        workoutsCompleted: 3,
        totalDurationMinutes: 155,
        averageDurationMinutes: 51.67,
        lastWorkoutDate: "2026-04-30",
        currentStreak: 4,
      },
    });
  });

  it("maps invalid query period to HTTP 400", async () => {
    getProgressSummaryUseCase.execute.mockRejectedValue(
      new GetProgressSummaryError(
        GET_PROGRESS_SUMMARY_ERROR_CODES.INVALID_INPUT,
        "Invalid progress summary input.",
      ),
    );

    await expect(
      controller.getSummary(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          period: "year" as "week",
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps missing fitness profile to HTTP 404", async () => {
    getProgressSummaryUseCase.execute.mockRejectedValue(
      new GetProgressSummaryError(
        GET_PROGRESS_SUMMARY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
        "Fitness profile not found.",
      ),
    );

    await expect(
      controller.getSummary(
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

  it("maps invalid session on summary to HTTP 401", async () => {
    getProgressSummaryUseCase.execute.mockRejectedValue(
      new GetProgressSummaryError(
        GET_PROGRESS_SUMMARY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.getSummary(
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

  it("returns the safe workout history response on success", async () => {
    getWorkoutHistoryUseCase.execute.mockResolvedValue({
      workoutLogs: [
        {
          id: "log_123",
          trainingPlanId: "training_plan_123",
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [{ name: "push_up", setsDone: 4, repsDone: 12 }],
          feedback: { difficulty: "medium", notes: "Good session" },
          date: "2026-04-30",
          createdAt: "2026-04-30T10:00:00.000Z",
        },
      ],
    });

    const result = await controller.getWorkoutHistory(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      { limit: 20 },
      {},
    );

    expect(result).toEqual({
      workoutLogs: [
        {
          id: "log_123",
          trainingPlanId: "training_plan_123",
          workoutDayIndex: 1,
          durationMinutes: 45,
          completedExercises: [{ name: "push_up", setsDone: 4, repsDone: 12 }],
          feedback: { difficulty: "medium", notes: "Good session" },
          date: "2026-04-30",
          createdAt: "2026-04-30T10:00:00.000Z",
        },
      ],
    });
  });

  it("maps invalid history query to HTTP 400", async () => {
    getWorkoutHistoryUseCase.execute.mockRejectedValue(
      new GetWorkoutHistoryError(
        GET_WORKOUT_HISTORY_ERROR_CODES.INVALID_INPUT,
        "Invalid workout history input.",
      ),
    );

    await expect(
      controller.getWorkoutHistory(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { limit: 100 },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps missing fitness profile on history to HTTP 404", async () => {
    getWorkoutHistoryUseCase.execute.mockRejectedValue(
      new GetWorkoutHistoryError(
        GET_WORKOUT_HISTORY_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
        "Fitness profile not found.",
      ),
    );

    await expect(
      controller.getWorkoutHistory(
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

  it("maps invalid session on history to HTTP 401", async () => {
    getWorkoutHistoryUseCase.execute.mockRejectedValue(
      new GetWorkoutHistoryError(
        GET_WORKOUT_HISTORY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.getWorkoutHistory(
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
