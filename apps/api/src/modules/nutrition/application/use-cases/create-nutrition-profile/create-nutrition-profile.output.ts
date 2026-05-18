import { NutritionGoal } from '../../../domain/entities/nutrition-profile.entity';

export type CreateNutritionProfileOutput = {
  nutritionProfile: {
    id: string;
    userProfileId: string;
    goal: NutritionGoal;
    mealsPerDay: number;
    dietaryRestrictions: string[];
    allergies: string[];
    dislikedFoods: string[];
    preferredFoods: string[];
    status: 'active';
    createdAt: Date;
    updatedAt: Date;
  };
};
