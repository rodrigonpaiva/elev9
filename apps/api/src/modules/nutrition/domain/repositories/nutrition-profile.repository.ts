import {
  NutritionGoal,
  NutritionProfile,
} from '../entities/nutrition-profile.entity';

export interface UpsertNutritionProfileRepositoryInput {
  userProfileId: string;
  goal: NutritionGoal;
  mealsPerDay: number;
  dietaryRestrictions: string[];
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  status: 'active';
}

export interface NutritionProfileRepository {
  findActiveByUserProfileId(
    userProfileId: string,
  ): Promise<NutritionProfile | null>;
  upsertByUserProfileId(
    input: UpsertNutritionProfileRepositoryInput,
  ): Promise<NutritionProfile>;
}

export const NUTRITION_PROFILE_REPOSITORY = Symbol(
  'NUTRITION_PROFILE_REPOSITORY',
);
