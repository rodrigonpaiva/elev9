import { GetHomeDashboardUseCase } from "../get-home-dashboard/get-home-dashboard.use-case";
import { GetHomeDashboardDebugUseCase } from "./get-home-dashboard-debug.use-case";

describe("GetHomeDashboardDebugUseCase", () => {
  let getHomeDashboardUseCase: jest.Mocked<GetHomeDashboardUseCase>;
  let useCase: GetHomeDashboardDebugUseCase;

  beforeEach(() => {
    getHomeDashboardUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetHomeDashboardUseCase>;

    useCase = new GetHomeDashboardDebugUseCase(getHomeDashboardUseCase);
  });

  it("returns only the adaptive debug snapshot", async () => {
    getHomeDashboardUseCase.execute.mockResolvedValue({
      dashboard: {
        user: { name: "Rodrigo Paiva" },
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
          fatigueLevel: "HIGH",
          recommendedIntensity: "low",
          recoveryTrend: "needs_recovery",
        },
        nutritionGuidance: {
          priority: "recovery",
          message: "Focus on recovery meals and hydration today.",
          signals: ["high_fatigue", "poor_sleep", "high_soreness"],
        },
        debug: {
          generatedAt: "2026-04-30T10:00:00.000Z",
          recoverySignals: ["high_fatigue", "poor_sleep", "high_soreness"],
          nutritionSignals: ["high_fatigue", "poor_sleep", "high_soreness"],
        },
      },
    });

    await expect(
      useCase.execute({ authUserId: "auth_user_123" }),
    ).resolves.toEqual({
      generatedAt: "2026-04-30T10:00:00.000Z",
      recovery: {
        fatigueLevel: "HIGH",
        recoveryTrend: "needs_recovery",
        recoverySignals: ["high_fatigue", "poor_sleep", "high_soreness"],
      },
      nutrition: {
        priority: "recovery",
        signals: ["high_fatigue", "poor_sleep", "high_soreness"],
      },
    });
  });
});
