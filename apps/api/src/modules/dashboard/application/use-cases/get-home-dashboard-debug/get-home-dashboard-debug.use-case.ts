import { Inject, Injectable } from "@nestjs/common";

import { BuildUserHealthContextService } from "../../../../ai/application/services/context-builder/build-user-health-context.service";
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from "../../../../progress/domain/repositories/daily-check-in.repository";
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  GET_HOME_DASHBOARD_ERROR_CODES,
  GetHomeDashboardError,
} from "../get-home-dashboard/get-home-dashboard.errors";
import { DashboardAdaptiveSignalsService } from "../../services/dashboard-adaptive-signals/dashboard-adaptive-signals.service";
import { GetHomeDashboardDebugOutput } from "./get-home-dashboard-debug.output";

@Injectable()
export class GetHomeDashboardDebugUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly dashboardAdaptiveSignalsService: DashboardAdaptiveSignalsService,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetHomeDashboardDebugOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";

    if (!authUserId) {
      throw new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);
      const healthContext = await this.buildUserHealthContextService.build({
        authUserId,
      });

      if (!userProfile) {
        throw new GetHomeDashboardError(
          GET_HOME_DASHBOARD_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const recentDailyCheckIns = (
        await this.dailyCheckInRepository.findManyByUserProfileId(userProfile.id)
      ).slice(0, 3);
      const recovery = this.dashboardAdaptiveSignalsService.buildRecoverySummary(
        healthContext,
        recentDailyCheckIns,
      );
      const nutritionGuidance =
        this.dashboardAdaptiveSignalsService.buildNutritionGuidance(
          healthContext,
          recovery.recoveryTrend,
        );

      return this.dashboardAdaptiveSignalsService.buildDebugSnapshot(
        healthContext,
        recovery,
        nutritionGuidance,
      );
    } catch (error) {
      if (error instanceof GetHomeDashboardError) {
        throw error;
      }

      throw new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }
}
