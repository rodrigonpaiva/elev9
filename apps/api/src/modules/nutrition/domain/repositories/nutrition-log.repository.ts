import { MealLogStatus, MealType } from '../entities/meal.entity';
import { NutritionLog } from '../entities/nutrition-log.entity';
import { MacroTargetsProps } from '../value-objects/macro-targets.value-object';

export interface CreateNutritionLogRepositoryInput {
  userProfileId: string;
  nutritionPlanId: string;
  mealId: string;
  date: string;
  mealType: MealType;
  status: MealLogStatus;
  actualMacros?: MacroTargetsProps;
}

export class DuplicateNutritionLogError extends Error {
  constructor() {
    super('Nutrition log already exists for this meal and date.');
    this.name = 'DuplicateNutritionLogError';
  }
}

export interface NutritionLogRepository {
  create(input: CreateNutritionLogRepositoryInput): Promise<NutritionLog>;
  findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<NutritionLog[]>;
  findByUserProfileIdAndDateRange(
    userProfileId: string,
    from: string,
    to: string,
  ): Promise<NutritionLog[]>;
  findByMealId(
    userProfileId: string,
    mealId: string,
    date: string,
  ): Promise<NutritionLog | null>;
}

export const NUTRITION_LOG_REPOSITORY = Symbol('NUTRITION_LOG_REPOSITORY');
