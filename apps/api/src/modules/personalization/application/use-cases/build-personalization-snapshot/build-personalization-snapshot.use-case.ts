import { Inject, Injectable } from '@nestjs/common';

import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import {
  NOTIFICATION_DECISION_REPOSITORY,
  NotificationDecisionRepository,
} from '../../../../notifications/domain/repositories/notification-decision.repository';
import {
  GOAL_ACHIEVEMENT_REPOSITORY,
  GoalAchievementRepository,
} from '../../../../goals/domain/repositories/goal-achievement.repository';
import {
  GOAL_MILESTONE_REPOSITORY,
  GoalMilestoneRepository,
} from '../../../../goals/domain/repositories/goal-milestone.repository';
import {
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../../goals/domain/repositories/goal-progress-snapshot.repository';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../../goals/domain/repositories/goal.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import {
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../../ai/domain/repositories/coach-decision.repository';
import {
  HABIT_RISK_SIGNAL_REPOSITORY,
  HabitRiskSignalRepository,
} from '../../../../habits/domain/repositories/habit-risk-signal.repository';
import {
  CONSISTENCY_SUMMARY_REPOSITORY,
  ConsistencySummaryRepository,
} from '../../../../habits/domain/repositories/consistency-summary.repository';
import {
  HABIT_SNAPSHOT_REPOSITORY,
  HabitSnapshotRepository,
} from '../../../../habits/domain/repositories/habit-snapshot.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import type { PersonalizationSourceContext } from '../../../../../shared/source-context';
import { PersonalizationCalculatorService } from '../../services/personalization-calculator.service';
import {
  PERSONALIZATION_SNAPSHOT_REPOSITORY,
  PersonalizationSnapshotRepository,
} from '../../../domain/repositories/personalization-snapshot.repository';
import {
  BUILD_PERSONALIZATION_SNAPSHOT_ERROR_CODES,
  BuildPersonalizationSnapshotError,
} from './build-personalization-snapshot.errors';
import { BuildPersonalizationSnapshotInput } from './build-personalization-snapshot.input';
import { BuildPersonalizationSnapshotOutput } from './build-personalization-snapshot.output';

const DEFAULT_NEUTRAL_SCORE = 50;
const RECENT_NOTIFICATION_LIMIT = 20;
const RECENT_COACH_DECISION_LIMIT = 5;
const PERSONALIZATION_CALCULATOR_VERSION = 'personalization-engine-v1';

@Injectable()
export class BuildPersonalizationSnapshotUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
    @Inject(HABIT_SNAPSHOT_REPOSITORY)
    private readonly habitSnapshotRepository: HabitSnapshotRepository,
    @Inject(CONSISTENCY_SUMMARY_REPOSITORY)
    private readonly consistencySummaryRepository: ConsistencySummaryRepository,
    @Inject(HABIT_RISK_SIGNAL_REPOSITORY)
    private readonly habitRiskSignalRepository: HabitRiskSignalRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    @Inject(GOAL_MILESTONE_REPOSITORY)
    private readonly goalMilestoneRepository: GoalMilestoneRepository,
    @Inject(GOAL_ACHIEVEMENT_REPOSITORY)
    private readonly goalAchievementRepository: GoalAchievementRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    @Inject(PERSONALIZATION_SNAPSHOT_REPOSITORY)
    private readonly personalizationSnapshotRepository: PersonalizationSnapshotRepository,
    private readonly personalizationCalculatorService: PersonalizationCalculatorService,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: BuildPersonalizationSnapshotInput,
  ): Promise<BuildPersonalizationSnapshotOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildPersonalizationSnapshotError(
        BUILD_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildPersonalizationSnapshotError(
          BUILD_PERSONALIZATION_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.platformDateService.getTodayDateString();

      const [
        engagementSummaryResult,
        latestHabitSnapshot,
        consistencySummary,
        habitRiskSignals,
        activeGoal,
        latestGoalProgressSnapshot,
        goalMilestones,
        goalAchievements,
        recoverySnapshot,
        latestNotificationHistory,
        latestCoachDecisionHistory,
        latestPersonalizationSnapshot,
      ] = await Promise.all([
        this.getEngagementSummaryUseCase.execute({ authUserId }),
        this.habitSnapshotRepository.findLatestByUserProfileId(userProfile.id),
        this.consistencySummaryRepository.findByUserProfileId(userProfile.id),
        this.habitRiskSignalRepository.findManyByUserProfileId(userProfile.id, {
          limit: 30,
        }),
        this.goalRepository.findActiveByUserProfileId(userProfile.id),
        this.resolveLatestGoalProgressSnapshot(userProfile.id),
        this.resolveGoalMilestones(userProfile.id),
        this.goalAchievementRepository.findManyByUserProfileId(userProfile.id),
        this.recoverySnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        ),
        this.notificationDecisionRepository.findManyByUserProfileId(
          userProfile.id,
          { limit: RECENT_NOTIFICATION_LIMIT },
        ),
        this.coachDecisionRepository.findRecentByUserProfileId(userProfile.id, {
          limit: RECENT_COACH_DECISION_LIMIT,
        }),
        this.personalizationSnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        ),
      ]);

      const previousSnapshotScore = latestPersonalizationSnapshot
        ? this.personalizationCalculatorService.calculate(
            latestPersonalizationSnapshot.sourceContext,
          ).compositeScore
        : DEFAULT_NEUTRAL_SCORE;

      const calculatorInput = {
        engagementScore:
          engagementSummaryResult.engagementSummary.engagementScore ??
          DEFAULT_NEUTRAL_SCORE,
        notificationDismissalRate: this.resolvePercentage(
          engagementSummaryResult.engagementSummary.dismissedCount,
          engagementSummaryResult.engagementSummary.recentEventsCount,
        ),
        notificationCompletionRate: this.resolvePercentage(
          engagementSummaryResult.engagementSummary.completedCount,
          engagementSummaryResult.engagementSummary.recentEventsCount,
        ),
        consistencyScore:
          latestHabitSnapshot?.consistencyScore ??
          consistencySummary?.score ??
          DEFAULT_NEUTRAL_SCORE,
        habitTrend:
          latestHabitSnapshot?.trend.value ??
          consistencySummary?.trend.value ??
          'stable',
        habitRiskLevel:
          consistencySummary?.riskLevel.value ??
          this.resolveHabitRiskLevelFromSignals(habitRiskSignals),
        goalTrend: latestGoalProgressSnapshot?.trend.value ?? 'stable',
        goalMilestoneReached:
          goalMilestones.some((milestone) => milestone.achieved) ||
          goalAchievements.length > 0,
        goalAchievementReached:
          Boolean(activeGoal && activeGoal.status.value === 'achieved') ||
          goalAchievements.length > 0,
        recoveryTrend: recoverySnapshot?.recoveryTrend ?? 'stable',
        recoveryAlertEngagement:
          recoverySnapshot?.sourceContext?.adherenceScore ??
          DEFAULT_NEUTRAL_SCORE,
        coachDecisionPriorityHistory: this.resolveCoachDecisionPriorityHistory(
          latestCoachDecisionHistory,
        ),
        activityHourDistribution: this.resolveActivityHourDistribution(
          latestNotificationHistory,
        ),
        previousSnapshotScore,
      };

      const calculatedResult =
        this.personalizationCalculatorService.calculate(calculatorInput);

      const sourceContext: PersonalizationSourceContext = {
        engagementScore: calculatorInput.engagementScore,
        notificationDismissalRate: calculatorInput.notificationDismissalRate,
        notificationCompletionRate: calculatorInput.notificationCompletionRate,
        consistencyScore: calculatorInput.consistencyScore,
        habitTrend: calculatorInput.habitTrend,
        habitRiskLevel: calculatorInput.habitRiskLevel,
        goalTrend: calculatorInput.goalTrend,
        goalMilestoneReached: calculatorInput.goalMilestoneReached,
        goalAchievementReached: calculatorInput.goalAchievementReached,
        recoveryTrend: calculatorInput.recoveryTrend,
        recoveryAlertEngagement: calculatorInput.recoveryAlertEngagement,
        coachDecisionPriorityHistory:
          calculatorInput.coachDecisionPriorityHistory,
        activityHourDistribution: calculatorInput.activityHourDistribution,
        previousSnapshotScore,
        formulaVersion: PERSONALIZATION_CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const persistedSnapshot =
        await this.personalizationSnapshotRepository.upsertDailySnapshot({
          userProfileId: userProfile.id,
          date: todayDate,
          preferredCoachingStyle: calculatedResult.preferredCoachingStyle,
          engagementProfile: calculatedResult.engagementProfile,
          notificationResponsiveness:
            calculatedResult.notificationResponsiveness,
          goalResponsiveness: calculatedResult.goalResponsiveness,
          recoveryResponsiveness: calculatedResult.recoveryResponsiveness,
          habitResponsiveness: calculatedResult.habitResponsiveness,
          riskOfDisengagement: calculatedResult.riskOfDisengagement,
          trend: calculatedResult.trend,
          sourceContext,
          formulaVersion: PERSONALIZATION_CALCULATOR_VERSION,
          generatedAt: sourceContext.generatedAt,
        });

      return {
        personalizationSnapshot: persistedSnapshot,
      };
    } catch (error) {
      if (error instanceof BuildPersonalizationSnapshotError) {
        throw error;
      }

      throw new BuildPersonalizationSnapshotError(
        BUILD_PERSONALIZATION_SNAPSHOT_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private async resolveLatestGoalProgressSnapshot(userProfileId: string) {
    const activeGoal =
      await this.goalRepository.findActiveByUserProfileId(userProfileId);

    if (!activeGoal) {
      return null;
    }

    return this.goalProgressSnapshotRepository.findLatestByGoalId(
      activeGoal.id,
    );
  }

  private async resolveGoalMilestones(userProfileId: string) {
    const activeGoal =
      await this.goalRepository.findActiveByUserProfileId(userProfileId);

    if (!activeGoal) {
      return [];
    }

    return this.goalMilestoneRepository.findManyByGoalId(activeGoal.id);
  }

  private resolvePercentage(count: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round((count / total) * 100);
  }

  private resolveHabitRiskLevelFromSignals(
    signals: Array<{
      level: { value?: 'low' | 'medium' | 'high' } | 'low' | 'medium' | 'high';
    }>,
  ): 'low' | 'medium' | 'high' {
    const levels = signals.map((signal) =>
      typeof signal.level === 'string' ? signal.level : signal.level.value,
    );

    if (levels.includes('high')) {
      return 'high';
    }

    if (levels.includes('medium')) {
      return 'medium';
    }

    return 'low';
  }

  private resolveCoachDecisionPriorityHistory(
    coachDecisions: Array<{ priority: { value: string } | string }>,
  ): string[] {
    return coachDecisions.map((decision) =>
      typeof decision.priority === 'string'
        ? decision.priority
        : decision.priority.value,
    );
  }

  private resolveActivityHourDistribution(
    notifications: Array<{ createdAt?: Date }>,
  ): {
    morning: number;
    afternoon: number;
    evening: number;
  } {
    return notifications.reduce(
      (distribution, notification) => {
        if (!notification.createdAt) {
          return distribution;
        }

        const hour = notification.createdAt.getUTCHours();

        if (hour >= 5 && hour < 12) {
          distribution.morning += 1;
        } else if (hour >= 12 && hour < 17) {
          distribution.afternoon += 1;
        } else {
          distribution.evening += 1;
        }

        return distribution;
      },
      { morning: 0, afternoon: 0, evening: 0 },
    );
  }
}
