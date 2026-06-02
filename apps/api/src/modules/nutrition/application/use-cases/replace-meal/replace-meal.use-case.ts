import { Inject, Injectable } from '@nestjs/common';

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  Meal,
  MealOption,
  MealProps,
} from '../../../domain/entities/meal.entity';
import { NutritionProfile } from '../../../domain/entities/nutrition-profile.entity';
import {
  NUTRITION_LOG_REPOSITORY,
  NutritionLogRepository,
} from '../../../domain/repositories/nutrition-log.repository';
import {
  NUTRITION_PLAN_REPOSITORY,
  NutritionPlanRepository,
} from '../../../domain/repositories/nutrition-plan.repository';
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from '../../../domain/repositories/nutrition-profile.repository';
import {
  REPLACE_MEAL_ERROR_CODES,
  ReplaceMealError,
} from './replace-meal.errors';
import { ReplaceMealOutput } from './replace-meal.output';

@Injectable()
export class ReplaceMealUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PROFILE_REPOSITORY)
    private readonly nutritionProfileRepository: NutritionProfileRepository,
    @Inject(NUTRITION_PLAN_REPOSITORY)
    private readonly nutritionPlanRepository: NutritionPlanRepository,
    @Inject(NUTRITION_LOG_REPOSITORY)
    private readonly nutritionLogRepository: NutritionLogRepository,
  ) {}

  async execute(input: {
    authUserId: string;
    mealId: string;
    reason?: string;
  }): Promise<ReplaceMealOutput> {
    const authUserId =
      typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

    if (!authUserId) {
      throw new ReplaceMealError(
        REPLACE_MEAL_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      );
    }

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new ReplaceMealError(
          REPLACE_MEAL_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          'User profile not found.',
        );
      }

      const nutritionProfile =
        await this.nutritionProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (!nutritionProfile) {
        throw new ReplaceMealError(
          REPLACE_MEAL_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
          'Nutrition profile not found.',
        );
      }

      const plan = await this.nutritionPlanRepository.findActiveByUserProfileId(
        userProfile.id,
      );

      if (!plan) {
        throw new ReplaceMealError(
          REPLACE_MEAL_ERROR_CODES.NUTRITION_PLAN_NOT_FOUND,
          'Active nutrition plan not found.',
        );
      }

      const match = plan.days
        .flatMap((day) => day.meals.map((meal) => ({ day, meal })))
        .find(({ meal }) => meal.id === input.mealId);

      if (!match) {
        throw new ReplaceMealError(
          REPLACE_MEAL_ERROR_CODES.MEAL_NOT_FOUND,
          'Meal not found in active nutrition plan.',
        );
      }

      const existingLog = await this.nutritionLogRepository.findByMealId(
        userProfile.id,
        input.mealId,
        match.day.date,
      );

      if (existingLog) {
        throw new ReplaceMealError(
          REPLACE_MEAL_ERROR_CODES.MEAL_ALREADY_LOGGED,
          'Logged meals cannot be replaced.',
        );
      }

      const alternative = chooseCompatibleAlternative({
        meal: match.meal,
        nutritionProfile,
      });

      if (!alternative) {
        throw new ReplaceMealError(
          REPLACE_MEAL_ERROR_CODES.NO_COMPATIBLE_ALTERNATIVE,
          'No compatible meal alternative is available.',
        );
      }

      const replacementMeal = buildReplacementMeal({
        originalMeal: match.meal,
        alternative,
      });
      const updatedPlan = await this.nutritionPlanRepository.replaceMeal(
        userProfile.id,
        input.mealId,
        replacementMeal,
      );

      const updatedMeal = updatedPlan?.days
        .flatMap((day) => day.meals)
        .find((meal) => meal.id === input.mealId);

      if (!updatedMeal) {
        throw new ReplaceMealError(
          REPLACE_MEAL_ERROR_CODES.INTERNAL_ERROR,
          'Meal replacement could not be persisted.',
        );
      }

      return {
        meal: updatedMeal,
        replacement: {
          previousMeal: new Meal({
            ...toMealProps(match.meal),
            status: 'replaced',
          }),
          reason: input.reason,
          replacedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof ReplaceMealError) {
        throw error;
      }

      throw new ReplaceMealError(
        REPLACE_MEAL_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}

function chooseCompatibleAlternative(input: {
  meal: Meal;
  nutritionProfile: NutritionProfile;
}): MealOption | null {
  const compatible = input.meal.alternatives.filter((alternative) =>
    isCompatible(alternative, input.nutritionProfile),
  );

  if (compatible.length === 0) {
    return null;
  }

  const preferredTerms = normalizeTerms(input.nutritionProfile.preferredFoods);
  const dislikedTerms = normalizeTerms(input.nutritionProfile.dislikedFoods);

  return [...compatible].sort((left, right) => {
    const leftPreferred = scoreTerms(left, preferredTerms);
    const rightPreferred = scoreTerms(right, preferredTerms);
    const leftDisliked = scoreTerms(left, dislikedTerms);
    const rightDisliked = scoreTerms(right, dislikedTerms);

    return rightPreferred - leftPreferred || leftDisliked - rightDisliked;
  })[0];
}

function isCompatible(
  alternative: MealOption,
  nutritionProfile: NutritionProfile,
): boolean {
  const blockedTerms = normalizeTerms([
    ...nutritionProfile.allergies,
    ...nutritionProfile.dietaryRestrictions,
  ]);

  return scoreTerms(alternative, blockedTerms) === 0;
}

function scoreTerms(alternative: MealOption, terms: string[]): number {
  const searchable = alternative.foodItems
    .flatMap((item) => [item.name, ...item.tags])
    .map((value) => value.toLowerCase());

  return terms.filter((term) =>
    searchable.some((value) => value.includes(term)),
  ).length;
}

function normalizeTerms(values: string[]): string[] {
  return values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function buildReplacementMeal(input: {
  originalMeal: Meal;
  alternative: MealOption;
}): MealProps {
  return {
    id: input.originalMeal.id,
    type: input.originalMeal.type,
    title: input.alternative.title,
    description: input.alternative.reason,
    foodItems: input.alternative.foodItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      estimatedMacros: item.estimatedMacros,
      tags: item.tags,
    })),
    estimatedMacros: input.alternative.estimatedMacros,
    alternatives: input.originalMeal.alternatives
      .filter((alternative) => alternative.id !== input.alternative.id)
      .map((alternative) => ({
        id: alternative.id,
        title: alternative.title,
        foodItems: alternative.foodItems.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          estimatedMacros: item.estimatedMacros,
          tags: item.tags,
        })),
        estimatedMacros: alternative.estimatedMacros,
        reason: alternative.reason,
      })),
    status: 'planned',
  };
}

function toMealProps(meal: Meal): MealProps {
  return {
    id: meal.id,
    type: meal.type,
    title: meal.title,
    description: meal.description,
    foodItems: meal.foodItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      estimatedMacros: item.estimatedMacros,
      tags: item.tags,
    })),
    estimatedMacros: meal.estimatedMacros,
    alternatives: meal.alternatives.map((alternative) => ({
      id: alternative.id,
      title: alternative.title,
      foodItems: alternative.foodItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        estimatedMacros: item.estimatedMacros,
        tags: item.tags,
      })),
      estimatedMacros: alternative.estimatedMacros,
      reason: alternative.reason,
    })),
    status: meal.status,
  };
}
