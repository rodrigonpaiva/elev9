import { Injectable } from '@nestjs/common';

import type {
  NutritionHistoryDayReadModel,
  NutritionHistoryDataQuality,
  NutritionHistorySource,
  NutritionTrendReadModel,
} from '@elev9/types';

import { NutritionLog } from '../../domain/entities/nutrition-log.entity';
import { NutritionPlan } from '../../domain/entities/nutrition-plan.entity';
import { calculateNutritionDeterministicState } from './nutrition-deterministic-engine.service';

export const NUTRITION_HISTORY_CONTRACT_VERSION =
  'nutrition-history-v1' as const;

export type NutritionHistoryProjectionInput = {
  date: string;
  logs: readonly NutritionLog[];
  plans: readonly NutritionPlan[];
};

@Injectable()
export class NutritionHistoryProjectionService {
  project(
    input: NutritionHistoryProjectionInput,
  ): NutritionHistoryDayReadModel {
    const planIds = new Set(input.logs.map((log) => log.nutritionPlanId));
    const matchingPlans = input.plans.filter((plan) => planIds.has(plan.id));
    const plan = chooseHistoricalPlan(matchingPlans, input.logs);
    const nutritionDay = plan?.days.find((day) => day.date === input.date);

    if (!plan || !nutritionDay) {
      return emptyDay(input.date, plan ? 'partial' : 'no_data');
    }

    const state = calculateNutritionDeterministicState({
      meals: nutritionDay.meals,
      logs: input.logs,
      macroTargets: nutritionDay.dailyMacroTargets,
    });
    const dataQuality: NutritionHistoryDataQuality =
      matchingPlans.length === 1 ? 'complete' : 'partial';
    const source: NutritionHistorySource =
      matchingPlans.length === 1 ? 'reconstructed' : 'legacy_projection';

    return {
      date: input.date,
      timezone: 'UTC',
      availability: dataQuality === 'complete' ? 'available' : 'partial',
      dataQuality,
      freshness: source === 'reconstructed' ? 'current' : 'legacy',
      calories: state.calorieProgress,
      macros: state.macros,
      mealProgress: state.mealProgress,
      adherenceStatus: state.adherenceStatus,
      // Guidance is intentionally not reconstructed for a historical day.
      focus: null,
      insight: null,
      source,
      contractVersion: NUTRITION_HISTORY_CONTRACT_VERSION,
    };
  }

  buildTrends(input: {
    from: string;
    to: string;
    days: readonly NutritionHistoryDayReadModel[];
  }): NutritionTrendReadModel {
    const expectedDays = countUtcDays(input.from, input.to);
    const availableDays = input.days.filter(
      (day) => day.availability === 'available',
    ).length;
    const partialDays = input.days.filter(
      (day) => day.availability === 'partial',
    ).length;
    const validDays = input.days.filter(
      (day) => day.calories?.percentage !== null && day.calories !== null,
    );
    const mealDays = input.days.filter((day) => day.mealProgress !== null);

    return {
      period: { from: input.from, to: input.to, timezone: 'UTC' },
      coverage: {
        expectedDays,
        availableDays,
        partialDays,
        missingDays: Math.max(0, expectedDays - input.days.length),
      },
      calorieProgress:
        validDays.length > 0
          ? {
              unit: 'percentage',
              points: validDays.map((day) => ({
                date: day.date,
                value: day.calories?.percentage ?? null,
              })),
            }
          : null,
      mealProgress:
        mealDays.length > 0
          ? {
              unit: 'meals',
              points: mealDays.map((day) => ({
                date: day.date,
                value: day.mealProgress?.completionPercentage ?? null,
              })),
            }
          : null,
      adherenceDistribution: input.days.reduce(
        (distribution, day) => {
          switch (day.adherenceStatus) {
            case 'not_started':
              distribution.notStarted += 1;
              break;
            case 'below_range':
              distribution.belowRange += 1;
              break;
            case 'within_range':
              distribution.withinRange += 1;
              break;
            case 'above_range':
              distribution.aboveRange += 1;
              break;
            case 'unavailable':
              distribution.unavailable += 1;
              break;
          }
          return distribution;
        },
        {
          notStarted: 0,
          belowRange: 0,
          withinRange: 0,
          aboveRange: 0,
          unavailable: 0,
        },
      ),
      dataQuality: resolveTrendQuality(input.days),
      contractVersion: NUTRITION_HISTORY_CONTRACT_VERSION,
    };
  }
}

function chooseHistoricalPlan(
  plans: readonly NutritionPlan[],
  logs: readonly NutritionLog[],
): NutritionPlan | null {
  if (plans.length === 0) return null;
  const counts = new Map<string, number>();
  for (const log of logs)
    counts.set(log.nutritionPlanId, (counts.get(log.nutritionPlanId) ?? 0) + 1);
  return (
    [...plans].sort((left, right) => {
      const countDifference =
        (counts.get(right.id) ?? 0) - (counts.get(left.id) ?? 0);
      if (countDifference !== 0) return countDifference;
      return (
        (right.updatedAt?.getTime() ?? right.createdAt.getTime()) -
        (left.updatedAt?.getTime() ?? left.createdAt.getTime())
      );
    })[0] ?? null
  );
}

function emptyDay(
  date: string,
  availability: 'no_data' | 'partial',
): NutritionHistoryDayReadModel {
  return {
    date,
    timezone: 'UTC',
    availability,
    dataQuality: availability === 'partial' ? 'partial' : 'unknown',
    freshness: 'unknown',
    calories: null,
    macros: [],
    mealProgress: null,
    adherenceStatus: 'unavailable',
    focus: null,
    insight: null,
    source: availability === 'partial' ? 'legacy_projection' : 'reconstructed',
    contractVersion: NUTRITION_HISTORY_CONTRACT_VERSION,
  };
}

function resolveTrendQuality(
  days: readonly NutritionHistoryDayReadModel[],
): NutritionHistoryDataQuality {
  if (days.length === 0) return 'unknown';
  if (days.some((day) => day.dataQuality === 'legacy')) return 'legacy';
  if (days.some((day) => day.dataQuality === 'partial')) return 'partial';
  return 'complete';
}

function countUtcDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}
