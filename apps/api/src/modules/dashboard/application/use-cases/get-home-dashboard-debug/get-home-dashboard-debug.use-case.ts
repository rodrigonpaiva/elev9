import { Injectable } from "@nestjs/common";

import { GetHomeDashboardUseCase } from "../get-home-dashboard/get-home-dashboard.use-case";
import { GetHomeDashboardDebugOutput } from "./get-home-dashboard-debug.output";

@Injectable()
export class GetHomeDashboardDebugUseCase {
  constructor(
    private readonly getHomeDashboardUseCase: GetHomeDashboardUseCase,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetHomeDashboardDebugOutput> {
    const result = await this.getHomeDashboardUseCase.execute(input);

    return {
      generatedAt: result.dashboard.debug.generatedAt,
      recovery: {
        fatigueLevel: result.dashboard.recovery.fatigueLevel,
        recoveryTrend: result.dashboard.recovery.recoveryTrend,
        recoverySignals: result.dashboard.debug.recoverySignals,
      },
      nutrition: {
        priority: result.dashboard.nutritionGuidance.priority,
        signals: result.dashboard.debug.nutritionSignals,
      },
    };
  }
}
