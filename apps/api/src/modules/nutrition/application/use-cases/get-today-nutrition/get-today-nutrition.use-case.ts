import { Inject, Injectable, Optional } from '@nestjs/common';

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
import {
  NutritionObservabilityService,
  NutritionSafeErrorCode,
} from '../../services/nutrition-observability.service';

@Injectable()
export class GetTodayNutritionUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
    @Optional()
    private readonly observability?: NutritionObservabilityService,
  ) {}

  async execute(input: {
    authUserId: string;
  }): Promise<GetTodayNutritionOutput> {
    const startedAt = Date.now();
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
        return { todayNutrition: buildUnavailableTodayNutrition('not_configured') };
      }

      const nutritionPlan =
        await this.nutritionPlanRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionPlan) {
        return { todayNutrition: buildUnavailableTodayNutrition('not_configured') };
      }

      const today = toUtcDateString(new Date());
      const nutritionDay = nutritionPlan.days.find((day) => day.date === today);

      if (!nutritionDay) {
        return {
          todayNutrition: buildUnavailableTodayNutrition(
            'insufficient_data',
            today,
            resolveFreshness(nutritionPlan.updatedAt),
            nutritionPlan.updatedAt?.toISOString() ??
              nutritionPlan.createdAt.toISOString(),
          ),
        };
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

      const output: GetTodayNutritionOutput = {
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
      this.observability?.recordTodayRead({
        outcome: 'success',
        availability: output.todayNutrition.availability,
        freshness: output.todayNutrition.freshness,
        durationMs: Date.now() - startedAt,
      });
      return output;
    } catch (error) {
      if (error instanceof GetTodayNutritionError) {
        this.observability?.recordTodayRead({
          outcome: error.code === GET_TODAY_NUTRITION_ERROR_CODES.INVALID_SESSION
            ? 'unauthorized'
            : 'failure',
          durationMs: Date.now() - startedAt,
          safeErrorCode: toNutritionSafeErrorCode(error.code),
        });
        throw error;
      }

      this.observability?.recordTodayRead({
        outcome: 'failure',
        durationMs: Date.now() - startedAt,
        safeErrorCode: 'NUTRITION_PROCESSING_FAILED',
      });
      throw new GetTodayNutritionError(
        GET_TODAY_NUTRITION_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}

function buildUnavailableTodayNutrition(
  availability: 'not_configured' | 'insufficient_data',
  date = toUtcDateString(new Date()),
  freshness: 'current' | 'unknown' = 'unknown',
  lastUpdatedAt: string | null = null,
): GetTodayNutritionOutput['todayNutrition'] {
  return {
    availability,
    freshness,
    lastUpdatedAt,
    timezone: 'UTC',
    date,
    macroTargets: null,
    meals: [],
    progress: null,
    targets: null,
    calories: null,
    macros: [],
    mealProgress: null,
    nextMeal: null,
    focus: null,
    insight: null,
    actions: [],
    nutritionFocus: null,
  };
}

function toNutritionSafeErrorCode(
  errorCode: string,
): NutritionSafeErrorCode {
  switch (errorCode) {
    case GET_TODAY_NUTRITION_ERROR_CODES.INVALID_SESSION:
      return 'NUTRITION_UNAUTHORIZED';
    case GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND:
      return 'NUTRITION_PLAN_NOT_AVAILABLE';
    case GET_TODAY_NUTRITION_ERROR_CODES.NUTRITION_DAY_NOT_FOUND:
      return 'NUTRITION_DATA_INSUFFICIENT';
    case GET_TODAY_NUTRITION_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      return 'NUTRITION_PROFILE_NOT_CONFIGURED';
    default:
      return 'NUTRITION_UNKNOWN_ERROR';
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
