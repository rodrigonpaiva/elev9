import { NotFoundException, UnauthorizedException } from "@nestjs/common";

import {
  GET_HOME_DASHBOARD_ERROR_CODES,
  GetHomeDashboardError,
} from "../../application/use-cases/get-home-dashboard/get-home-dashboard.errors";
import { GetHomeDashboardUseCase } from "../../application/use-cases/get-home-dashboard/get-home-dashboard.use-case";
import { DashboardController } from "./dashboard.controller";

describe("DashboardController", () => {
  let getHomeDashboardUseCase: jest.Mocked<GetHomeDashboardUseCase>;
  let controller: DashboardController;

  beforeEach(() => {
    getHomeDashboardUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetHomeDashboardUseCase>;

    controller = new DashboardController(getHomeDashboardUseCase);
  });

  it("returns the safe dashboard shape on success", async () => {
    getHomeDashboardUseCase.execute.mockResolvedValue({
      dashboard: {
        user: {
          name: "Rodrigo Paiva",
        },
        fitnessProfile: {
          id: "fitness_123",
          goal: "gain_muscle",
          activityLevel: "high",
        },
        trainingPlan: {
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
        },
        progressSummary: {
          period: "week",
          workoutsCompleted: 2,
          totalDurationMinutes: 95,
          averageDurationMinutes: 47.5,
          lastWorkoutDate: "2026-04-30",
        },
      },
    });

    const result = await controller.getHomeDashboard(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
      {},
    );

    expect(getHomeDashboardUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
    });
    expect(result.dashboard.user.name).toBe("Rodrigo Paiva");
    expect(result.dashboard.progressSummary.period).toBe("week");
  });

  it("maps USER_PROFILE_NOT_FOUND to HTTP 404", async () => {
    getHomeDashboardUseCase.execute.mockRejectedValue(
      new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        "User profile not found.",
      ),
    );

    await expect(
      controller.getHomeDashboard(
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
    getHomeDashboardUseCase.execute.mockRejectedValue(
      new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.getHomeDashboard(
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
