import { Inject, Injectable } from '@nestjs/common';

import { BuildUserHealthContextService } from '../../../../ai/application/services/context-builder/build-user-health-context.service';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import {
  NotificationReadModelMapper,
  type NotificationReadModelPayload,
} from '../../../../../shared/mappers';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GET_HOME_DASHBOARD_ERROR_CODES,
  GetHomeDashboardError,
} from '../get-home-dashboard/get-home-dashboard.errors';
import { DashboardAdaptiveSignalsService } from '../../services/dashboard-adaptive-signals/dashboard-adaptive-signals.service';
import { GetHomeDashboardDebugOutput } from './get-home-dashboard-debug.output';

@Injectable()
export class GetHomeDashboardDebugUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly getCurrentGoalUseCase: GetCurrentGoalUseCase,
    private readonly getGoalMilestonesUseCase: GetGoalMilestonesUseCase,
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly dashboardAdaptiveSignalsService: DashboardAdaptiveSignalsService,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetHomeDashboardDebugOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
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
          'User profile not found.',
        );
      }

      const recentDailyCheckIns = (
        await this.dailyCheckInRepository.findManyByUserProfileId(
          userProfile.id,
        )
      ).slice(0, 3);
      const goal = await this.resolveGoal(authUserId);
      const notification = await this.resolveNotification(authUserId);
      const recovery =
        this.dashboardAdaptiveSignalsService.buildRecoverySummary(
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
        goal,
        notification,
      );
    } catch (error) {
      if (error instanceof GetHomeDashboardError) {
        throw error;
      }

      throw new GetHomeDashboardError(
        GET_HOME_DASHBOARD_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private async resolveGoal(authUserId: string) {
    try {
      const currentGoal = await this.getCurrentGoalUseCase.execute({
        authUserId,
      });
      const milestones =
        await this.getGoalMilestonesUseCase.execute({ authUserId });

      return {
        goal: currentGoal.goal,
        progressSnapshot: currentGoal.progressSnapshot,
        forecast: currentGoal.forecast,
        milestones: milestones.goalMilestones,
      };
    } catch {
      return undefined;
    }
  }

  private async resolveNotification(authUserId: string): Promise<
    | {
        current?: NotificationReadModelPayload['current'];
        engagementSummary?: NotificationReadModelPayload['engagementSummary'];
      }
    | undefined
  > {
    const [currentResult, engagementSummaryResult] = await Promise.allSettled([
      this.getCurrentNotificationUseCase.execute({ authUserId }),
      this.getEngagementSummaryUseCase.execute({ authUserId }),
    ]);

    return NotificationReadModelMapper.toDashboardPayload(
      currentResult.status === 'fulfilled'
        ? currentResult.value.notificationDecision
        : undefined,
      engagementSummaryResult.status === 'fulfilled'
        ? engagementSummaryResult.value.engagementSummary
        : undefined,
    );
  }
}
