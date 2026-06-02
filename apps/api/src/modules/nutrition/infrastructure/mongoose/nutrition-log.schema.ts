import { HydratedDocument, Schema, Types } from 'mongoose';

export type NutritionLogDocument = HydratedDocument<NutritionLogSchemaClass>;

export class NutritionLogSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  nutritionPlanId!: string;
  mealId!: string;
  date!: string;
  mealType!: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  status!: 'consumed' | 'partial' | 'skipped';
  actualMacros?: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  createdAt!: Date;
  updatedAt!: Date;
}

export const NUTRITION_LOG_MODEL_NAME = 'NutritionLog';
export const NUTRITION_LOG_COLLECTION_NAME = 'nutrition_logs';

const MacroTargetsSchema = {
  calories: { type: Number, required: true },
  proteinGrams: { type: Number, required: true },
  carbsGrams: { type: Number, required: true },
  fatGrams: { type: Number, required: true },
} as const;

export const NutritionLogSchema = new Schema<NutritionLogSchemaClass>(
  {
    userProfileId: { type: String, required: true },
    nutritionPlanId: { type: String, required: true },
    mealId: { type: String, required: true },
    date: { type: String, required: true },
    mealType: { type: String, required: true },
    status: { type: String, required: true },
    actualMacros: {
      type: MacroTargetsSchema,
      required: false,
      default: undefined,
    },
  },
  {
    collection: NUTRITION_LOG_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

NutritionLogSchema.index({ userProfileId: 1, date: -1 });
NutritionLogSchema.index({ nutritionPlanId: 1, date: -1 });
NutritionLogSchema.index(
  { userProfileId: 1, mealId: 1, date: 1 },
  { unique: true },
);
