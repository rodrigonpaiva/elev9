import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import { Meal, MealLogStatus } from '../../../domain/entities/meal.entity';
import {
  DuplicateNutritionLogError,
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../domain/repositories/nutrition-log.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../domain/repositories/nutrition-plan.repository';
import { MacroTargetsProps } from '../../../domain/value-objects/macro-targets.value-object';
import { LOG_MEAL_ERROR_CODES, LogMealError } from './log-meal.errors';
import { LogMealInput } from './log-meal.input';
import { LogMealOutput } from './log-meal.output';

const VALID_STATUSES = new Set(['consumed', 'partial', 'skipped']);

@Injectable()
export class LogMealUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
  ) {}

  async execute(input: LogMealInput): Promise<LogMealOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new LogMealError(
        LOG_MEAL_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    this.validateInput(input);

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new LogMealError(
          LOG_MEAL_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const nutritionPlan =
        await this.nutritionPlanRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionPlan) {
        throw new LogMealError(
          LOG_MEAL_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
          'Active nutrition plan not found.',
        );
      }

      const date = input.date ?? toUtcDateString(new Date());
      const day = nutritionPlan.days.find((candidate) =>
        candidate.meals.some((meal) => meal.id === input.mealId),
      );

      if (!day) {
        throw new LogMealError(
          LOG_MEAL_ERROR_CODES.MEAL_NOT_FOUND,
          'Meal not found in active nutrition plan.',
        );
      }

      if (day.date !== date) {
        throw new LogMealError(
          LOG_MEAL_ERROR_CODES.MEAL_DATE_MISMATCH,
          'Meal does not belong to the requested date.',
          {
            requestedDate: date,
            mealDate: day.date,
          },
        );
      }

      const meal = day.meals.find((candidate) => candidate.id === input.mealId);

      if (!meal) {
        throw new LogMealError(
          LOG_MEAL_ERROR_CODES.MEAL_NOT_FOUND,
          'Meal not found in active nutrition plan.',
        );
      }

      const nutritionLog = await this.nutritionLogRepository.create({
        userProfileId: userProfile.id,
        nutritionPlanId: nutritionPlan.id,
        mealId: meal.id,
        date,
        mealType: meal.type,
        status: input.status,
        actualMacros: resolveActualMacros({
          status: input.status,
          actualMacros: input.actualMacros,
          meal,
        }),
      });

      return { nutritionLog };
    } catch (error) {
      if (error instanceof LogMealError) {
        throw error;
      }

      if (error instanceof DuplicateNutritionLogError) {
        throw new LogMealError(
          LOG_MEAL_ERROR_CODES.DUPLICATE_LOG,
          'Nutrition log already exists for this meal and date.',
        );
      }

      throw new LogMealError(
        LOG_MEAL_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }

  private validateInput(input: LogMealInput): void {
    if (typeof input.mealId !== 'string' || !input.mealId.trim()) {
      throw new LogMealError(
        LOG_MEAL_ERROR_CODES.INVALID_INPUT,
        'mealId is required.',
      );
    }

    if (!VALID_STATUSES.has(input.status)) {
      throw new LogMealError(
        LOG_MEAL_ERROR_CODES.INVALID_INPUT,
        'Invalid meal log status.',
      );
    }

    if (input.date !== undefined && !isIsoDate(input.date)) {
      throw new LogMealError(
        LOG_MEAL_ERROR_CODES.INVALID_INPUT,
        'date must be formatted as YYYY-MM-DD.',
      );
    }

    if (
      input.actualMacros !== undefined &&
      !isValidMacroTargets(input.actualMacros)
    ) {
      throw new LogMealError(
        LOG_MEAL_ERROR_CODES.INVALID_INPUT,
        'actualMacros must contain non-negative finite macro values.',
      );
    }
  }
}

function resolveActualMacros(input: {
  status: MealLogStatus;
  actualMacros?: MacroTargetsProps;
  meal: Meal;
}): MacroTargetsProps {
  if (input.status === 'skipped') {
    return zeroMacros();
  }

  if (input.actualMacros) {
    return input.actualMacros;
  }

  if (input.status === 'consumed') {
    return input.meal.estimatedMacros;
  }

  return zeroMacros();
}

function zeroMacros(): MacroTargetsProps {
  return {
    calories: 0,
    proteinGrams: 0,
    carbsGrams: 0,
    fatGrams: 0,
  };
}

function isValidMacroTargets(value: MacroTargetsProps): boolean {
  return (
    isNonNegativeFiniteNumber(value.calories) &&
    isNonNegativeFiniteNumber(value.proteinGrams) &&
    isNonNegativeFiniteNumber(value.carbsGrams) &&
    isNonNegativeFiniteNumber(value.fatGrams)
  );
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
