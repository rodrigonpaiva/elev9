import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../domain/repositories/nutrition-log.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../domain/repositories/nutrition-plan.repository';
import { calculateNutritionDeterministicState } from '../../services/nutrition-deterministic-engine.service';
import { NutritionLog } from '../../../domain/entities/nutrition-log.entity';
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
      const deterministicState = calculateNutritionDeterministicState({
        meals: nutritionDay.meals,
        logs,
        macroTargets,
      });

      return {
        todayNutrition: {
          date: today,
          availability: 'available',
          freshness: resolveFreshness(nutritionPlan.updatedAt),
          lastUpdatedAt: resolveLastUpdatedAt({ nutritionPlan, logs }),
          timezone: 'UTC',
          macroTargets,
          targets: macroTargets,
          meals: nutritionDay.meals,
          progress: buildProgress(deterministicState),
          calories: deterministicState.calorieProgress,
          macros: deterministicState.macros,
          mealProgress: deterministicState.mealProgress,
          nextMeal: deterministicState.nextMeal,
          focus: deterministicState.focus,
          insight: deterministicState.insight,
          actions: [deterministicState.focus.action, deterministicState.insight.action],
          nutritionFocus: deterministicState.focus.message,
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

function buildProgress(input: ReturnType<typeof calculateNutritionDeterministicState>): TodayNutritionProgressOutput {
  const consumed = input.consumed;
  const protein = input.macros.find((macro) => macro.nutrient === 'protein')!;
  const carbs = input.macros.find((macro) => macro.nutrient === 'carbohydrates')!;
  const fat = input.macros.find((macro) => macro.nutrient === 'fat')!;
  return {
    consumedCalories: consumed.calories,
    consumedProteinGrams: consumed.proteinGrams,
    consumedCarbsGrams: consumed.carbsGrams,
    consumedFatGrams: consumed.fatGrams,
    targetCalories: input.calorieProgress.target ?? 0,
    targetProteinGrams: protein?.target ?? 0,
    targetCarbsGrams: carbs?.target ?? 0,
    targetFatGrams: fat?.target ?? 0,
    adherencePercentage: input.calorieProgress.percentage ?? 0,
    adherenceStatus: input.adherenceStatus,
    macroProgress: {
      protein,
      carbs,
      fat,
    },
  };
}

function resolveFreshness(updatedAt?: Date): 'current' | 'unknown' {
  return updatedAt ? 'current' : 'unknown';
}

function resolveLastUpdatedAt(input: { nutritionPlan: { updatedAt?: Date; createdAt: Date }; logs: NutritionLog[] }): string | null {
  const timestamps = [input.nutritionPlan.updatedAt ?? input.nutritionPlan.createdAt, ...input.logs.map((log) => log.updatedAt)];
  const latest = timestamps.reduce((current, value) => value > current ? value : current);
  return latest.toISOString();
}


function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
