import { Inject, Injectable } from '@nestjs/common';

import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  NUTRITION_RECOMMENDATION_REPOSITORY,
  NutritionRecommendationRepository,
} from '../../../../nutrition/domain/repositories/nutrition-recommendation.repository';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../../goals/domain/repositories/goal.repository';
import {
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../../goals/domain/repositories/goal-progress-snapshot.repository';
import {
  GOAL_MILESTONE_REPOSITORY,
  GoalMilestoneRepository,
} from '../../../../goals/domain/repositories/goal-milestone.repository';
import {
  RECOVERY_SNAPSHOT_REPOSITORY,
  RecoverySnapshotRepository,
} from '../../../../recovery/domain/repositories/recovery-snapshot.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY,
  AdaptiveTrainingRecommendationRepository,
} from '../../../../training/domain/repositories/adaptive-training-recommendation.repository';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  COACH_DECISION_REPOSITORY,
  CoachDecisionRepository,
} from '../../../../ai/domain/repositories/coach-decision.repository';
import {
  ENGAGEMENT_EVENT_REPOSITORY,
  EngagementEventRepository,
} from '../../../domain/repositories/engagement-event.repository';
import {
  NOTIFICATION_DECISION_REPOSITORY,
  NotificationDecisionRepository,
} from '../../../domain/repositories/notification-decision.repository';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import type { PersonalizationReadModelSource } from '../../../../../shared/mappers';
import {
  PersonalizationReadModelMapper,
  type PersonalizationNotificationPayload,
} from '../../../../../shared/mappers';
import { NotificationDecisionCalculatorService } from '../../services/notification-decision-calculator.service';
import {
  NotificationFatiguePolicyService,
  type NotificationFatiguePolicyInput,
} from '../../services/notification-fatigue-policy.service';
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';
import type { NotificationSourceContext } from '../../../domain/notifications.types';
import {
  BUILD_NOTIFICATION_DECISION_ERROR_CODES,
  BuildNotificationDecisionError,
} from './build-notification-decision.errors';
import { BuildNotificationDecisionInput } from './build-notification-decision.input';
import { BuildNotificationDecisionOutput } from './build-notification-decision.output';

const RECENT_WINDOW_DAYS = 7;
const RECENT_ENGAGEMENT_EVENT_LIMIT = 20;
const RECENT_NUTRITION_RECOMMENDATION_LIMIT = 1;
const DEFAULT_NEUTRAL_SCORE = 50;
const MILESTONE_CLOSE_THRESHOLD = 10;
const NOTIFICATION_ENGINE_CALCULATOR_VERSION = 'notification-engine-v1';

type RecentCheckIn = {
  createdAt: Date;
};

type RecentWorkoutLog = {
  date: string;
};

type RecentNotificationDecision = {
  type: {
    value: string;
  };
  status: {
    value: string;
  };
  createdAt?: Date;
};

@Injectable()
export class BuildNotificationDecisionUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(COACH_DECISION_REPOSITORY)
    private readonly coachDecisionRepository: CoachDecisionRepository,
    @Inject(RECOVERY_SNAPSHOT_REPOSITORY)
    private readonly recoverySnapshotRepository: RecoverySnapshotRepository,
    @Inject(ADAPTIVE_TRAINING_RECOMMENDATION_REPOSITORY)
    private readonly adaptiveTrainingRecommendationRepository: AdaptiveTrainingRecommendationRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    @Inject(GOAL_MILESTONE_REPOSITORY)
    private readonly goalMilestoneRepository: GoalMilestoneRepository,
    @Inject(NUTRITION_RECOMMENDATION_REPOSITORY)
    private readonly nutritionRecommendationRepository: NutritionRecommendationRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    @Inject(ENGAGEMENT_EVENT_REPOSITORY)
    private readonly engagementEventRepository: EngagementEventRepository,
    @Inject(NOTIFICATION_DECISION_REPOSITORY)
    private readonly notificationDecisionRepository: NotificationDecisionRepository,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly notificationDecisionCalculatorService: NotificationDecisionCalculatorService,
    private readonly notificationFatiguePolicyService: NotificationFatiguePolicyService,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async execute(
    input: BuildNotificationDecisionInput,
  ): Promise<BuildNotificationDecisionOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new BuildNotificationDecisionError(
        BUILD_NOTIFICATION_DECISION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new BuildNotificationDecisionError(
          BUILD_NOTIFICATION_DECISION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const todayDate = this.platformDateService.getTodayDateString();
      const recentWindow = this.getRecentWindowDateRange(todayDate);
      const existingTodayNotification =
        await this.notificationDecisionRepository.findByUserProfileIdAndDate(
          userProfile.id,
          todayDate,
        );

      const latestCoachDecision =
        await this.coachDecisionRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const latestRecoverySnapshot =
        await this.recoverySnapshotRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const latestAdaptiveTrainingRecommendation =
        await this.adaptiveTrainingRecommendationRepository.findLatestByUserProfileId(
          userProfile.id,
        );
      const activeGoal = await this.goalRepository.findActiveByUserProfileId(
        userProfile.id,
      );
      const goalProgressSnapshot = activeGoal
        ? await this.goalProgressSnapshotRepository.findLatestByGoalId(
            activeGoal.id,
          )
        : null;
      const goalMilestones = activeGoal
        ? await this.goalMilestoneRepository.findManyByGoalId(activeGoal.id)
        : [];
      const latestNutritionRecommendation =
        await this.nutritionRecommendationRepository.findManyByUserProfileId(
          userProfile.id,
          RECENT_NUTRITION_RECOMMENDATION_LIMIT,
        );
      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );
      const activeTrainingPlan = fitnessProfile
        ? await this.trainingPlanRepository.findActiveByFitnessProfileId(
            fitnessProfile.id,
          )
        : null;

      const recentWorkoutLogs = activeTrainingPlan
        ? await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
            trainingPlanIds: [activeTrainingPlan.id],
            startDate: recentWindow.startDate,
            endDate: recentWindow.endDate,
          })
        : [];
      const recentWorkoutLogsCount = recentWorkoutLogs.length;
      const recentCheckIns = await this.getRecentCheckIns(
        userProfile.id,
        recentWindow.startDate,
        recentWindow.endDate,
      );
      const noRecentActivity =
        Boolean(activeTrainingPlan) &&
        recentWorkoutLogsCount === 0 &&
        recentCheckIns.length === 0;
      const missedWorkouts = this.resolveMissedWorkouts({
        activeTrainingPlanDays: activeTrainingPlan?.weeklySchedule.length ?? 0,
        recentWorkoutLogs,
        hasActiveTrainingPlan: Boolean(activeTrainingPlan),
      });
      const nutritionAdherence = this.resolveNutritionAdherence(
        latestNutritionRecommendation[0]?.contextSnapshot?.adherenceScore,
      );
      const goalProgressTrend = goalProgressSnapshot?.trend.value;
      const goalAchievementReached = Boolean(
        activeGoal &&
        (activeGoal.status.value === 'achieved' ||
          (goalProgressSnapshot?.progressPercentage ?? 0) >= 100),
      );
      const goalMilestoneClose = this.resolveGoalMilestoneClose(
        goalProgressSnapshot?.progressPercentage ?? 0,
        goalMilestones,
      );
      const recentEngagementEvents =
        await this.engagementEventRepository.findRecentByUserProfileId(
          userProfile.id,
          {
            limit: RECENT_ENGAGEMENT_EVENT_LIMIT,
          },
        );
      const fatigueLevel = this.resolveFatigueLevel(recentEngagementEvents);
      const coachDecisionPriority = this.resolveCoachDecisionPriority(
        latestCoachDecision?.priority,
      );
      const personalization = await this.resolvePersonalization(authUserId);
      const personalizationPayload =
        PersonalizationReadModelMapper.toNotificationPayload(personalization);

      const calculatorInput = {
        coachDecisionPriority,
        coachDecisionHeadline:
          latestCoachDecision?.headline?.trim() || undefined,
        coachDecisionInfluences:
          latestCoachDecision?.influences.map((influence) =>
            influence.toJSON(),
          ) ?? [],
        readinessScore:
          latestRecoverySnapshot?.readinessScore ?? DEFAULT_NEUTRAL_SCORE,
        fatigueScore:
          latestRecoverySnapshot?.fatigueScore ?? DEFAULT_NEUTRAL_SCORE,
        adaptiveRecommendationType:
          latestAdaptiveTrainingRecommendation?.recommendationType,
        goalProgressTrend,
        goalMilestoneClose,
        goalAchievementReached,
        nutritionAdherence,
        missedWorkouts,
        noRecentActivity,
        fatigueLevel,
      };

      const calculatedResult =
        this.notificationDecisionCalculatorService.calculate(calculatorInput);

      const recentNotifications =
        await this.notificationDecisionRepository.findManyByUserProfileId(
          userProfile.id,
          {
            limit: 20,
          },
        );
      const recentNotificationsInWindow = recentNotifications.filter(
        (notificationDecision) =>
          this.isWithinRecentWindow(
            notificationDecision.createdAt,
            recentWindow.startDate,
            recentWindow.endDate,
          ),
      );
      const notificationFatigueEvaluation =
        this.notificationFatiguePolicyService.evaluate(
          this.buildFatiguePolicyInput({
            candidateType: calculatedResult.type,
            candidatePriority: calculatedResult.priority,
            recentNotifications: recentNotificationsInWindow,
            recentEngagementEvents,
            personalization: personalizationPayload,
          }),
        );

      if (
        notificationFatigueEvaluation.suppressed &&
        existingTodayNotification
      ) {
        return {
          notificationDecision: existingTodayNotification,
        };
      }

      const sourceContext: NotificationSourceContext = {
        ...calculatedResult.sourceContext,
        coachDecisionId: latestCoachDecision?.id,
        coachDecisionHeadline:
          latestCoachDecision?.headline?.trim() || undefined,
        recentEngagementEventsCount: recentEngagementEvents.length,
        formulaVersion: NOTIFICATION_ENGINE_CALCULATOR_VERSION,
        generatedAt: new Date().toISOString(),
      };

      const notificationDecision =
        await this.notificationDecisionRepository.upsertDailyDecision({
          userProfileId: userProfile.id,
          date: todayDate,
          type: calculatedResult.type,
          priority: calculatedResult.priority,
          channel: calculatedResult.channel,
          status: notificationFatigueEvaluation.suppressed
            ? 'skipped'
            : calculatedResult.status,
          title: calculatedResult.title,
          message: calculatedResult.message,
          actionLabel: calculatedResult.actionLabel,
          actionTarget: calculatedResult.actionTarget,
          influences: calculatedResult.influences.map((influence) =>
            influence.toJSON(),
          ),
          sourceContext,
          suppressed: notificationFatigueEvaluation.suppressed,
          suppressionReasons: notificationFatigueEvaluation.reasons,
          fatigueLevel: notificationFatigueEvaluation.fatigueLevel,
          formulaVersion: calculatedResult.formulaVersion,
          generatedBy: 'deterministic',
        });

      return {
        notificationDecision,
      };
    } catch (error) {
      if (error instanceof BuildNotificationDecisionError) {
        throw error;
      }

      throw new BuildNotificationDecisionError(
        BUILD_NOTIFICATION_DECISION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private async getRecentCheckIns(
    userProfileId: string,
    startDate: string,
    endDate: string,
  ): Promise<RecentCheckIn[]> {
    const checkIns =
      await this.dailyCheckInRepository.findManyByUserProfileId(userProfileId);

    return checkIns.filter((checkIn) => {
      const dateString = this.platformDateService.getDateString(
        checkIn.createdAt,
      );

      return dateString >= startDate && dateString <= endDate;
    });
  }

  private resolveMissedWorkouts(input: {
    activeTrainingPlanDays: number;
    recentWorkoutLogs: RecentWorkoutLog[];
    hasActiveTrainingPlan: boolean;
  }): number {
    if (!input.hasActiveTrainingPlan || input.activeTrainingPlanDays <= 0) {
      return 0;
    }

    if (input.recentWorkoutLogs.length === 0) {
      return 0;
    }

    const uniqueWorkoutDates = new Set(
      input.recentWorkoutLogs.map((log) => log.date),
    ).size;

    return Math.max(0, input.activeTrainingPlanDays - uniqueWorkoutDates);
  }

  private resolveNutritionAdherence(
    adherenceScore: number | undefined,
  ): number {
    if (typeof adherenceScore !== 'number' || Number.isNaN(adherenceScore)) {
      return DEFAULT_NEUTRAL_SCORE;
    }

    return Math.max(0, Math.min(100, Math.round(adherenceScore)));
  }

  private resolveGoalMilestoneClose(
    progressPercentage: number,
    goalMilestones: Array<{
      targetValue: number;
      achieved: boolean;
    }>,
  ): boolean {
    return goalMilestones.some(
      (milestone) =>
        !milestone.achieved &&
        milestone.targetValue > progressPercentage &&
        milestone.targetValue - progressPercentage <= MILESTONE_CLOSE_THRESHOLD,
    );
  }

  private resolveFatigueLevel(
    recentEngagementEvents: Array<{
      type: 'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed';
    }>,
  ): 'low' | 'medium' | 'high' {
    if (recentEngagementEvents.length === 0) {
      return 'low';
    }

    const dismissedCount = recentEngagementEvents.filter(
      (event) => event.type === 'dismissed',
    ).length;
    const dismissalRatio = dismissedCount / recentEngagementEvents.length;

    if (recentEngagementEvents.length >= 8 && dismissalRatio >= 0.5) {
      return 'high';
    }

    if (recentEngagementEvents.length >= 4 && dismissalRatio >= 0.25) {
      return 'medium';
    }

    return 'low';
  }

  private resolveCoachDecisionPriority(
    priority: unknown,
  ):
    | 'recovery'
    | 'nutrition'
    | 'training'
    | 'consistency'
    | 'motivation'
    | undefined {
    if (
      priority &&
      typeof priority === 'object' &&
      'value' in priority &&
      typeof (priority as { value?: unknown }).value === 'string'
    ) {
      const value = (priority as { value: string }).value;

      if (
        value === 'recovery' ||
        value === 'nutrition' ||
        value === 'training' ||
        value === 'consistency' ||
        value === 'motivation'
      ) {
        return value;
      }
    }

    if (
      priority === 'recovery' ||
      priority === 'nutrition' ||
      priority === 'training' ||
      priority === 'consistency' ||
      priority === 'motivation'
    ) {
      return priority;
    }

    return undefined;
  }

  private buildFatiguePolicyInput(input: {
    candidateType: string;
    candidatePriority: 'low' | 'medium' | 'high' | 'urgent';
    recentNotifications: RecentNotificationDecision[];
    recentEngagementEvents: Array<{
      type: 'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed';
    }>;
    personalization?: PersonalizationNotificationPayload;
  }): NotificationFatiguePolicyInput {
    const dismissedCount = input.recentEngagementEvents.filter(
      (event) => event.type === 'dismissed',
    ).length;
    const engagementScore = this.resolveEngagementScore(
      input.recentEngagementEvents.filter(
        (event) =>
          event.type === 'opened' ||
          event.type === 'clicked' ||
          event.type === 'dismissed' ||
          event.type === 'completed',
      ),
    );

    return {
      candidateType:
        input.candidateType as NotificationFatiguePolicyInput['candidateType'],
      candidatePriority: input.candidatePriority,
      recentNotificationsCount: input.recentNotifications.length,
      recentSameTypeCount: input.recentNotifications.filter(
        (notificationDecision) =>
          notificationDecision.type.value === input.candidateType,
      ).length,
      dismissedCount,
      engagementScore,
      hoursSinceLastNotification: this.resolveHoursSinceLastNotification(
        input.recentNotifications[0]?.createdAt,
      ),
      ...(input.personalization
        ? {
            personalizationNotificationResponsiveness:
              input.personalization.notificationResponsiveness,
            personalizationRiskOfDisengagement:
              input.personalization.riskOfDisengagement,
          }
        : {}),
    };
  }

  private async resolvePersonalization(
    authUserId: string,
  ): Promise<PersonalizationReadModelSource | undefined> {
    try {
      const result = await this.getCurrentPersonalizationUseCase.execute({
        authUserId,
      });

      return {
        snapshot: result.personalizationSnapshot,
        profile: undefined,
        patterns: undefined,
      };
    } catch {
      return undefined;
    }
  }

  private resolveEngagementScore(
    recentEvents: Array<{
      type: 'impression' | 'opened' | 'clicked' | 'dismissed' | 'completed';
    }>,
  ): number {
    const openedCount = recentEvents.filter(
      (event) => event.type === 'opened',
    ).length;
    const clickedCount = recentEvents.filter(
      (event) => event.type === 'clicked',
    ).length;
    const dismissedCount = recentEvents.filter(
      (event) => event.type === 'dismissed',
    ).length;
    const completedCount = recentEvents.filter(
      (event) => event.type === 'completed',
    ).length;

    const score =
      50 +
      openedCount * 10 +
      clickedCount * 15 +
      completedCount * 20 -
      dismissedCount * 15;

    return Math.max(0, Math.min(100, score));
  }

  private resolveHoursSinceLastNotification(
    createdAt?: Date,
  ): number | undefined {
    if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
      return undefined;
    }

    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();

    return diffMs < 0 ? 0 : diffMs / (1000 * 60 * 60);
  }

  private isWithinRecentWindow(
    createdAt: Date | string | undefined,
    startDate: string,
    endDate: string,
  ): boolean {
    if (!createdAt) {
      return false;
    }

    const date = createdAt instanceof Date ? createdAt : new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    const dateString = this.platformDateService.getDateString(date);

    return dateString >= startDate && dateString <= endDate;
  }

  private getRecentWindowDateRange(todayDate: string): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date(`${todayDate}T00:00:00.000Z`);
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - (RECENT_WINDOW_DAYS - 1));

    return {
      startDate: this.platformDateService.getDateString(start),
      endDate: todayDate,
    };
  }
}
