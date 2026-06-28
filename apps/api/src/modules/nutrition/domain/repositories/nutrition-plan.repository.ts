import {
  NutritionDayProps,
  NutritionPlan,
} from '../entities/nutrition-plan.entity';
import { MealProps } from '../entities/meal.entity';
import { MacroTargetsProps } from '../value-objects/macro-targets.value-object';

export interface CreateNutritionPlanRepositoryInput {
  userProfileId: string;
  nutritionProfileId: string;
  fitnessProfileId: string;
  status: 'active';
  weekStartDate: string;
  weekEndDate: string;
  macroTargets: MacroTargetsProps;
  days: NutritionDayProps[];
  generatedBy: 'deterministic';
  sourceContext?: {
    formulaVersion?: string;
    activityMultiplier?: number;
    goalAdjustment?: number;
  };
}

export interface NutritionPlanRepository {
  findById(nutritionPlanId: string): Promise<NutritionPlan | null>;
  findActiveByUserProfileId(
    userProfileId: string,
  ): Promise<NutritionPlan | null>;
  create(input: CreateNutritionPlanRepositoryInput): Promise<NutritionPlan>;
  replaceActiveByUserProfileId(
    userProfileId: string,
    input: CreateNutritionPlanRepositoryInput,
  ): Promise<NutritionPlan>;
  replaceMeal(
    userProfileId: string,
    mealId: string,
    replacement: MealProps,
  ): Promise<NutritionPlan | null>;
}

export const NUTRITION_PLAN_REPOSITORY = Symbol('NUTRITION_PLAN_REPOSITORY');
