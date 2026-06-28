import { CreateNutritionPlanResponseDto } from './create-nutrition-plan.response.dto';

type MealDto =
  CreateNutritionPlanResponseDto['nutritionPlan']['days'][number]['meals'][number];

export class ReplaceMealResponseDto {
  meal!: MealDto;
  replacement!: {
    previousMeal: MealDto;
    reason?: string;
    replacedAt: string;
  };
}
