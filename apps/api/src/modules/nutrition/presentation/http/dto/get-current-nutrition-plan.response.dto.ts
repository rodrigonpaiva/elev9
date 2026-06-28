import { CreateNutritionPlanResponseDto } from './create-nutrition-plan.response.dto';

export class GetCurrentNutritionPlanResponseDto {
  nutritionPlan!: CreateNutritionPlanResponseDto['nutritionPlan'];
}
