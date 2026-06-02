type MacroTargetsDto = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export class LogMealResponseDto {
  nutritionLog!: {
    id: string;
    userProfileId: string;
    nutritionPlanId: string;
    mealId: string;
    date: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    status: 'consumed' | 'partial' | 'skipped';
    actualMacros?: MacroTargetsDto;
    createdAt: string;
    updatedAt: string;
  };
}
