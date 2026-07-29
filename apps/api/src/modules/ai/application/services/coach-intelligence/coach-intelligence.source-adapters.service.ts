import { Inject, Injectable } from '@nestjs/common';

import {
  CoachDecisionReadModelMapper,
  HabitReadModelMapper,
  NotificationReadModelMapper,
  PersonalizationReadModelMapper,
} from '../../../../../shared/mappers';
import { BuildUserHealthContextService } from '../context-builder/build-user-health-context.service';
import type { UserHealthContext } from '../context-builder/build-user-health-context.service';
import type {
  CoachIntelligenceSectionLoadResult,
  CoachIntelligenceSectionLoadResultWithExtras,
} from './coach-intelligence.types';
import type {
  CoachIntelligenceLoadedSectionName,
  CoachIntelligenceSourceLoadResult,
  CoachIntelligenceSourceSectionState,
} from './coach-intelligence.types';
import { CoachIntelligenceFreshnessPolicy } from './coach-intelligence.policy';
import type { CoachIntelligenceAvailabilityReasonCode } from '@elev9/types';
import type {
  NutritionLog as CoachNutritionLog,
  RecoverySnapshot as CoachRecoverySnapshot,
} from '@elev9/types';
import type {
  Goal as CoachGoal,
  GoalAchievement as CoachGoalAchievement,
  GoalForecast as CoachGoalForecast,
  GoalMilestone as CoachGoalMilestone,
  GoalProgressSnapshot as CoachGoalProgressSnapshot,
  HabitSnapshot as CoachHabitSnapshot,
  ConsistencySummary as CoachConsistencySummary,
  HabitRiskSignal as CoachHabitRiskSignal,
} from '@elev9/types';
import type {
  NotificationDecision as CoachNotificationDecision,
  NotificationSuppressionReason as CoachNotificationSuppressionReason,
} from '@elev9/types';
import type {
  CoachChatGoalContext,
  CoachChatLoadedContext,
  CoachChatProgressContext,
} from '../../use-cases/create-coach-chat/create-coach-chat.types';
import type { CoachDecisionReadModelPayload } from '../../../../../shared/mappers';
import type { AgentContextDomain } from '../agent/agent.types';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { TrainingPlan } from '../../../../training/domain/entities/training-plan.entity';
import { AdaptiveTrainingRecommendation } from '../../../../training/domain/entities/adaptive-training-recommendation.entity';
import { GetCurrentAdaptiveTrainingUseCase } from '../../../../training/application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import { Meal } from '../../../../nutrition/domain/entities/meal.entity';
import { NutritionPlan } from '../../../../nutrition/domain/entities/nutrition-plan.entity';
import { NutritionRecommendation } from '../../../../nutrition/domain/entities/nutrition-recommendation.entity';
import type { NutritionLog as NutritionLogEntity } from '../../../../nutrition/domain/entities/nutrition-log.entity';
import type { RecoverySnapshot as RecoverySnapshotEntity } from '../../../../recovery/domain/entities/recovery-snapshot.entity';
import { GetMyTrainingPlanUseCase } from '../../../../training/application/use-cases/get-my-training-plan/get-my-training-plan.use-case';
import { GetCurrentNutritionPlanUseCase } from '../../../../nutrition/application/use-cases/get-current-nutrition-plan/get-current-nutrition-plan.use-case';
import { GetTodayNutritionUseCase } from '../../../../nutrition/application/use-cases/get-today-nutrition/get-today-nutrition.use-case';
import { GetNutritionRecommendationsUseCase } from '../../../../nutrition/application/use-cases/get-nutrition-recommendations/get-nutrition-recommendations.use-case';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../../nutrition/domain/repositories/nutrition-log.repository';
import type { HabitSnapshot } from '../../../../habits/domain/entities/habit-snapshot.entity';
import type { NotificationDecisionJSON } from '../../../../notifications/domain/entities/notification-decision.entity';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-history/get-goal-history.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetGoalAchievementHistoryUseCase } from '../../../../goals/application/use-cases/get-goal-achievement-history/get-goal-achievement-history.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetHabitHistoryUseCase } from '../../../../habits/application/use-cases/get-habit-history/get-habit-history.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetProgressSummaryUseCase } from '../../../../progress/application/use-cases/get-progress-summary/get-progress-summary.use-case';
import { GetDailyCheckInHistoryUseCase } from '../../../../progress/application/use-cases/get-daily-check-in-history/get-daily-check-in-history.use-case';
import { GetWorkoutHistoryUseCase } from '../../../../progress/application/use-cases/get-workout-history/get-workout-history.use-case';
import { GetCurrentRecoveryUseCase } from '../../../../recovery/application/use-cases/get-current-recovery/get-current-recovery.use-case';
import { GetRecoveryHistoryUseCase } from '../../../../recovery/application/use-cases/get-recovery-history/get-recovery-history.use-case';
import { GetCurrentCoachDecisionUseCase } from '../../use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import {
  GetCoachIntelligenceError,
  COACH_INTELLIGENCE_ERROR_CODES,
} from './coach-intelligence.errors';
import { PlatformDateService } from '../../../../../shared/date/platform-date.service';

type SectionLoadPayload<TSectionData> = Readonly<{
  data: TSectionData | null;
  sourceTimestamp?: string;
  fallbackUsed: boolean;
  retryable: boolean;
  reasonCode: CoachIntelligenceAvailabilityReasonCode;
  disabled?: boolean;
}>;

const DATA_DOMAINS: readonly Exclude<
  AgentContextDomain,
  | 'health'
  | 'coach_decision'
  | 'conversation_memory'
  | 'recent_messages'
  | 'user_profile'
>[] = [
  'training',
  'nutrition',
  'recovery',
  'goals',
  'habits',
  'progress',
  'personalization',
  'notifications',
] as const;

@Injectable()
export class CoachIntelligenceSourceAdaptersService {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly getCurrentCoachDecisionUseCase: GetCurrentCoachDecisionUseCase,
    private readonly getMyTrainingPlanUseCase: GetMyTrainingPlanUseCase,
    private readonly getCurrentAdaptiveTrainingUseCase: GetCurrentAdaptiveTrainingUseCase,
    private readonly getCurrentNutritionPlanUseCase: GetCurrentNutritionPlanUseCase,
    private readonly getTodayNutritionUseCase: GetTodayNutritionUseCase,
    private readonly getNutritionRecommendationsUseCase: GetNutritionRecommendationsUseCase,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
    private readonly getCurrentRecoveryUseCase: GetCurrentRecoveryUseCase,
    private readonly getRecoveryHistoryUseCase: GetRecoveryHistoryUseCase,
    private readonly getCurrentGoalUseCase: GetCurrentGoalUseCase,
    private readonly getGoalHistoryUseCase: GetGoalHistoryUseCase,
    private readonly getGoalMilestonesUseCase: GetGoalMilestonesUseCase,
    private readonly getGoalAchievementHistoryUseCase: GetGoalAchievementHistoryUseCase,
    private readonly getCurrentHabitsUseCase: GetCurrentHabitsUseCase,
    private readonly getHabitHistoryUseCase: GetHabitHistoryUseCase,
    private readonly getConsistencySummaryUseCase: GetConsistencySummaryUseCase,
    private readonly getHabitRiskSignalsUseCase: GetHabitRiskSignalsUseCase,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly getUserBehaviorProfileUseCase: GetUserBehaviorProfileUseCase,
    private readonly getBehavioralPatternsUseCase: GetBehavioralPatternsUseCase,
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly getProgressSummaryUseCase: GetProgressSummaryUseCase,
    private readonly getDailyCheckInHistoryUseCase: GetDailyCheckInHistoryUseCase,
    private readonly getWorkoutHistoryUseCase: GetWorkoutHistoryUseCase,
    private readonly freshnessPolicy: CoachIntelligenceFreshnessPolicy,
    private readonly platformDateService: PlatformDateService,
  ) {}

  async load(input: {
    authUserId: string;
    userProfileId?: string;
    userProfile?: { id: string; name?: string };
    generatedAt: string;
  }): Promise<CoachIntelligenceSourceLoadResult> {
    if (
      input.userProfile &&
      input.userProfileId &&
      input.userProfile.id !== input.userProfileId.trim()
    ) {
      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    const userProfile = input.userProfile
      ? Object.freeze({
          id: input.userProfile.id,
          ...(input.userProfile.name ? { name: input.userProfile.name } : {}),
        })
      : await this.resolveUserProfile(input);
    const loadStartedAt = Date.now();
    const healthContext = await this.buildUserHealthContextService.build({
      authUserId: input.authUserId,
      userProfileId: userProfile.id,
    });
    const coachDecisionResult = await this.loadCoachDecision(input.authUserId);

    const [
      training,
      nutrition,
      recovery,
      goals,
      habits,
      progress,
      personalization,
      notifications,
    ] = await Promise.all([
      this.loadTraining({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        healthContext,
        generatedAt: input.generatedAt,
      }),
      this.loadNutrition({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        healthContext,
        generatedAt: input.generatedAt,
      }),
      this.loadRecovery({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        healthContext,
        generatedAt: input.generatedAt,
      }),
      this.loadGoals({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        generatedAt: input.generatedAt,
      }),
      this.loadHabits({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        generatedAt: input.generatedAt,
      }),
      this.loadProgress({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        healthContext,
        generatedAt: input.generatedAt,
      }),
      this.loadPersonalization({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        generatedAt: input.generatedAt,
      }),
      this.loadNotifications({
        authUserId: input.authUserId,
        userProfileId: userProfile.id,
        generatedAt: input.generatedAt,
      }),
    ]);

    const sections = Object.freeze({
      training: training.state,
      nutrition: nutrition.state,
      recovery: recovery.state,
      goals: goals.state,
      habits: habits.state,
      progress: progress.state,
      personalization: personalization.state,
      notifications: notifications.state,
    });

    const sectionLoadDurationsMs = Object.freeze({
      training: training.loadDurationMs,
      nutrition: nutrition.loadDurationMs,
      recovery: recovery.loadDurationMs,
      goals: goals.loadDurationMs,
      habits: habits.loadDurationMs,
      progress: progress.loadDurationMs,
      personalization: personalization.loadDurationMs,
      notifications: notifications.loadDurationMs,
    });

    const expertContext = Object.freeze({
      userProfileId: userProfile.id,
      healthContext,
      ...(goals.context ? { goalContext: goals.context } : {}),
      ...(progress.context ? { progress: progress.context } : {}),
      ...(recovery.history && recovery.history.length > 0
        ? { recoveryHistory: Object.freeze([...recovery.history]) }
        : {}),
      ...(nutrition.context?.nutritionPlan
        ? { nutritionPlan: nutrition.context.nutritionPlan }
        : {}),
      ...(nutrition.context?.todayNutrition
        ? { todayNutrition: nutrition.context.todayNutrition }
        : {}),
      ...(nutrition.context?.nutritionLogs &&
      nutrition.context.nutritionLogs.length > 0
        ? { nutritionLogs: Object.freeze([...nutrition.context.nutritionLogs]) }
        : {}),
      ...(healthContext.nutritionContext
        ? { nutritionContext: healthContext.nutritionContext }
        : {}),
      ...(habits.state.data
        ? {
            habit: {
              current: habits.state.data.habitSnapshot ?? undefined,
              summary: habits.state.data.consistencySummary ?? undefined,
              riskSignals: habits.state.data.habitRiskSignals ?? undefined,
            },
          }
        : {}),
      ...(habits.history && habits.history.length > 0
        ? { habitHistory: Object.freeze([...habits.history]) }
        : {}),
      ...(coachDecisionResult ? { coachDecision: coachDecisionResult } : {}),
    }) satisfies CoachChatLoadedContext;

    return Object.freeze({
      authUserId: input.authUserId,
      userProfileId: userProfile.id,
      healthContext,
      sections,
      coachDecision: coachDecisionResult,
      expertContext,
      selectedDomains: DATA_DOMAINS,
      generatedAt: input.generatedAt,
      loadDurationMs: Date.now() - loadStartedAt,
      source: Object.freeze({
        loadDurationMs: Date.now() - loadStartedAt,
      }),
      sectionLoadDurationsMs,
    });
  }

  async resolveUserProfile(input: {
    authUserId: string;
    userProfileId?: string;
  }): Promise<{ id: string; name?: string }> {
    const authUserId = input.authUserId.trim();

    if (!authUserId) {
      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    const resolvedProfile =
      await this.userProfileRepository.findByAuthUserId(authUserId);

    if (!resolvedProfile) {
      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      );
    }

    const requestedUserProfileId = input.userProfileId?.trim();

    if (
      requestedUserProfileId &&
      requestedUserProfileId !== resolvedProfile.id
    ) {
      throw new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    return resolvedProfile;
  }

  private async loadCoachDecision(
    authUserId: string,
  ): Promise<CoachDecisionReadModelPayload | undefined> {
    try {
      const result = await this.getCurrentCoachDecisionUseCase.execute({
        authUserId,
      });

      return CoachDecisionReadModelMapper.toChatPayload(result.coachDecision);
    } catch {
      return undefined;
    }
  }

  private async loadTraining(input: {
    authUserId: string;
    userProfileId: string;
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResult<
      CoachIntelligenceSourceLoadResult['sections']['training']['data']
    >
  > {
    return this.loadSection({
      sectionName: 'training',
      generatedAt: input.generatedAt,
      run: async () => {
        const [planResult, recommendationResult] = await Promise.allSettled([
          this.getMyTrainingPlanUseCase.execute({
            authUserId: input.authUserId,
          }),
          this.getCurrentAdaptiveTrainingUseCase.execute({
            authUserId: input.authUserId,
          }),
        ]);

        const trainingPlan =
          planResult.status === 'fulfilled'
            ? this.mapTrainingPlan(planResult.value.trainingPlan)
            : null;
        const adaptiveTrainingRecommendation =
          recommendationResult.status === 'fulfilled'
            ? this.mapAdaptiveTrainingRecommendation(
                recommendationResult.value.adaptiveTrainingRecommendation,
              )
            : null;
        const data =
          trainingPlan || adaptiveTrainingRecommendation
            ? {
                trainingPlan,
                adaptiveTrainingRecommendation,
              }
            : null;
        const sourceTimestamp = this.resolveLatestTimestamp([
          trainingPlan?.createdAt,
          adaptiveTrainingRecommendation?.updatedAt,
          adaptiveTrainingRecommendation?.createdAt,
          input.healthContext.generatedAt,
        ]);

        return {
          data,
          sourceTimestamp,
          fallbackUsed: Boolean(
            (planResult.status === 'rejected' ||
              recommendationResult.status === 'rejected') &&
            data,
          ),
          retryable: this.isRetryable([planResult, recommendationResult]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data,
            rejected: [planResult, recommendationResult],
          }),
        };
      },
    });
  }

  private async loadNutrition(input: {
    authUserId: string;
    userProfileId: string;
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResultWithExtras<
      CoachIntelligenceSourceLoadResult['sections']['nutrition']['data'],
      {
        logs?: readonly CoachNutritionLog[];
        context?: Readonly<{
          nutritionPlan?: NutritionPlan;
          todayNutrition?: CoachChatLoadedContext['todayNutrition'];
          nutritionLogs?: readonly NutritionLogEntity[];
        }>;
      }
    >
  > {
    return this.loadSection({
      sectionName: 'nutrition',
      generatedAt: input.generatedAt,
      run: async () => {
        const today = this.platformDateService.getTodayDateString(
          new Date(input.generatedAt),
        );
        const [planResult, todayResult, recommendationResult, logsResult] =
          await Promise.allSettled([
            this.getCurrentNutritionPlanUseCase.execute({
              authUserId: input.authUserId,
            }),
            this.getTodayNutritionUseCase.execute({
              authUserId: input.authUserId,
            }),
            this.getNutritionRecommendationsUseCase.execute({
              authUserId: input.authUserId,
              limit: 1,
            }),
            this.nutritionLogRepository.findByUserProfileIdAndDate(
              input.userProfileId,
              today,
            ),
          ]);

        const nutritionPlan =
          planResult.status === 'fulfilled'
            ? this.mapNutritionPlan(planResult.value.nutritionPlan)
            : null;
        const todayNutrition =
          todayResult.status === 'fulfilled'
            ? todayResult.value.todayNutrition
            : null;
        const nutritionRecommendation =
          recommendationResult.status === 'fulfilled'
            ? this.mapNutritionRecommendation(
                recommendationResult.value.recommendations[0] ?? null,
              )
            : null;
        const nutritionLogs =
          logsResult.status === 'fulfilled'
            ? logsResult.value.map((log) => this.mapNutritionLog(log))
            : [];
        const context = {
          ...(planResult.status === 'fulfilled'
            ? { nutritionPlan: planResult.value.nutritionPlan }
            : {}),
          ...(todayResult.status === 'fulfilled'
            ? { todayNutrition: todayResult.value.todayNutrition }
            : {}),
          ...(logsResult.status === 'fulfilled'
            ? { nutritionLogs: logsResult.value }
            : {}),
        };
        const data =
          nutritionPlan || todayNutrition || nutritionRecommendation
            ? {
                nutritionPlan,
                todayNutrition,
                nutritionRecommendation,
              }
            : null;

        return {
          data,
          sourceTimestamp: this.resolveLatestTimestamp([
            nutritionPlan?.updatedAt,
            nutritionPlan?.replacedAt,
            nutritionPlan?.createdAt,
            nutritionRecommendation?.createdAt,
            todayNutrition?.date
              ? `${todayNutrition.date}T00:00:00.000Z`
              : undefined,
          ]),
          fallbackUsed: Boolean(
            (planResult.status === 'rejected' ||
              todayResult.status === 'rejected' ||
              recommendationResult.status === 'rejected') &&
            data,
          ),
          retryable: this.isRetryable([
            planResult,
            todayResult,
            recommendationResult,
          ]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data,
            rejected: [planResult, todayResult, recommendationResult],
          }),
          logs: Object.freeze([...nutritionLogs]),
          context,
        };
      },
    });
  }

  private async loadRecovery(input: {
    authUserId: string;
    userProfileId: string;
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResultWithExtras<
      CoachIntelligenceSourceLoadResult['sections']['recovery']['data'],
      { history?: readonly RecoverySnapshotEntity[] }
    >
  > {
    return this.loadSection({
      sectionName: 'recovery',
      generatedAt: input.generatedAt,
      run: async () => {
        const [currentResult, historyResult] = await Promise.allSettled([
          this.getCurrentRecoveryUseCase.execute({
            authUserId: input.authUserId,
          }),
          this.getRecoveryHistoryUseCase.execute({
            authUserId: input.authUserId,
          }),
        ]);

        const recoverySnapshot =
          currentResult.status === 'fulfilled'
            ? this.mapRecoverySnapshot(currentResult.value.recoverySnapshot)
            : input.healthContext.recoverySnapshot
              ? this.mapHealthRecoverySnapshot({
                  userProfileId: input.userProfileId,
                  snapshot: input.healthContext.recoverySnapshot,
                })
              : null;
        const recoveryHistory =
          historyResult.status === 'fulfilled'
            ? historyResult.value.recoverySnapshots
            : [];

        return {
          data: recoverySnapshot ? { recoverySnapshot } : null,
          sourceTimestamp: this.resolveLatestTimestamp([
            recoverySnapshot?.createdAt,
            ...(recoveryHistory.map((snapshot) => snapshot.createdAt) ?? []),
          ]),
          fallbackUsed: Boolean(
            currentResult.status === 'rejected' ||
            historyResult.status === 'rejected',
          ),
          retryable: this.isRetryable([currentResult, historyResult]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data: recoverySnapshot ? { recoverySnapshot } : null,
            rejected: [currentResult, historyResult],
          }),
          history: Object.freeze([...recoveryHistory]),
        };
      },
    });
  }

  private async loadGoals(input: {
    authUserId: string;
    userProfileId: string;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResultWithExtras<
      CoachIntelligenceSourceLoadResult['sections']['goals']['data'],
      { context?: CoachChatGoalContext }
    >
  > {
    return this.loadSection({
      sectionName: 'goals',
      generatedAt: input.generatedAt,
      run: async () => {
        const [
          currentResult,
          historyResult,
          milestonesResult,
          achievementsResult,
        ] = await Promise.allSettled([
          this.getCurrentGoalUseCase.execute({
            authUserId: input.authUserId,
          }),
          this.getGoalHistoryUseCase.execute({
            authUserId: input.authUserId,
          }),
          this.getGoalMilestonesUseCase.execute({
            authUserId: input.authUserId,
          }),
          this.getGoalAchievementHistoryUseCase.execute({
            authUserId: input.authUserId,
          }),
        ]);

        const currentGoal =
          currentResult.status === 'fulfilled'
            ? currentResult.value.goal
            : undefined;
        const progressSnapshot =
          currentResult.status === 'fulfilled'
            ? currentResult.value.progressSnapshot
            : undefined;
        const forecast =
          currentResult.status === 'fulfilled'
            ? currentResult.value.forecast
            : undefined;
        const goalHistory =
          historyResult.status === 'fulfilled'
            ? historyResult.value.goalProgressSnapshots
            : undefined;
        const milestones =
          milestonesResult.status === 'fulfilled'
            ? milestonesResult.value.goalMilestones
            : undefined;
        const achievementHistory =
          achievementsResult.status === 'fulfilled'
            ? achievementsResult.value.goalAchievements
            : undefined;
        const goalContext: CoachChatGoalContext = {
          ...(currentGoal ? { currentGoal } : {}),
          ...(progressSnapshot ? { progressSnapshot } : {}),
          ...(forecast ? { forecast } : {}),
          ...(goalHistory ? { goalHistory } : {}),
          ...(milestones ? { milestones } : {}),
          ...(achievementHistory ? { achievementHistory } : {}),
        };
        const publicCurrentGoal = currentGoal
          ? this.toPlainValue<CoachGoal>(currentGoal)
          : null;
        const publicProgressSnapshot = progressSnapshot
          ? this.toPlainValue<CoachGoalProgressSnapshot>(progressSnapshot)
          : null;
        const publicForecast = forecast
          ? this.toPlainValue<CoachGoalForecast>(forecast)
          : null;
        const publicMilestones =
          milestones?.map((item) =>
            this.toPlainValue<CoachGoalMilestone>(item),
          ) ?? [];
        const publicAchievements =
          achievementHistory?.map((item) =>
            this.toPlainValue<CoachGoalAchievement>(item),
          ) ?? [];
        const publicGoalContext =
          currentGoal ||
          progressSnapshot ||
          forecast ||
          goalHistory ||
          milestones ||
          achievementHistory
            ? {
                currentGoal: publicCurrentGoal,
                progressSnapshot: publicProgressSnapshot,
                forecast: publicForecast,
                milestones: publicMilestones,
                achievements: publicAchievements,
              }
            : null;
        const hasData = Boolean(
          goalContext.currentGoal ||
          goalContext.progressSnapshot ||
          goalContext.forecast ||
          (goalContext.goalHistory?.length ?? 0) > 0 ||
          (goalContext.milestones?.length ?? 0) > 0 ||
          (goalContext.achievementHistory?.length ?? 0) > 0,
        );

        return {
          data: publicGoalContext,
          sourceTimestamp: this.resolveLatestTimestamp([
            goalContext.currentGoal?.createdAt,
            goalContext.currentGoal?.updatedAt,
            goalContext.progressSnapshot?.formulaVersion
              ? input.generatedAt
              : undefined,
            ...(goalContext.goalHistory ?? []).map((entry) =>
              entry.formulaVersion ? input.generatedAt : undefined,
            ),
            ...(goalContext.milestones ?? []).map(
              (milestone) => milestone.achievedAt,
            ),
            ...(goalContext.achievementHistory ?? []).map(
              (achievement) => achievement.achievedAt,
            ),
            goalContext.forecast?.generatedAt,
          ]),
          fallbackUsed:
            this.hasAnyRejected([
              currentResult,
              historyResult,
              milestonesResult,
              achievementsResult,
            ]) && hasData,
          retryable: this.isRetryable([
            currentResult,
            historyResult,
            milestonesResult,
            achievementsResult,
          ]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data: hasData
              ? {
                  currentGoal: publicCurrentGoal,
                  progressSnapshot: publicProgressSnapshot,
                  forecast: publicForecast,
                  milestones: publicMilestones,
                  achievements: publicAchievements,
                }
              : null,
            rejected: [
              currentResult,
              historyResult,
              milestonesResult,
              achievementsResult,
            ],
          }),
          context: hasData ? goalContext : undefined,
        };
      },
    });
  }

  private async loadHabits(input: {
    authUserId: string;
    userProfileId: string;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResultWithExtras<
      CoachIntelligenceSourceLoadResult['sections']['habits']['data'],
      {
        current?: HabitSnapshot;
        history?: readonly HabitSnapshot[];
      }
    >
  > {
    return this.loadSection({
      sectionName: 'habits',
      generatedAt: input.generatedAt,
      run: async () => {
        const [currentResult, historyResult, summaryResult, riskSignalsResult] =
          await Promise.allSettled([
            this.getCurrentHabitsUseCase.execute({
              authUserId: input.authUserId,
            }),
            this.getHabitHistoryUseCase.execute({
              authUserId: input.authUserId,
              limit: 30,
            }),
            this.getConsistencySummaryUseCase.execute({
              authUserId: input.authUserId,
            }),
            this.getHabitRiskSignalsUseCase.execute({
              authUserId: input.authUserId,
            }),
          ]);

        const current =
          currentResult.status === 'fulfilled'
            ? currentResult.value.habitSnapshot
            : null;
        const history =
          historyResult.status === 'fulfilled'
            ? historyResult.value.habitSnapshots
            : [];
        const summary =
          summaryResult.status === 'fulfilled'
            ? this.toPlainValue<CoachConsistencySummary>(
                summaryResult.value.consistencySummary,
              )
            : null;
        const riskSignals =
          riskSignalsResult.status === 'fulfilled'
            ? riskSignalsResult.value.habitRiskSignals
            : [];
        const publicCurrentHabit = current
          ? this.toPlainValue<CoachHabitSnapshot>(current)
          : null;
        const publicSummary = summary
          ? this.toPlainValue<CoachConsistencySummary>(summary)
          : null;
        const publicRiskSignalPayloads = riskSignals.map((item) =>
          this.toPlainValue<CoachHabitRiskSignal>(item),
        );
        const hasData = Boolean(current || summary || riskSignals.length > 0);

        return {
          data: hasData
            ? {
                habitSnapshot: publicCurrentHabit,
                consistencySummary: publicSummary,
                habitRiskSignals: publicRiskSignalPayloads,
              }
            : null,
          sourceTimestamp: this.resolveLatestTimestamp([
            current?.generatedAt,
            summary?.updatedAt,
            ...(history ?? []).map((entry) => entry.generatedAt),
            ...(riskSignals ?? []).map((signal) => signal.generatedAt),
          ]),
          fallbackUsed:
            this.hasAnyRejected([
              currentResult,
              historyResult,
              summaryResult,
              riskSignalsResult,
            ]) && hasData,
          retryable: this.isRetryable([
            currentResult,
            historyResult,
            summaryResult,
            riskSignalsResult,
          ]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data: hasData
              ? {
                  habitSnapshot: publicCurrentHabit,
                  consistencySummary: publicSummary,
                  habitRiskSignals: publicRiskSignalPayloads,
                }
              : null,
            rejected: [
              currentResult,
              historyResult,
              summaryResult,
              riskSignalsResult,
            ],
          }),
          current: current ?? undefined,
          history: Object.freeze([...history]),
        };
      },
    });
  }

  private async loadProgress(input: {
    authUserId: string;
    userProfileId: string;
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResultWithExtras<
      CoachIntelligenceSourceLoadResult['sections']['progress']['data'],
      { context?: CoachChatProgressContext }
    >
  > {
    return this.loadSection({
      sectionName: 'progress',
      generatedAt: input.generatedAt,
      run: async () => {
        const [weekResult, monthResult, historyResult, checkInResult] =
          await Promise.allSettled([
            this.getProgressSummaryUseCase.execute({
              authUserId: input.authUserId,
              period: 'week',
            }),
            this.getProgressSummaryUseCase.execute({
              authUserId: input.authUserId,
              period: 'month',
            }),
            this.getWorkoutHistoryUseCase.execute({
              authUserId: input.authUserId,
              limit: 30,
            }),
            this.getDailyCheckInHistoryUseCase.execute({
              authUserId: input.authUserId,
              limit: 30,
            }),
          ]);

        const weeklySummary =
          weekResult.status === 'fulfilled' ? weekResult.value.summary : null;
        const monthlySummary =
          monthResult.status === 'fulfilled' ? monthResult.value.summary : null;
        const workoutHistory =
          historyResult.status === 'fulfilled'
            ? historyResult.value.workoutLogs
            : [];
        const dailyCheckInHistory =
          checkInResult.status === 'fulfilled'
            ? checkInResult.value.dailyCheckIns
            : [];
        const latestDailyCheckIn =
          dailyCheckInHistory[0] ?? input.healthContext.latestCheckIn ?? null;
        const progressContext: CoachChatProgressContext = {
          ...(weeklySummary ? { weeklySummary } : {}),
          ...(monthlySummary ? { monthlySummary } : {}),
          ...(workoutHistory.length > 0 ? { workoutHistory } : {}),
          ...(dailyCheckInHistory.length > 0 ? { dailyCheckInHistory } : {}),
        };
        const hasData = Boolean(
          weeklySummary || monthlySummary || latestDailyCheckIn,
        );

        return {
          data: hasData
            ? {
                progressSummary: weeklySummary ?? monthlySummary ?? null,
                dailyCheckIn: latestDailyCheckIn
                  ? {
                      id: latestDailyCheckIn.id,
                      energyLevel: latestDailyCheckIn.energyLevel,
                      sleepQuality: latestDailyCheckIn.sleepQuality,
                      muscleSoreness: latestDailyCheckIn.muscleSoreness,
                      motivationLevel: latestDailyCheckIn.motivationLevel,
                      createdAt: latestDailyCheckIn.createdAt,
                    }
                  : null,
              }
            : null,
          sourceTimestamp: this.resolveLatestTimestamp([
            latestDailyCheckIn?.createdAt,
            weeklySummary?.lastWorkoutDate
              ? `${weeklySummary.lastWorkoutDate}T00:00:00.000Z`
              : undefined,
            monthlySummary?.lastWorkoutDate
              ? `${monthlySummary.lastWorkoutDate}T00:00:00.000Z`
              : undefined,
            ...(workoutHistory ?? []).map((entry) => entry.createdAt),
            ...(dailyCheckInHistory ?? []).map((entry) => entry.createdAt),
          ]),
          fallbackUsed:
            this.hasAnyRejected([
              weekResult,
              monthResult,
              historyResult,
              checkInResult,
            ]) && hasData,
          retryable: this.isRetryable([
            weekResult,
            monthResult,
            historyResult,
            checkInResult,
          ]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data: hasData
              ? {
                  progressSummary: weeklySummary ?? monthlySummary ?? null,
                  dailyCheckIn: latestDailyCheckIn
                    ? {
                        id: latestDailyCheckIn.id,
                        energyLevel: latestDailyCheckIn.energyLevel,
                        sleepQuality: latestDailyCheckIn.sleepQuality,
                        muscleSoreness: latestDailyCheckIn.muscleSoreness,
                        motivationLevel: latestDailyCheckIn.motivationLevel,
                        createdAt: latestDailyCheckIn.createdAt,
                      }
                    : null,
                }
              : null,
            rejected: [weekResult, monthResult, historyResult, checkInResult],
          }),
          context: hasData ? progressContext : undefined,
        };
      },
    });
  }

  private async loadPersonalization(input: {
    authUserId: string;
    userProfileId: string;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResult<
      CoachIntelligenceSourceLoadResult['sections']['personalization']['data']
    >
  > {
    return this.loadSection({
      sectionName: 'personalization',
      generatedAt: input.generatedAt,
      run: async () => {
        const [snapshotResult, profileResult, patternsResult] =
          await Promise.allSettled([
            this.getCurrentPersonalizationUseCase.execute({
              authUserId: input.authUserId,
            }),
            this.getUserBehaviorProfileUseCase.execute({
              authUserId: input.authUserId,
            }),
            this.getBehavioralPatternsUseCase.execute({
              authUserId: input.authUserId,
            }),
          ]);

        const personalizationSnapshot =
          snapshotResult.status === 'fulfilled'
            ? snapshotResult.value.personalizationSnapshot.toJSON()
            : null;
        const userBehaviorProfile =
          profileResult.status === 'fulfilled'
            ? profileResult.value.userBehaviorProfile.toJSON()
            : null;
        const behavioralPatterns =
          patternsResult.status === 'fulfilled'
            ? patternsResult.value.behavioralPatterns.map((item) =>
                item.toJSON(),
              )
            : [];
        const hasData = Boolean(
          personalizationSnapshot ||
          userBehaviorProfile ||
          behavioralPatterns.length > 0,
        );

        return {
          data: hasData
            ? {
                personalizationSnapshot,
                userBehaviorProfile,
                behavioralPatterns,
              }
            : null,
          sourceTimestamp: this.resolveLatestTimestamp([
            personalizationSnapshot?.generatedAt,
            personalizationSnapshot?.updatedAt,
            userBehaviorProfile?.updatedAt,
            userBehaviorProfile?.createdAt,
            ...(behavioralPatterns ?? []).map(
              (pattern) => pattern.lastObservedAt,
            ),
          ]),
          fallbackUsed:
            this.hasAnyRejected([
              snapshotResult,
              profileResult,
              patternsResult,
            ]) && hasData,
          retryable: this.isRetryable([
            snapshotResult,
            profileResult,
            patternsResult,
          ]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data: hasData
              ? {
                  personalizationSnapshot,
                  userBehaviorProfile,
                  behavioralPatterns,
                }
              : null,
            rejected: [snapshotResult, profileResult, patternsResult],
          }),
        };
      },
    });
  }

  private async loadNotifications(input: {
    authUserId: string;
    userProfileId: string;
    generatedAt: string;
  }): Promise<
    CoachIntelligenceSectionLoadResult<
      CoachIntelligenceSourceLoadResult['sections']['notifications']['data']
    >
  > {
    return this.loadSection({
      sectionName: 'notifications',
      generatedAt: input.generatedAt,
      run: async () => {
        const [currentResult, engagementResult] = await Promise.allSettled([
          this.getCurrentNotificationUseCase.execute({
            authUserId: input.authUserId,
          }),
          this.getEngagementSummaryUseCase.execute({
            authUserId: input.authUserId,
          }),
        ]);

        const notificationDecision =
          currentResult.status === 'fulfilled'
            ? this.mapNotificationDecision(
                currentResult.value.notificationDecision.toJSON(),
              )
            : null;
        const engagementSummary =
          engagementResult.status === 'fulfilled'
            ? engagementResult.value.engagementSummary
            : null;
        const hasData = Boolean(notificationDecision || engagementSummary);

        return {
          data: hasData
            ? {
                notificationDecision,
                engagementSummary,
              }
            : null,
          sourceTimestamp: this.resolveLatestTimestamp([
            notificationDecision?.createdAt,
            notificationDecision?.updatedAt,
          ]),
          fallbackUsed:
            this.hasAnyRejected([currentResult, engagementResult]) && hasData,
          retryable: this.isRetryable([currentResult, engagementResult]),
          reasonCode: this.resolveAvailabilityReasonCode({
            data: hasData
              ? {
                  notificationDecision,
                  engagementSummary,
                }
              : null,
            rejected: [currentResult, engagementResult],
          }),
        };
      },
    });
  }

  private mapNotificationDecision(
    decision: NotificationDecisionJSON | null,
  ): CoachNotificationDecision | null {
    if (!decision) {
      return null;
    }

    const allowedSuppressionReasons =
      new Set<CoachNotificationSuppressionReason>([
        'daily_cap_reached',
        'same_type_cooldown',
        'high_dismissal_ratio',
        'already_engaged',
        'recent_notification',
      ]);

    return {
      ...decision,
      suppressionReasons: decision.suppressionReasons?.filter(
        (reason): reason is CoachNotificationSuppressionReason =>
          allowedSuppressionReasons.has(
            reason as CoachNotificationSuppressionReason,
          ),
      ),
    };
  }

  private async loadSection<
    TSectionData,
    TOutcome extends SectionLoadPayload<TSectionData> =
      SectionLoadPayload<TSectionData>,
  >(input: {
    sectionName: CoachIntelligenceLoadedSectionName;
    generatedAt: string;
    run: () => Promise<TOutcome>;
  }): Promise<TOutcome & CoachIntelligenceSectionLoadResult<TSectionData>> {
    const startedAt = Date.now();

    try {
      const outcome = await input.run();
      const state = this.freshnessPolicy.resolveSectionState({
        sectionName: input.sectionName,
        data: outcome.data,
        generatedAt: input.generatedAt,
        sourceTimestamp: outcome.sourceTimestamp,
        fallbackUsed: outcome.fallbackUsed,
        retryable: outcome.retryable,
        reasonCode: outcome.reasonCode,
        disabled: outcome.disabled ?? false,
      }) as CoachIntelligenceSourceSectionState<TSectionData>;

      return Object.freeze({
        ...outcome,
        sectionName: input.sectionName,
        state,
        loadDurationMs: Date.now() - startedAt,
      }) as TOutcome & CoachIntelligenceSectionLoadResult<TSectionData>;
    } catch (error) {
      const { reasonCode, retryable } = this.resolveError(error);
      const state = this.freshnessPolicy.resolveSectionState({
        sectionName: input.sectionName,
        data: null,
        generatedAt: input.generatedAt,
        fallbackUsed: false,
        retryable,
        reasonCode,
      }) as CoachIntelligenceSourceSectionState<TSectionData>;

      return Object.freeze({
        sectionName: input.sectionName,
        state,
        loadDurationMs: Date.now() - startedAt,
      }) as TOutcome & CoachIntelligenceSectionLoadResult<TSectionData>;
    }
  }

  private resolveError(error: unknown): {
    reasonCode: CoachIntelligenceAvailabilityReasonCode;
    retryable: boolean;
  } {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : '';

    if (code.includes('INVALID_INPUT') || code.includes('INVALID_LIMIT')) {
      return { reasonCode: 'VALIDATION_FAILED', retryable: false };
    }

    if (
      code.includes('NOT_FOUND') ||
      code.includes('MISSING') ||
      code.includes('NO_ACTIVE') ||
      code.includes('NUTRITION_DAY_NOT_FOUND')
    ) {
      return { reasonCode: 'MISSING_CONTEXT', retryable: false };
    }

    if (code.includes('TIMEOUT')) {
      return { reasonCode: 'SOURCE_TIMEOUT', retryable: true };
    }

    if (code.includes('DISABLED')) {
      return { reasonCode: 'FEATURE_DISABLED', retryable: false };
    }

    if (code.includes('POLICY')) {
      return { reasonCode: 'POLICY_BLOCKED', retryable: false };
    }

    if (code.includes('INTERNAL')) {
      return { reasonCode: 'RETRYABLE_SOURCE_ERROR', retryable: true };
    }

    return { reasonCode: 'SOURCE_UNAVAILABLE', retryable: true };
  }

  private resolveAvailabilityReasonCode(input: {
    data: unknown | null;
    rejected: readonly PromiseSettledResult<unknown>[];
  }): CoachIntelligenceAvailabilityReasonCode {
    if (input.data === null) {
      const rejectedCodes = input.rejected
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        )
        .map((result) => this.resolveError(result.reason).reasonCode);

      if (rejectedCodes.includes('VALIDATION_FAILED')) {
        return 'VALIDATION_FAILED';
      }

      if (rejectedCodes.includes('SOURCE_TIMEOUT')) {
        return 'SOURCE_TIMEOUT';
      }

      if (rejectedCodes.includes('FEATURE_DISABLED')) {
        return 'FEATURE_DISABLED';
      }

      if (rejectedCodes.includes('POLICY_BLOCKED')) {
        return 'POLICY_BLOCKED';
      }

      if (rejectedCodes.includes('MISSING_CONTEXT')) {
        return 'MISSING_CONTEXT';
      }

      return rejectedCodes.includes('RETRYABLE_SOURCE_ERROR')
        ? 'RETRYABLE_SOURCE_ERROR'
        : 'SOURCE_UNAVAILABLE';
    }

    const rejectedCodes = input.rejected
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      )
      .map((result) => this.resolveError(result.reason).reasonCode);

    if (rejectedCodes.includes('SOURCE_TIMEOUT')) {
      return 'PARTIAL_FAILURE';
    }

    if (rejectedCodes.includes('RETRYABLE_SOURCE_ERROR')) {
      return 'PARTIAL_FAILURE';
    }

    if (rejectedCodes.includes('MISSING_CONTEXT')) {
      return 'PARTIAL_FAILURE';
    }

    return 'READY';
  }

  private hasAnyRejected(
    results: readonly PromiseSettledResult<unknown>[],
  ): boolean {
    return results.some((result) => result.status === 'rejected');
  }

  private isRetryable(
    results: readonly PromiseSettledResult<unknown>[],
  ): boolean {
    return results.some(
      (result) =>
        result.status === 'rejected' &&
        this.resolveError(result.reason).retryable,
    );
  }

  private resolveLatestTimestamp(
    timestamps: readonly (string | Date | undefined | null)[],
  ): string | undefined {
    const normalized = timestamps
      .filter((value): value is string | Date => Boolean(value))
      .map((value) =>
        value instanceof Date
          ? value.toISOString()
          : this.normalizeTimestamp(value),
      )
      .filter((value): value is string => Boolean(value));

    if (normalized.length === 0) {
      return undefined;
    }

    return normalized.reduce((latest, current) =>
      Date.parse(current) > Date.parse(latest) ? current : latest,
    );
  }

  private mapTrainingPlan(
    trainingPlan:
      | Awaited<ReturnType<GetMyTrainingPlanUseCase['execute']>>['trainingPlan']
      | null,
  ): {
    id: string;
    fitnessProfileId: string;
    status: 'active';
    goal: TrainingPlan['goal'];
    activityLevel: TrainingPlan['activityLevel'];
    weeklySchedule: TrainingPlan['weeklySchedule'];
    createdAt: string;
  } | null {
    if (!trainingPlan) {
      return null;
    }

    return {
      id: trainingPlan.id,
      fitnessProfileId: trainingPlan.fitnessProfileId,
      status: trainingPlan.status,
      goal: trainingPlan.goal,
      activityLevel: trainingPlan.activityLevel,
      weeklySchedule: [...(trainingPlan.weeklySchedule ?? [])],
      createdAt: this.normalizeDateValue(trainingPlan.createdAt) ?? '',
    };
  }

  private mapAdaptiveTrainingRecommendation(
    recommendation: AdaptiveTrainingRecommendation | null,
  ): {
    id: string;
    userProfileId: string;
    trainingPlanId?: string;
    date: string;
    recommendationType: AdaptiveTrainingRecommendation['recommendationType'];
    recommendedIntensity: AdaptiveTrainingRecommendation['recommendedIntensity'];
    volumeAction: AdaptiveTrainingRecommendation['volumeAction'];
    reasoning: string;
    influences: AdaptiveTrainingRecommendation['influences'];
    sourceContext: AdaptiveTrainingRecommendation['sourceContext'];
    formulaVersion: string;
    generatedBy: 'deterministic';
    createdAt: string;
    updatedAt: string;
  } | null {
    if (!recommendation) {
      return null;
    }

    return {
      id: recommendation.id,
      userProfileId: recommendation.userProfileId,
      trainingPlanId: recommendation.trainingPlanId,
      date: recommendation.date,
      recommendationType: recommendation.recommendationType,
      recommendedIntensity: recommendation.recommendedIntensity,
      volumeAction: recommendation.volumeAction,
      reasoning: recommendation.reasoning,
      influences: [...(recommendation.influences ?? [])],
      sourceContext: recommendation.sourceContext,
      formulaVersion: recommendation.formulaVersion,
      generatedBy: recommendation.generatedBy,
      createdAt: this.normalizeDateValue(recommendation.createdAt) ?? '',
      updatedAt: this.normalizeDateValue(recommendation.updatedAt) ?? '',
    };
  }

  private mapNutritionPlan(nutritionPlan: NutritionPlan | null): {
    id: string;
    userProfileId: string;
    nutritionProfileId: string;
    fitnessProfileId: string;
    status: 'active' | 'archived' | 'replaced';
    weekStartDate: string;
    weekEndDate: string;
    macroTargets: NutritionPlan['macroTargets'];
    days: NutritionPlan['days'];
    generatedBy: 'deterministic';
    sourceContext?: NutritionPlan['sourceContext'];
    createdAt: string;
    updatedAt?: string;
    replacedAt?: string;
  } | null {
    if (!nutritionPlan) {
      return null;
    }

    return {
      id: nutritionPlan.id,
      userProfileId: nutritionPlan.userProfileId,
      nutritionProfileId: nutritionPlan.nutritionProfileId,
      fitnessProfileId: nutritionPlan.fitnessProfileId,
      status: nutritionPlan.status,
      weekStartDate: nutritionPlan.weekStartDate,
      weekEndDate: nutritionPlan.weekEndDate,
      macroTargets: nutritionPlan.macroTargets,
      days: [...nutritionPlan.days],
      generatedBy: nutritionPlan.generatedBy,
      sourceContext: nutritionPlan.sourceContext,
      createdAt: this.normalizeDateValue(nutritionPlan.createdAt) ?? '',
      ...(nutritionPlan.updatedAt
        ? { updatedAt: this.normalizeDateValue(nutritionPlan.updatedAt) }
        : {}),
      ...(nutritionPlan.replacedAt
        ? { replacedAt: this.normalizeDateValue(nutritionPlan.replacedAt) }
        : {}),
    };
  }

  private mapNutritionRecommendation(
    recommendation: NutritionRecommendation | null,
  ): {
    id?: string;
    userProfileId?: string;
    message: string;
    recommendations: string[];
    influences: NutritionRecommendation['influences'];
    generatorVersion: string;
    contextSnapshot: NutritionRecommendation['contextSnapshot'];
    createdAt?: string;
  } | null {
    if (!recommendation) {
      return null;
    }

    return {
      id: recommendation.id,
      userProfileId: recommendation.userProfileId,
      message: recommendation.message,
      recommendations: [...recommendation.recommendations],
      influences: [...recommendation.influences],
      generatorVersion: recommendation.generatorVersion,
      contextSnapshot: recommendation.contextSnapshot,
      createdAt: this.normalizeDateValue(recommendation.createdAt) ?? '',
    };
  }

  private mapRecoverySnapshot(
    snapshot: RecoverySnapshotEntity | null,
  ): CoachRecoverySnapshot | null {
    if (!snapshot) {
      return null;
    }

    const json = snapshot.toJSON();

    return {
      ...json,
      createdAt: this.normalizeDateValue(snapshot.createdAt) ?? '',
    };
  }

  private mapHealthRecoverySnapshot(input: {
    userProfileId: string;
    snapshot: NonNullable<UserHealthContext['recoverySnapshot']>;
  }): CoachRecoverySnapshot {
    return {
      userProfileId: input.userProfileId,
      date: input.snapshot.date,
      readinessScore: input.snapshot.readinessScore,
      fatigueScore: input.snapshot.fatigueScore,
      recoveryTrend: input.snapshot.recoveryTrend,
      recommendedIntensity: input.snapshot.recommendedIntensity,
      influences: [...input.snapshot.influences],
      formulaVersion: input.snapshot.formulaVersion,
      sourceContext: {
        generatedAt: this.normalizeDateValue(input.snapshot.createdAt) ?? '',
      },
      createdAt: this.normalizeDateValue(input.snapshot.createdAt) ?? '',
    };
  }

  private mapNutritionLog(log: NutritionLogEntity): CoachNutritionLog {
    return {
      id: log.id,
      userProfileId: log.userProfileId,
      nutritionPlanId: log.nutritionPlanId,
      mealId: log.mealId,
      date: log.date,
      mealType: log.mealType,
      status: log.status,
      ...(log.actualMacros ? { actualMacros: log.actualMacros } : {}),
      createdAt: this.normalizeDateValue(log.createdAt) ?? '',
      updatedAt: this.normalizeDateValue(log.updatedAt) ?? '',
    };
  }

  private normalizeTimestamp(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Date.parse(value);

    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    return new Date(parsed).toISOString();
  }

  private normalizeDateValue(
    value: string | Date | undefined | null,
  ): string | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return this.normalizeTimestamp(value);
  }

  private toPlainValue<T>(value: unknown): T {
    if (
      typeof value === 'object' &&
      value !== null &&
      'toJSON' in value &&
      typeof (value as { toJSON?: unknown }).toJSON === 'function'
    ) {
      return (value as { toJSON: () => T }).toJSON();
    }

    return value as T;
  }
}
