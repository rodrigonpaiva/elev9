import { Injectable } from '@nestjs/common';

import { BuildUserHealthContextService } from '../../../../ai/application/services/context-builder/build-user-health-context.service';
import { GetHomeDashboardOutput } from '../../use-cases/get-home-dashboard/get-home-dashboard.output';
import { GetHomeDashboardDebugOutput } from '../../use-cases/get-home-dashboard-debug/get-home-dashboard-debug.output';

@Injectable()
export class DashboardAdaptiveSignalsService {
  buildRecoverySummary(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recentDailyCheckIns: Array<{
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
    }>,
  ): GetHomeDashboardOutput['dashboard']['recovery'] {
    return {
      fatigueLevel: healthContext.fatigueLevel,
      recommendedIntensity: this.mapRecommendedIntensity(
        healthContext.fatigueLevel,
      ),
      recoveryTrend: this.calculateRecoveryTrend(recentDailyCheckIns),
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
    const latestCheckIn = healthContext.latestCheckIn;
    const nutritionProfile = healthContext.nutritionProfile;
    const hasLowSleep = latestCheckIn ? latestCheckIn.sleepQuality <= 2 : false;
    const hasHighSoreness = latestCheckIn
      ? latestCheckIn.muscleSoreness >= 4
      : false;
    const hasLowMotivation = latestCheckIn
      ? latestCheckIn.motivationLevel <= 2
      : false;
    const hasHighMotivation = latestCheckIn
      ? latestCheckIn.motivationLevel >= 4
      : false;
    const hasLowMealFrequency = nutritionProfile
      ? nutritionProfile.mealsPerDay <= 2
      : false;
    const hasLowConsistencySignal =
      hasLowMealFrequency ||
      hasLowMotivation ||
      healthContext.adherenceScore < 50;

    if (
      healthContext.fatigueLevel === 'HIGH' ||
      recoveryTrend === 'needs_recovery' ||
      hasLowSleep ||
      hasHighSoreness
    ) {
      const signals = this.collectSignals([
        healthContext.fatigueLevel === 'HIGH' ? 'high_fatigue' : null,
        hasLowSleep ? 'poor_sleep' : null,
        hasHighSoreness ? 'high_soreness' : null,
        recoveryTrend === 'needs_recovery' ? 'needs_recovery_trend' : null,
      ]);

      return {
        priority: 'recovery',
        message: 'Focus on recovery meals and hydration today.',
        signals,
      };
    }

    if (
      nutritionProfile?.goal === 'muscle_gain' &&
      healthContext.fatigueLevel === 'LOW' &&
      hasHighMotivation
    ) {
      const signals = this.collectSignals([
        'muscle_gain_goal',
        'high_motivation',
        'low_fatigue',
      ]);

      return {
        priority: 'performance',
        message:
          "Support today's training with consistent meals around your session.",
        signals,
      };
    }

    if (hasLowConsistencySignal) {
      const signals = this.collectSignals([
        hasLowMealFrequency ? 'low_meal_frequency' : null,
        hasLowMotivation ? 'low_motivation' : null,
        healthContext.adherenceScore < 50 ? 'low_consistency' : null,
      ]);

      return {
        priority: 'consistency',
        message:
          'Keep your meals consistent today to support recovery and routine.',
        signals,
      };
    }

    return {
      priority: 'consistency',
      message: nutritionProfile
        ? "Stay consistent with your meals to support today's training rhythm."
        : 'Keep your nutrition routine consistent today.',
      signals: nutritionProfile
        ? ['consistent_meal_rhythm']
        : ['general_consistency'],
    };
  }

  buildDebugSnapshot(
    healthContext: Awaited<ReturnType<BuildUserHealthContextService['build']>>,
    recovery: GetHomeDashboardOutput['dashboard']['recovery'],
    nutritionGuidance: GetHomeDashboardOutput['dashboard']['nutritionGuidance'],
  ): GetHomeDashboardDebugOutput {
    return {
      generatedAt: healthContext.generatedAt.toISOString(),
      recovery: {
        fatigueLevel: healthContext.fatigueLevel,
        recoveryTrend: recovery.recoveryTrend,
        recoverySignals: this.buildRecoverySignals(
          healthContext,
          recovery.recoveryTrend,
        ),
      },
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

    return this.collectSignals([
      healthContext.fatigueLevel === 'HIGH' ? 'high_fatigue' : null,
      hasLowSleep ? 'poor_sleep' : null,
      hasHighSoreness ? 'high_soreness' : null,
      recoveryTrend === 'needs_recovery' ? 'needs_recovery_trend' : null,
      recoveryTrend === 'improving' ? 'improving_recovery' : null,
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
