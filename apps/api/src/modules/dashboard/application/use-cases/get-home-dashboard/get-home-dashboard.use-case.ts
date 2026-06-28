import { Inject, Injectable } from '@nestjs/common';

import { BuildUserHealthContextService } from '../../../../ai/application/services/context-builder/build-user-health-context.service';
import { GetCurrentCoachDecisionUseCase } from '../../../../ai/application/use-cases/get-current-coach-decision/get-current-coach-decision.use-case';
import { GetCurrentGoalUseCase } from '../../../../goals/application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalMilestonesUseCase } from '../../../../goals/application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { GetCurrentNotificationUseCase } from '../../../../notifications/application/use-cases/get-current-notification/get-current-notification.use-case';
import { GetEngagementSummaryUseCase } from '../../../../notifications/application/use-cases/get-engagement-summary/get-engagement-summary.use-case';
import { GetCurrentHabitsUseCase } from '../../../../habits/application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetConsistencySummaryUseCase } from '../../../../habits/application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetHabitRiskSignalsUseCase } from '../../../../habits/application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetCurrentPersonalizationUseCase } from '../../../../personalization/application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetBehavioralPatternsUseCase } from '../../../../personalization/application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetUserBehaviorProfileUseCase } from '../../../../personalization/application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  DAILY_CHECK_IN_REPOSITORY,
  DailyCheckInRepository,
} from '../../../../progress/domain/repositories/daily-check-in.repository';
import {
  WORKOUT_LOG_REPOSITORY,
  WorkoutLogRepository,
} from '../../../../progress/domain/repositories/workout-log.repository';
import {
  CLOCK,
  Clock,
} from '../../../../progress/domain/services/clock.service';
import { DashboardAdaptiveSignalsService } from '../../services/dashboard-adaptive-signals/dashboard-adaptive-signals.service';
import {
  TRAINING_PLAN_REPOSITORY,
  TrainingPlanRepository,
} from '../../../../training/domain/repositories/training-plan.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GoalReadModel,
  HabitReadModel,
  NotificationReadModelMapper,
  NotificationReadModelPayload,
  PersonalizationDashboardPayload,
} from '../../../../../shared/mappers';
import {
  GET_HOME_DASHBOARD_ERROR_CODES,
  GetHomeDashboardError,
} from './get-home-dashboard.errors';
import { GetHomeDashboardInput } from './get-home-dashboard.input';
import { GetHomeDashboardOutput } from './get-home-dashboard.output';

@Injectable()
export class GetHomeDashboardUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(TRAINING_PLAN_REPOSITORY)
    private readonly trainingPlanRepository: TrainingPlanRepository,
    @Inject(WORKOUT_LOG_REPOSITORY)
    private readonly workoutLogRepository: WorkoutLogRepository,
    @Inject(DAILY_CHECK_IN_REPOSITORY)
    private readonly dailyCheckInRepository: DailyCheckInRepository,
    @Inject(CLOCK)
    private readonly clock: Clock,
    private readonly buildUserHealthContextService: BuildUserHealthContextService,
    private readonly getCurrentCoachDecisionUseCase: GetCurrentCoachDecisionUseCase,
    private readonly getCurrentGoalUseCase: GetCurrentGoalUseCase,
    private readonly getGoalMilestonesUseCase: GetGoalMilestonesUseCase,
    private readonly getCurrentNotificationUseCase: GetCurrentNotificationUseCase,
    private readonly getEngagementSummaryUseCase: GetEngagementSummaryUseCase,
    private readonly getCurrentHabitsUseCase: GetCurrentHabitsUseCase,
    private readonly getConsistencySummaryUseCase: GetConsistencySummaryUseCase,
    private readonly getHabitRiskSignalsUseCase: GetHabitRiskSignalsUseCase,
    private readonly getCurrentPersonalizationUseCase: GetCurrentPersonalizationUseCase,
    private readonly getUserBehaviorProfileUseCase: GetUserBehaviorProfileUseCase,
    private readonly getBehavioralPatternsUseCase: GetBehavioralPatternsUseCase,
    private readonly dashboardAdaptiveSignalsService: DashboardAdaptiveSignalsService,
  ) {}

  async execute(input: GetHomeDashboardInput): Promise<GetHomeDashboardOutput> {
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
      const coachDecision = await this.resolveCoachDecision(authUserId);
      const notification = await this.resolveNotification(authUserId);
      const habits = await this.resolveHabits(authUserId);
      const personalization = await this.resolvePersonalization(authUserId);

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
      const adaptiveTrainingRecommendation =
        this.dashboardAdaptiveSignalsService.buildAdaptiveTrainingRecommendation(
          healthContext,
        );
      const dashboardCoachDecision =
        this.dashboardAdaptiveSignalsService.buildCoachDecision(coachDecision);
      const dashboardGoal =
        this.dashboardAdaptiveSignalsService.buildGoal(goal);
      const dashboardHabits =
        this.dashboardAdaptiveSignalsService.buildHabits(habits);
      const dashboardNotification =
        this.dashboardAdaptiveSignalsService.buildNotification(notification);
      const recovery = this.buildRecoverySummary(
        healthContext,
        recentDailyCheckIns,
      );
      const nutritionGuidance = this.buildNutritionGuidance(
        healthContext,
        recovery.recoveryTrend,
      );

      const fitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!fitnessProfile) {
        return {
          dashboard: {
            user: {
              name: userProfile.name,
            },
            fitnessProfile: null,
            trainingPlan: null,
            progressSummary: this.buildEmptySummary(),
            recovery,
            ...(dashboardGoal ? { goal: dashboardGoal } : {}),
            ...(dashboardHabits ? { habits: dashboardHabits } : {}),
            ...(dashboardNotification
              ? { notification: dashboardNotification }
              : {}),
            ...(personalization ? { personalization } : {}),
            ...(dashboardCoachDecision
              ? { coachDecision: dashboardCoachDecision }
              : {}),
            ...(adaptiveTrainingRecommendation
              ? { adaptiveTrainingRecommendation }
              : {}),
            nutritionGuidance,
          },
        };
      }

      const trainingPlan =
        await this.trainingPlanRepository.findActiveByFitnessProfileId(
          fitnessProfile.id,
        );

      if (!trainingPlan || trainingPlan.status !== 'active') {
        return {
          dashboard: {
            user: {
              name: userProfile.name,
            },
            fitnessProfile: {
              id: fitnessProfile.id,
              goal: fitnessProfile.goal,
              activityLevel: fitnessProfile.activityLevel,
            },
            trainingPlan: null,
            progressSummary: this.buildEmptySummary(),
            recovery,
            ...(dashboardGoal ? { goal: dashboardGoal } : {}),
            ...(dashboardHabits ? { habits: dashboardHabits } : {}),
            ...(dashboardNotification
              ? { notification: dashboardNotification }
              : {}),
            ...(personalization ? { personalization } : {}),
            ...(dashboardCoachDecision
              ? { coachDecision: dashboardCoachDecision }
              : {}),
            ...(adaptiveTrainingRecommendation
              ? { adaptiveTrainingRecommendation }
              : {}),
            nutritionGuidance,
          },
        };
      }

      const { startDate, endDate } = this.getWeekUtcDateRange();
      const workoutLogs =
        await this.workoutLogRepository.findByTrainingPlanIdsAndDateRange({
          trainingPlanIds: [trainingPlan.id],
          startDate,
          endDate,
        });

      const todayWorkout = this.getTodayWorkout(trainingPlan.weeklySchedule);

      return {
        dashboard: {
          user: {
            name: userProfile.name,
          },
          fitnessProfile: {
            id: fitnessProfile.id,
            goal: fitnessProfile.goal,
            activityLevel: fitnessProfile.activityLevel,
          },
          trainingPlan: {
            id: trainingPlan.id,
            todayWorkout,
          },
          progressSummary: this.buildSummaryFromLogs(workoutLogs),
          recovery,
          ...(dashboardGoal ? { goal: dashboardGoal } : {}),
          ...(dashboardHabits ? { habits: dashboardHabits } : {}),
          ...(dashboardNotification
            ? { notification: dashboardNotification }
            : {}),
          ...(personalization ? { personalization } : {}),
          ...(dashboardCoachDecision
            ? { coachDecision: dashboardCoachDecision }
            : {}),
          ...(adaptiveTrainingRecommendation
            ? { adaptiveTrainingRecommendation }
            : {}),
          nutritionGuidance,
        },
      };
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

  private getTodayWorkout(
    weeklySchedule: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      format: string;
      intensity: 'low' | 'moderate' | 'high';
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      }>;
    }>,
  ) {
    const todayIndex = this.getUtcDayIndex(this.clock.now());
    const matchingDay = weeklySchedule.find(
      (day) => day.dayIndex === todayIndex,
    );

    if (!matchingDay) {
      return null;
    }

    return {
      dayIndex: matchingDay.dayIndex,
      title: matchingDay.title,
      focus: matchingDay.focus,
      format: matchingDay.format,
      intensity: matchingDay.intensity,
      exercises: matchingDay.exercises,
    };
  }

  private getUtcDayIndex(date: Date): number {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
  }

  private getWeekUtcDateRange(): {
    startDate: string;
    endDate: string;
  } {
    const now = this.clock.now();
    const endDate = this.clock.todayUtcDateString();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    start.setUTCDate(start.getUTCDate() - 6);

    return {
      startDate: this.toUtcDateString(start),
      endDate,
    };
  }

  private toUtcDateString(date: Date): string {
    return date.toISOString().slice(0, 10);
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

    const current =
      currentResult.status === 'fulfilled'
        ? currentResult.value.notificationDecision
        : undefined;
    const engagementSummary =
      engagementSummaryResult.status === 'fulfilled'
        ? engagementSummaryResult.value.engagementSummary
        : undefined;

    return NotificationReadModelMapper.toDashboardPayload(
      current,
      engagementSummary,
    );
  }

  private async resolvePersonalization(
    authUserId: string,
  ): Promise<PersonalizationDashboardPayload | undefined> {
    try {
      const [snapshotResult, profileResult, patternsResult] =
        await Promise.allSettled([
          this.getCurrentPersonalizationUseCase.execute({ authUserId }),
          this.getUserBehaviorProfileUseCase.execute({ authUserId }),
          this.getBehavioralPatternsUseCase.execute({ authUserId }),
        ]);

      return this.dashboardAdaptiveSignalsService.buildPersonalization({
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
      });
    } catch {
      return undefined;
    }
  }

  private buildEmptySummary(): GetHomeDashboardOutput['dashboard']['progressSummary'] {
    return {
      period: 'week',
      workoutsCompleted: 0,
      totalDurationMinutes: 0,
      averageDurationMinutes: 0,
      lastWorkoutDate: null,
    };
  }

  private buildSummaryFromLogs(
    workoutLogs: Array<{
      durationMinutes: number;
      date: string;
    }>,
  ): GetHomeDashboardOutput['dashboard']['progressSummary'] {
    if (workoutLogs.length === 0) {
      return this.buildEmptySummary();
    }

    const workoutsCompleted = workoutLogs.length;
    const totalDurationMinutes = workoutLogs.reduce(
      (total, log) => total + log.durationMinutes,
      0,
    );
    const averageDurationMinutes = this.roundToTwoDecimals(
      totalDurationMinutes / workoutsCompleted,
    );
    const lastWorkoutDate = workoutLogs.reduce(
      (latest, log) =>
        latest === null || log.date > latest ? log.date : latest,
      null as string | null,
    );

    return {
      period: 'week',
      workoutsCompleted,
      totalDurationMinutes,
      averageDurationMinutes,
      lastWorkoutDate,
    };
  }

  private buildRecoverySummary(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recentDailyCheckIns: Array<{
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
    }>,
  ): GetHomeDashboardOutput['dashboard']['recovery'] {
    return this.dashboardAdaptiveSignalsService.buildRecoverySummary(
      healthContext,
      recentDailyCheckIns,
    );
  }

  private buildNutritionGuidance(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recoveryTrend: GetHomeDashboardOutput['dashboard']['recovery']['recoveryTrend'],
  ): GetHomeDashboardOutput['dashboard']['nutritionGuidance'] {
    return this.dashboardAdaptiveSignalsService.buildNutritionGuidance(
      healthContext,
      recoveryTrend,
    );
  }

  private async resolveGoal(
    authUserId: string,
  ): Promise<GoalReadModel | undefined> {
    try {
      const currentGoal = await this.getCurrentGoalUseCase.execute({
        authUserId,
      });

      const milestones = await this.getGoalMilestonesUseCase.execute({
        authUserId,
      });

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

  private async resolveHabits(
    authUserId: string,
  ): Promise<HabitReadModel | undefined> {
    try {
      const [currentResult, summaryResult, riskSignalsResult] =
        await Promise.allSettled([
          this.getCurrentHabitsUseCase.execute({ authUserId }),
          this.getConsistencySummaryUseCase.execute({ authUserId }),
          this.getHabitRiskSignalsUseCase.execute({ authUserId }),
        ]);

      const current =
        currentResult.status === 'fulfilled'
          ? currentResult.value.habitSnapshot
          : undefined;
      const summary =
        summaryResult.status === 'fulfilled'
          ? summaryResult.value.consistencySummary
          : undefined;
      const riskSignals =
        riskSignalsResult.status === 'fulfilled'
          ? riskSignalsResult.value.habitRiskSignals
          : undefined;
      const habits = {
        ...(current ? { current } : {}),
        ...(summary ? { summary } : {}),
        ...(riskSignals ? { riskSignals } : {}),
      };

      return Object.keys(habits).length > 0 ? habits : undefined;
    } catch {
      return undefined;
    }
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
