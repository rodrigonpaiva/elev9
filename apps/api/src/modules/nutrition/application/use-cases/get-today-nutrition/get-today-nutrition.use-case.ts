import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { Meal } from '../../../domain/entities/meal.entity';
import { NutritionLog } from '../../../domain/entities/nutrition-log.entity';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../domain/repositories/nutrition-log.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../domain/repositories/nutrition-plan.repository';
import { MacroTargetsProps } from '../../../domain/value-objects/macro-targets.value-object';
import {
  GET_TODAY_NUTRITION_ERROR_CODES,
  GetTodayNutritionError,
} from './get-today-nutrition.errors';
import {
  GetTodayNutritionOutput,
  TodayNutritionProgressOutput,
} from './get-today-nutrition.output';

@Injectable()
export class GetTodayNutritionUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetTodayNutritionOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new GetTodayNutritionError(
        GET_TODAY_NUTRITION_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new GetTodayNutritionError(
          GET_TODAY_NUTRITION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const nutritionPlan =
        await this.nutritionPlanRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionPlan) {
        throw new GetTodayNutritionError(
          GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
          'Active nutrition plan not found.',
        );
      }

      const today = toUtcDateString(new Date());
      const nutritionDay = nutritionPlan.days.find((day) => day.date === today);

      if (!nutritionDay) {
        throw new GetTodayNutritionError(
          GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_DAY_NOT_FOUND,
          'Active nutrition plan does not contain today.',
          { date: today },
        );
      }

      const macroTargets = nutritionDay.dailyMacroTargets;
      const logs = await this.nutritionLogRepository.findByUserProfileIdAndDate(
        userProfile.id,
        today,
      );

      return {
        todayNutrition: {
          date: today,
          availability: 'available',
          freshness: resolveFreshness(nutritionPlan.updatedAt),
          lastUpdatedAt: resolveLastUpdatedAt({ nutritionPlan, logs }),
          timezone: 'UTC',
          macroTargets,
          meals: nutritionDay.meals,
          progress: buildProgress({ macroTargets, logs }),
          mealProgress: buildMealProgress({ meals: nutritionDay.meals, logs }),
          nextMeal: resolveNextMeal({
            meals: nutritionDay.meals,
            logs,
          }),
          nutritionFocus: buildNutritionFocus(nutritionPlan.sourceContext),
        },
      };
    } catch (error) {
      if (error instanceof GetTodayNutritionError) {
        throw error;
      }

      throw new GetTodayNutritionError(
        GET_TODAY_NUTRITION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}

function buildProgress(input: {
  macroTargets: MacroTargetsProps;
  logs: NutritionLog[];
}): TodayNutritionProgressOutput {
  const latestLogByMealId = new Map<string, NutritionLog>();
  for (const log of input.logs) latestLogByMealId.set(log.mealId, log);

  const consumed = [...latestLogByMealId.values()].reduce(
    (accumulator, log) => {
      const actualMacros = log.actualMacros;

      if (!actualMacros || log.status === 'skipped') {
        return accumulator;
      }

      return {
        calories: accumulator.calories + actualMacros.calories,
        proteinGrams: accumulator.proteinGrams + actualMacros.proteinGrams,
        carbsGrams: accumulator.carbsGrams + actualMacros.carbsGrams,
        fatGrams: accumulator.fatGrams + actualMacros.fatGrams,
      };
    },
    {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
    },
  );

  return {
    consumedCalories: consumed.calories,
    consumedProteinGrams: consumed.proteinGrams,
    consumedCarbsGrams: consumed.carbsGrams,
    consumedFatGrams: consumed.fatGrams,
    targetCalories: input.macroTargets.calories,
    targetProteinGrams: input.macroTargets.proteinGrams,
    targetCarbsGrams: input.macroTargets.carbsGrams,
    targetFatGrams: input.macroTargets.fatGrams,
    adherencePercentage: calculateAdherencePercentage({
      consumedCalories: consumed.calories,
      targetCalories: input.macroTargets.calories,
    }),
    adherenceStatus: classifyAdherence(
      calculateAdherencePercentage({
        consumedCalories: consumed.calories,
        targetCalories: input.macroTargets.calories,
      }),
    ),
    macroProgress: {
      protein: buildMacroProgress(consumed.proteinGrams, input.macroTargets.proteinGrams),
      carbs: buildMacroProgress(consumed.carbsGrams, input.macroTargets.carbsGrams),
      fat: buildMacroProgress(consumed.fatGrams, input.macroTargets.fatGrams),
    },
  };
}

function buildMealProgress(input: { meals: Meal[]; logs: NutritionLog[] }) {
  const latestLogByMealId = new Map<string, NutritionLog>();
  for (const log of input.logs) latestLogByMealId.set(log.mealId, log);
  const logs = [...latestLogByMealId.values()];
  return {
    plannedCount: input.meals.length,
    consumedCount: logs.filter((log) => log.status !== 'skipped').length,
    completedCount: logs.filter((log) => log.status === 'consumed').length,
    remainingCount: input.meals.filter((meal) => !latestLogByMealId.has(meal.id)).length,
  };
}

function buildMacroProgress(consumed: number, target: number) {
  return { consumed, target, percentage: calculatePercentage(consumed, target) };
}

function calculatePercentage(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((consumed / target) * 100)));
}

function classifyAdherence(percentage: number): 'on_track' | 'needs_attention' | 'off_track' {
  if (percentage >= 80) return 'on_track';
  if (percentage >= 50) return 'needs_attention';
  return 'off_track';
}

function resolveFreshness(updatedAt?: Date): 'current' | 'unknown' {
  return updatedAt ? 'current' : 'unknown';
}

function resolveLastUpdatedAt(input: { nutritionPlan: { updatedAt?: Date; createdAt: Date }; logs: NutritionLog[] }): string | null {
  const timestamps = [input.nutritionPlan.updatedAt ?? input.nutritionPlan.createdAt, ...input.logs.map((log) => log.updatedAt)];
  const latest = timestamps.reduce((current, value) => value > current ? value : current);
  return latest.toISOString();
}

function resolveNextMeal(input: {
  meals: Meal[];
  logs: NutritionLog[];
}): Meal | null {
  const loggedMealIds = new Set(input.logs.map((log) => log.mealId));

  return input.meals.find((meal) => !loggedMealIds.has(meal.id)) ?? null;
}

function calculateAdherencePercentage(input: {
  consumedCalories: number;
  targetCalories: number;
}): number {
  if (input.targetCalories <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((input.consumedCalories / input.targetCalories) * 100),
  );
}

function buildNutritionFocus(
  sourceContext:
    | {
        goalAdjustment?: number;
      }
    | undefined,
): string {
  const goalAdjustment = sourceContext?.goalAdjustment;

  if (typeof goalAdjustment === 'number' && goalAdjustment < 0) {
    return 'Focus on a controlled calorie deficit while keeping protein consistent.';
  }

  if (typeof goalAdjustment === 'number' && goalAdjustment > 0) {
    return 'Focus on a clean calorie surplus and consistent protein across meals.';
  }

  return 'Focus on consistency and balanced meals across the day.';
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
