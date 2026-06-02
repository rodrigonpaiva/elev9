type MacroTargetsDto = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

type FoodItemDto = {
  name: string;
  quantity: string;
  unit?: string;
  estimatedMacros?: MacroTargetsDto;
  tags: string[];
};

type MealOptionDto = {
  id: string;
  title: string;
  foodItems: FoodItemDto[];
  estimatedMacros: MacroTargetsDto;
  reason: string;
};

type MealDto = {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  description: string;
  foodItems: FoodItemDto[];
  estimatedMacros: MacroTargetsDto;
  alternatives: MealOptionDto[];
  status: 'planned' | 'replaced';
};

export class CreateNutritionPlanResponseDto {
  nutritionPlan!: {
    id: string;
    userProfileId: string;
    nutritionProfileId: string;
    fitnessProfileId: string;
    status: 'active' | 'archived' | 'replaced';
    weekStartDate: string;
    weekEndDate: string;
    macroTargets: MacroTargetsDto;
    days: Array<{
      date: string;
      dayIndex: number;
      meals: MealDto[];
      dailyMacroTargets: MacroTargetsDto;
    }>;
    generatedBy: 'deterministic';
    sourceContext?: {
      formulaVersion?: string;
      activityMultiplier?: number;
      goalAdjustment?: number;
    };
    createdAt: string;
    updatedAt?: string;
    replacedAt?: string;
  };
}
