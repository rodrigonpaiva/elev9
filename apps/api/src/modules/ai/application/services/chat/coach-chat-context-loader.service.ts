import { Inject, Injectable } from '@nestjs/common';

import {
  CoachDecisionReadModelMapper,
  HabitReadModelMapper,
  NotificationReadModelMapper,
  PersonalizationReadModelMapper,
} from '../../../../../shared/mappers';
import { GetCurrentNutritionPlanUseCase } from '../../../../nutrition/application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.use-case';
import { GetTodayNutritionUseCase } from '../../../../nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../../nutrition/domain/repositories/nutrition-log.repository';
import { GetDailyCheckInHistoryUseCase } from '../../../../progress/application/use-cases/get-daily-check-in-history/get-daily-check-in-history.use-case';
import { GetProgressSummaryUseCase } from '../../../../progress/application/use-cases/get-progress-summary/get-progress-summary.use-case';
import { GetWorkoutHistoryUseCase } from '../../../../progress/application/use-cases/get-workout-history/get-workout-history.use-case';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-history/get-goal-history.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetGoalAchievementHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-achievement-history/get-goal-achievement-history.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetCurrentCoachDecisionUseCase } from '../../use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetRecoveryHistoryUseCase } from '../../../../recovery/application/use-cases/get-recovery-history/get-recovery-history.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetHabitHistoryUseCase } from '../../../../habits/application/use-cases/get-habit-history/get-habit-history.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';
import type { BuildUserHealthContextDomain } from '../context-builder/build-user-health-context.service';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';

import {
  CoachChatLoadedContext,
  CoachChatProgressContext,
} from '../../use-cases/create-coach-chat/create-coach-chat.types';
import {
  CreateCoachChatError,
  CREATE_COACH_CHAT_ERROR_CODES,
} from '../../use-cases/create-coach-chat/create-coach-chat.errors';
import type { AgentContextDomain } from '../agent/agent.types';
import type { RecoverySnapshot } from '../../../../recovery/domain/entities/recovery-snapshot.entity';

export type CoachChatContextLoadOptions = {
  domains?: readonly AgentContextDomain[];
  userProfileId?: string;
};

@Injectable()
export class CoachChatContextLoaderService {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly getCurrentGoalUseCase: GetCurrentGoalUseCase,
    private readonly getGoalHistoryUseCase: GetGoalHistoryUseCase,
    private readonly getGoalMilestonesUseCase: GetGoalMilestonesUseCase,
    private readonly getGoalAchievementHistoryUseCase: GetGoalAchievementHistoryUseCase,
    private readonly getCurrentCoachDecisionUseCase: GetCurrentCoachDecisionUseCase,
    private readonly getRecoveryHistoryUseCase: GetRecoveryHistoryUseCase,
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly getCurrentHabitsUseCase: GetCurrentHabitsUseCase,
    private readonly getHabitHistoryUseCase: GetHabitHistoryUseCase,
    private readonly getConsistencySummaryUseCase: GetConsistencySummaryUseCase,
    private readonly getHabitRiskSignalsUseCase: GetHabitRiskSignalsUseCase,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly getUserBehaviorProfileUseCase: GetUserBehaviorProfileUseCase,
    private readonly getBehavioralPatternsUseCase: GetBehavioralPatternsUseCase,
    private readonly getCurrentNutritionPlanUseCase: GetCurrentNutritionPlanUseCase,
    private readonly getTodayNutritionUseCase: GetTodayNutritionUseCase,
    private readonly getDailyCheckInHistoryUseCase: GetDailyCheckInHistoryUseCase,
    private readonly getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase,
    private readonly getProgressSummaryUseCase: GetProgressSummaryUseCase,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
  ) {}

  async resolveUserProfileId(authUserId: string): Promise<string> {
    const userProfile =
      await this.userProfileRepository.findByAuthUserId(authUserId);

    if (!userProfile) {
      throw new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      );
    }

    return userProfile.id;
  }

  async load(
    authUserId: string,
    options: CoachChatContextLoadOptions = {},
  ): Promise<CoachChatLoadedContext> {
    const userProfileId =
      options.userProfileId ?? (await this.resolveUserProfileId(authUserId));
    const selectedDomains = new Set(options.domains ?? []);
    const shouldLoadHealth =
      options.domains === undefined || selectedDomains.has('health');
    const shouldLoadCoachDecision =
      options.domains === undefined ||
      selectedDomains.has('coach_decision') ||
      selectedDomains.has('health');
    const shouldLoadNotification =
      options.domains === undefined ||
      selectedDomains.has('notifications') ||
      selectedDomains.has('health');
    const shouldLoadHabits =
      options.domains === undefined ||
      selectedDomains.has('habits') ||
      selectedDomains.has('health') ||
      selectedDomains.has('training') ||
      selectedDomains.has('nutrition') ||
      selectedDomains.has('recovery') ||
      selectedDomains.has('goals') ||
      selectedDomains.has('progress') ||
      selectedDomains.has('personalization');
    const shouldLoadPersonalization =
      options.domains === undefined ||
      selectedDomains.has('personalization') ||
      selectedDomains.has('health');
    const shouldLoadNutrition =
      options.domains === undefined ||
      selectedDomains.has('nutrition') ||
      selectedDomains.has('health') ||
      selectedDomains.has('training') ||
      selectedDomains.has('goals') ||
      selectedDomains.has('progress') ||
      selectedDomains.has('recovery');
    const shouldLoadGoalContext =
      options.domains === undefined ||
      selectedDomains.has('goals') ||
      selectedDomains.has('training') ||
      selectedDomains.has('nutrition') ||
      selectedDomains.has('recovery') ||
      selectedDomains.has('progress') ||
      selectedDomains.has('health');
    const shouldLoadRecoveryHistory =
      options.domains === undefined ||
      selectedDomains.has('recovery') ||
      selectedDomains.has('training') ||
      selectedDomains.has('nutrition') ||
      selectedDomains.has('goals') ||
      selectedDomains.has('progress') ||
      selectedDomains.has('health');
    const shouldLoadProgress =
      options.domains === undefined ||
      selectedDomains.has('progress') ||
      selectedDomains.has('training') ||
      selectedDomains.has('nutrition') ||
      selectedDomains.has('recovery') ||
      selectedDomains.has('goals') ||
      selectedDomains.has('habits') ||
      selectedDomains.has('health');

    const healthContext = await this.buildUserHealthContextService.build({
      authUserId,
      userProfileId,
      domains: shouldLoadHealth
        ? (['health'] as BuildUserHealthContextDomain[])
        : (Array.from(
            new Set(
              options.domains?.filter((domain) =>
                this.isHealthDomain(domain),
              ) ?? [],
            ),
          ) as BuildUserHealthContextDomain[]),
    });
    const coachDecision = shouldLoadCoachDecision
      ? await this.resolveCoachDecision(authUserId)
      : undefined;
    const notification = shouldLoadNotification
      ? await this.resolveNotification(authUserId)
      : undefined;
    const habit = shouldLoadHabits
      ? await this.resolveHabit(authUserId)
      : undefined;
    const personalization = shouldLoadPersonalization
      ? await this.resolvePersonalization(authUserId)
      : undefined;
    const nutrition = shouldLoadNutrition
      ? await this.resolveNutrition({
          authUserId,
          userProfileId,
        })
      : undefined;
    const progress = shouldLoadProgress
      ? await this.resolveProgress(authUserId)
      : undefined;
    const goalContext = shouldLoadGoalContext
      ? await this.resolveGoalContext(authUserId)
      : undefined;
    const recoveryHistory = shouldLoadRecoveryHistory
      ? await this.resolveRecoveryHistory(authUserId)
      : undefined;

    return {
      userProfileId,
      healthContext,
      ...(goalContext ? { goalContext } : {}),
      ...(recoveryHistory ? { recoveryHistory } : {}),
      ...(nutrition?.nutritionPlan
        ? { nutritionPlan: nutrition.nutritionPlan }
        : {}),
      ...(nutrition?.todayNutrition
        ? { todayNutrition: nutrition.todayNutrition }
        : {}),
      ...(nutrition?.nutritionLogs
        ? { nutritionLogs: nutrition.nutritionLogs }
        : {}),
      ...(healthContext.nutritionContext
        ? { nutritionContext: healthContext.nutritionContext }
        : {}),
      ...(progress ? { progress } : {}),
      coachDecision: CoachDecisionReadModelMapper.toChatPayload(coachDecision),
      notification: notification
        ? NotificationReadModelMapper.toPromptPayload(
            notification.current,
            notification.engagementSummary,
          )
        : undefined,
      notificationMemory: notification
        ? NotificationReadModelMapper.toMemoryPayload(
            notification.current,
            notification.engagementSummary,
          )
        : undefined,
      habit: HabitReadModelMapper.toPromptPayload(habit),
      ...(habit?.history ? { habitHistory: habit.history } : {}),
      habitMemory: HabitReadModelMapper.toMemoryPayload(habit),
      personalization:
        PersonalizationReadModelMapper.toPromptPayload(personalization),
      personalizationMemory:
        PersonalizationReadModelMapper.toMemoryPayload(personalization),
    };
  }

  private async resolveRecoveryHistory(
    authUserId: string,
  ): Promise<RecoverySnapshot[] | undefined> {
    try {
      const result = await this.getRecoveryHistoryUseCase.execute({
        authUserId,
      });

      return result.recoverySnapshots;
    } catch {
      return undefined;
    }
  }

  private async resolveGoalContext(
    authUserId: string,
  ): Promise<CoachChatLoadedContext['goalContext']> {
    const [
      currentGoalResult,
      goalHistoryResult,
      goalMilestonesResult,
      goalAchievementHistoryResult,
    ] = await Promise.allSettled([
      this.getCurrentGoalUseCase.execute({
        authUserId,
      }),
      this.getGoalHistoryUseCase.execute({
        authUserId,
      }),
      this.getGoalMilestonesUseCase.execute({
        authUserId,
      }),
      this.getGoalAchievementHistoryUseCase.execute({
        authUserId,
      }),
    ]);

    const currentGoal =
      currentGoalResult.status === 'fulfilled'
        ? currentGoalResult.value.goal
        : undefined;
    const progressSnapshot =
      currentGoalResult.status === 'fulfilled'
        ? currentGoalResult.value.progressSnapshot
        : undefined;
    const forecast =
      currentGoalResult.status === 'fulfilled'
        ? currentGoalResult.value.forecast
        : undefined;
    const goalHistory =
      goalHistoryResult.status === 'fulfilled'
        ? goalHistoryResult.value.goalProgressSnapshots
        : undefined;
    const milestones =
      goalMilestonesResult.status === 'fulfilled'
        ? goalMilestonesResult.value.goalMilestones
        : undefined;
    const achievementHistory =
      goalAchievementHistoryResult.status === 'fulfilled'
        ? goalAchievementHistoryResult.value.goalAchievements
        : undefined;

    if (
      !currentGoal &&
      !progressSnapshot &&
      !forecast &&
      !goalHistory &&
      !milestones &&
      !achievementHistory
    ) {
      return undefined;
    }

    return {
      ...(currentGoal ? { currentGoal } : {}),
      ...(progressSnapshot ? { progressSnapshot } : {}),
      ...(forecast ? { forecast } : {}),
      ...(goalHistory ? { goalHistory } : {}),
      ...(milestones ? { milestones } : {}),
      ...(achievementHistory ? { achievementHistory } : {}),
    };
  }

  private isHealthDomain(domain: AgentContextDomain): boolean {
    return (
      domain === 'health' ||
      domain === 'training' ||
      domain === 'nutrition' ||
      domain === 'recovery' ||
      domain === 'goals' ||
      domain === 'progress'
    );
  }

  private async resolveNutrition(input: {
    authUserId: string;
    userProfileId: string;
  }) {
    const today = new Date().toISOString().slice(0, 10);

    const [nutritionPlanResult, todayNutritionResult, nutritionLogsResult] =
      await Promise.allSettled([
        this.getCurrentNutritionPlanUseCase.execute({
          authUserId: input.authUserId,
        }),
        this.getTodayNutritionUseCase.execute({
          authUserId: input.authUserId,
        }),
        this.nutritionLogRepository.findByUserProfileIdAndDate(
          input.userProfileId,
          today,
        ),
      ]);

    return {
      nutritionPlan:
        nutritionPlanResult.status === 'fulfilled'
          ? nutritionPlanResult.value.nutritionPlan
          : undefined,
      todayNutrition:
        todayNutritionResult.status === 'fulfilled'
          ? todayNutritionResult.value.todayNutrition
          : undefined,
      nutritionLogs:
        nutritionLogsResult.status === 'fulfilled'
          ? nutritionLogsResult.value
          : undefined,
    };
  }

  private async resolveCoachDecision(authUserId: string) {
    try {
      const result = await this.getCurrentCoachDecisionUseCase.execute({
        authUserId,
      });

      return result?.coachDecision;
    } catch {
      return undefined;
    }
  }

  private async resolveProgress(
    authUserId: string,
  ): Promise<CoachChatProgressContext | undefined> {
    try {
      const [weeklyResult, monthlyResult, historyResult, checkInResult] =
        await Promise.allSettled([
          this.getProgressSummaryUseCase.execute({
            authUserId,
            period: 'week',
          }),
          this.getProgressSummaryUseCase.execute({
            authUserId,
            period: 'month',
          }),
          this.getWorkoutHistoryUseCase.execute({
            authUserId,
            limit: 30,
          }),
          this.getDailyCheckInHistoryUseCase.execute({
            authUserId,
            limit: 30,
          }),
        ]);

      const progress: CoachChatProgressContext = {};

      if (weeklyResult.status === 'fulfilled') {
        progress.weeklySummary = weeklyResult.value.summary;
      }

      if (monthlyResult.status === 'fulfilled') {
        progress.monthlySummary = monthlyResult.value.summary;
      }

      if (historyResult.status === 'fulfilled') {
        progress.workoutHistory = historyResult.value.workoutLogs;
      }

      if (checkInResult.status === 'fulfilled') {
        progress.dailyCheckInHistory = checkInResult.value.dailyCheckIns;
      }

      return Object.keys(progress).length > 0 ? progress : undefined;
    } catch {
      return undefined;
    }
  }

  private async resolveNotification(authUserId: string) {
    try {
      const [currentResult, engagementSummaryResult] = await Promise.allSettled(
        [
          this.getCurrentNotificationUseCase.execute({
            authUserId,
          }),
          this.getEngagementSummaryUseCase.execute({
            authUserId,
          }),
        ],
      );

      return {
        current:
          currentResult.status === 'fulfilled'
            ? currentResult.value.notificationDecision
            : undefined,
        engagementSummary:
          engagementSummaryResult.status === 'fulfilled'
            ? engagementSummaryResult.value.engagementSummary
            : undefined,
      };
    } catch {
      return undefined;
    }
  }

  private async resolveHabit(authUserId: string) {
    try {
      const [currentResult, historyResult, summaryResult, riskSignalsResult] =
        await Promise.allSettled([
          this.getCurrentHabitsUseCase.execute({ authUserId }),
          this.getHabitHistoryUseCase.execute({ authUserId, limit: 30 }),
          this.getConsistencySummaryUseCase.execute({ authUserId }),
          this.getHabitRiskSignalsUseCase.execute({ authUserId }),
        ]);

      return {
        current:
          currentResult.status === 'fulfilled'
            ? currentResult.value.habitSnapshot
            : undefined,
        history:
          historyResult.status === 'fulfilled'
            ? historyResult.value.habitSnapshots
            : undefined,
        summary:
          summaryResult.status === 'fulfilled'
            ? summaryResult.value.consistencySummary
            : undefined,
        riskSignals:
          riskSignalsResult.status === 'fulfilled'
            ? riskSignalsResult.value.habitRiskSignals
            : undefined,
      };
    } catch {
      return undefined;
    }
  }

  private async resolvePersonalization(authUserId: string) {
    try {
      const [snapshotResult, profileResult, patternsResult] =
        await Promise.allSettled([
          this.getCurrentPersonalizationUseCase.execute({ authUserId }),
          this.getUserBehaviorProfileUseCase.execute({ authUserId }),
          this.getBehavioralPatternsUseCase.execute({ authUserId }),
        ]);

      return {
        snapshot:
          snapshotResult.status === 'fulfilled'
            ? snapshotResult.value.personalizationSnapshot
            : undefined,
        profile:
          profileResult.status === 'fulfilled'
            ? profileResult.value.userBehaviorProfile
            : undefined,
        patterns:
          patternsResult.status === 'fulfilled'
            ? patternsResult.value.behavioralPatterns
            : undefined,
      };
    } catch {
      return undefined;
    }
  }
}
