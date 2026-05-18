export class CreateNutritionProfileResponseDto {
  nutritionProfile!: {
    id: string;
    userProfileId: string;
    goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
    mealsPerDay: number;
    dietaryRestrictions: string[];
    allergies: string[];
    dislikedFoods: string[];
    preferredFoods: string[];
    status: 'active';
    createdAt: string;
    updatedAt: string;
  };
}
