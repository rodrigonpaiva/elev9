import { Injectable } from '@nestjs/common';

import { BuildUserHealthContextService } from '../../../../ai/application/services/context-builder/build-user-health-context.service';
import {
  AdaptiveTrainingReadModelMapper,
  CoachDecisionReadModelMapper,
  HabitReadModelMapper,
  type CoachDecisionReadModelPayload,
  type HabitReadModel,
  GoalReadModel,
  GoalReadModelMapper,
  type NotificationReadModelPayload,
  type PersonalizationReadModelSource,
  PersonalizationReadModelMapper,
  type PersonalizationDashboardPayload,
  RecoveryReadModelMapper,
} from '../../../../../shared/mappers';
import { GetHomeDashboardOutput } from '../../use-cases/get-home-dashboard/get-home-dashboard.output';
import { GetHomeDashboardDebugOutput } from '../../use-cases/get-home-dashboard-debug/get-home-dashboard-debug.output';

@Injectable()
export class DashboardAdaptiveSignalsService {
  buildCoachDecision(
    coachDecision: CoachDecisionReadModelPayload | null | undefined,
  ): GetHomeDashboardOutput['dashboard']['coachDecision'] | undefined {
    return CoachDecisionReadModelMapper.toDashboardPayload(coachDecision);
  }

  buildGoal(
    goalReadModel: GoalReadModel | null | undefined,
  ): GetHomeDashboardOutput['dashboard']['goal'] | undefined {
    return GoalReadModelMapper.toDashboardPayload(goalReadModel);
  }

  buildHabits(
    habitReadModel: HabitReadModel | null | undefined,
  ): GetHomeDashboardOutput['dashboard']['habits'] | undefined {
    return HabitReadModelMapper.toDashboardPayload(habitReadModel);
  }

  buildNotification(
    notification: NotificationReadModelPayload | null | undefined,
  ): GetHomeDashboardOutput['dashboard']['notification'] | undefined {
    return notification ?? undefined;
  }

  buildPersonalization(
    personalization: PersonalizationReadModelSource | null | undefined,
  ): PersonalizationDashboardPayload | undefined {
    return PersonalizationReadModelMapper.toDashboardPayload(personalization);
  }

  buildAdaptiveTrainingRecommendation(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
  ): GetHomeDashboardOutput['dashboard']['adaptiveTrainingRecommendation'] {
    return AdaptiveTrainingReadModelMapper.toDashboardPayload(
      healthContext.adaptiveTrainingRecommendation,
    );
  }

  buildRecoverySummary(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recentDailyCheckIns: Array<{
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
    }>,
  ): GetHomeDashboardOutput['dashboard']['recovery'] {
    const recoverySnapshot = healthContext.recoverySnapshot;
    const recoverySnapshotSummary =
      RecoveryReadModelMapper.toDashboardPayload(recoverySnapshot);
    const recoveryTrend = recoverySnapshotSummary
      ? recoverySnapshotSummary.recoveryTrend
      : this.calculateRecoveryTrend(recentDailyCheckIns);
    const fatigueLevel = recoverySnapshotSummary
      ? this.mapFatigueLevelFromScore(recoverySnapshotSummary.fatigueScore)
      : healthContext.fatigueLevel;
    const recommendedIntensity = recoverySnapshotSummary
      ? recoverySnapshotSummary.recommendedIntensity
      : this.mapRecommendedIntensity(fatigueLevel);

    return {
      fatigueLevel,
      recommendedIntensity,
      recoveryTrend,
      readinessScore: recoverySnapshotSummary?.readinessScore,
      fatigueScore: recoverySnapshotSummary?.fatigueScore,
      recoveryInfluences: recoverySnapshotSummary?.recoveryInfluences,
      latestCheckIn: healthContext.latestCheckIn
        ? {
            energyLevel: healthContext.latestCheckIn.energyLevel,
            sleepQuality: healthContext.latestCheckIn.sleepQuality,
            muscleSoreness: healthContext.latestCheckIn.muscleSoreness,
            motivationLevel: healthContext.latestCheckIn.motivationLevel,
            createdAt: healthContext.latestCheckIn.createdAt.toISOString(),
          }
        : undefined,
    };
  }

  buildNutritionGuidance(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recoveryTrend: GetHomeDashboardOutput['dashboard']['recovery']['recoveryTrend'],
  ): GetHomeDashboardOutput['dashboard']['nutritionGuidance'] {
    void recoveryTrend;
    const nutrition = healthContext.nutritionContext;
    return {
      priority:
        nutrition?.focus?.priority === 'high' ? 'performance' : 'consistency',
      message:
        nutrition?.focus?.message ??
        nutrition?.insight?.message ??
        'Keep your nutrition routine consistent today.',
      signals: nutrition
        ? ['canonical_nutrition_context']
        : ['nutrition_unavailable'],
    };
  }

  buildDebugSnapshot(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recovery: GetHomeDashboardOutput['dashboard']['recovery'],
    nutritionGuidance: GetHomeDashboardOutput['dashboard']['nutritionGuidance'],
    goal?: GoalReadModel | null,
    habits?: HabitReadModel | null,
    notification?: GetHomeDashboardOutput['dashboard']['notification'],
  ): GetHomeDashboardDebugOutput {
    const adaptiveTrainingRecommendation =
      this.buildAdaptiveTrainingRecommendation(healthContext);
    const dashboardHabits = this.buildHabits(habits);

    return {
      generatedAt: healthContext.generatedAt.toISOString(),
      recovery: {
        fatigueLevel: healthContext.fatigueLevel,
        recoveryTrend: recovery.recoveryTrend,
        recoverySignals: this.buildRecoverySignals(
          healthContext,
          recovery.recoveryTrend,
        ),
        readinessScore: recovery.readinessScore,
        fatigueScore: recovery.fatigueScore,
        recoveryInfluences: recovery.recoveryInfluences,
      },
      ...(adaptiveTrainingRecommendation
        ? {
            adaptiveTrainingRecommendation,
          }
        : {}),
      ...(goal
        ? {
            goal: this.buildGoal(goal),
          }
        : {}),
      ...(dashboardHabits ? { habits: dashboardHabits } : {}),
      ...(notification
        ? {
            notification,
          }
        : {}),
      nutrition: {
        priority: nutritionGuidance.priority,
        signals: nutritionGuidance.signals,
      },
    };
  }

  private buildRecoverySignals(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recoveryTrend: GetHomeDashboardOutput['dashboard']['recovery']['recoveryTrend'],
  ): string[] {
    const latestCheckIn = healthContext.latestCheckIn;
    const hasLowSleep = latestCheckIn ? latestCheckIn.sleepQuality <= 2 : false;
    const hasHighSoreness = latestCheckIn
      ? latestCheckIn.muscleSoreness >= 4
      : false;
    const recoverySnapshotSignals = healthContext.recoveryInfluences ?? [];

    return this.collectSignals([
      healthContext.fatigueLevel === 'HIGH' ? 'high_fatigue' : null,
      hasLowSleep ? 'poor_sleep' : null,
      hasHighSoreness ? 'high_soreness' : null,
      recoveryTrend === 'needs_recovery' ? 'needs_recovery_trend' : null,
      recoveryTrend === 'improving' ? 'improving_recovery' : null,
      ...recoverySnapshotSignals.map((influence) => influence.code),
    ]);
  }

  private collectSignals(signals: Array<string | null>): string[] {
    return signals.filter((signal): signal is string => Boolean(signal));
  }

  private mapRecommendedIntensity(
    fatigueLevel: GetHomeDashboardOutput['dashboard']['recovery']['fatigueLevel'],
  ): GetHomeDashboardOutput['dashboard']['recovery']['recommendedIntensity'] {
    switch (fatigueLevel) {
      case 'HIGH':
        return 'low';
      case 'LOW':
        return 'normal';
      case 'MODERATE':
      default:
        return 'medium';
    }
  }

  private mapFatigueLevelFromScore(
    fatigueScore: number,
  ): GetHomeDashboardOutput['dashboard']['recovery']['fatigueLevel'] {
    if (fatigueScore >= 70) {
      return 'HIGH';
    }

    if (fatigueScore >= 40) {
      return 'MODERATE';
    }

    return 'LOW';
  }

  private calculateRecoveryTrend(
    recentDailyCheckIns: Array<{
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
    }>,
  ): GetHomeDashboardOutput['dashboard']['recovery']['recoveryTrend'] {
    if (recentDailyCheckIns.length < 3) {
      return 'stable';
    }

    const latest = recentDailyCheckIns[0];
    const oldest = recentDailyCheckIns[recentDailyCheckIns.length - 1];

    let positiveSignals = 0;
    let negativeSignals = 0;

    if (latest.energyLevel > oldest.energyLevel) {
      positiveSignals += 1;
    } else if (latest.energyLevel < oldest.energyLevel) {
      negativeSignals += 1;
    }

    if (latest.sleepQuality > oldest.sleepQuality) {
      positiveSignals += 1;
    } else if (latest.sleepQuality < oldest.sleepQuality) {
      negativeSignals += 1;
    }

    if (latest.muscleSoreness < oldest.muscleSoreness) {
      positiveSignals += 1;
    } else if (latest.muscleSoreness > oldest.muscleSoreness) {
      negativeSignals += 1;
    }

    if (positiveSignals >= 2 && negativeSignals === 0) {
      return 'improving';
    }

    if (negativeSignals >= 2 && positiveSignals === 0) {
      return 'needs_recovery';
    }

    return 'stable';
  }
}
