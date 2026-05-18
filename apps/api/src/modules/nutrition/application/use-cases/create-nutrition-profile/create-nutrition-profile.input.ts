import { NutritionGoal } from '../../../domain/entities/nutrition-profile.entity';

export type CreateNutritionProfileInput = {
  authUserId: string;
  goal: NutritionGoal;
  mealsPerDay: number;
  dietaryRestrictions?: string[];
  allergies?: string[];
  dislikedFoods?: string[];
  preferredFoods?: string[];
};
