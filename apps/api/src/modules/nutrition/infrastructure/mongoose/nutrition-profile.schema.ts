import { HydratedDocument, Schema, Types } from 'mongoose';

import { NutritionGoal } from '../../domain/entities/nutrition-profile.entity';

export type NutritionProfileDocument =
  HydratedDocument<NutritionProfileSchemaClass>;

export class NutritionProfileSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  goal!: NutritionGoal;
  mealsPerDay!: number;
  dietaryRestrictions!: string[];
  allergies!: string[];
  dislikedFoods!: string[];
  preferredFoods!: string[];
  status!: 'active';
  createdAt!: Date;
  updatedAt!: Date;
}

export const NUTRITION_PROFILE_MODEL_NAME = 'NutritionProfile';
export const NUTRITION_PROFILE_COLLECTION_NAME = 'nutrition_profiles';

export const NutritionProfileSchema = new Schema<NutritionProfileSchemaClass>(
  {
    userProfileId: { type: String, required: true, unique: true, index: true },
    goal: { type: String, required: true },
    mealsPerDay: { type: Number, required: true },
    dietaryRestrictions: { type: [String], required: true, default: [] },
    allergies: { type: [String], required: true, default: [] },
    dislikedFoods: { type: [String], required: true, default: [] },
    preferredFoods: { type: [String], required: true, default: [] },
    status: { type: String, required: true, default: 'active' },
  },
  {
    collection: NUTRITION_PROFILE_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);
