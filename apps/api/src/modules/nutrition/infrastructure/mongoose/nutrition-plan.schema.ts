import { HydratedDocument, Schema, Types } from 'mongoose';

export type NutritionPlanDocument = HydratedDocument<NutritionPlanSchemaClass>;

export class NutritionPlanSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  nutritionProfileId!: string;
  fitnessProfileId!: string;
  status!: 'active' | 'replaced' | 'archived';
  weekStartDate!: string;
  weekEndDate!: string;
  macroTargets!: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  days!: Array<{
    date: string;
    dayIndex: number;
    dailyMacroTargets: {
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
    };
    meals: Array<{
      id: string;
      type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      title: string;
      description: string;
      foodItems: Array<{
        name: string;
        quantity: string;
        unit?: string;
        estimatedMacros?: {
          calories: number;
          proteinGrams: number;
          carbsGrams: number;
          fatGrams: number;
        };
        tags: string[];
      }>;
      estimatedMacros: {
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      };
      alternatives: Array<{
        id: string;
        title: string;
        foodItems: Array<{
          name: string;
          quantity: string;
          unit?: string;
          estimatedMacros?: {
            calories: number;
            proteinGrams: number;
            carbsGrams: number;
            fatGrams: number;
          };
          tags: string[];
        }>;
        estimatedMacros: {
          calories: number;
          proteinGrams: number;
          carbsGrams: number;
          fatGrams: number;
        };
        reason: string;
      }>;
      status: 'planned' | 'replaced';
    }>;
  }>;
  generatedBy!: 'deterministic';
  sourceContext?: {
    formulaVersion?: string;
    activityMultiplier?: number;
    goalAdjustment?: number;
  };
  replacedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export const NUTRITION_PLAN_MODEL_NAME = 'NutritionPlan';
export const NUTRITION_PLAN_COLLECTION_NAME = 'nutrition_plans';

const MacroTargetsSchema = {
  calories: { type: Number, required: true },
  proteinGrams: { type: Number, required: true },
  carbsGrams: { type: Number, required: true },
  fatGrams: { type: Number, required: true },
} as const;

const FoodItemSchema = {
  name: { type: String, required: true },
  quantity: { type: String, required: true },
  unit: { type: String, required: false },
  estimatedMacros: {
    type: MacroTargetsSchema,
    required: false,
    default: undefined,
  },
  tags: { type: [String], required: true, default: [] },
} as const;

const MealOptionSchema = {
  id: { type: String, required: true },
  title: { type: String, required: true },
  foodItems: { type: [FoodItemSchema], required: true, default: [] },
  estimatedMacros: { type: MacroTargetsSchema, required: true },
  reason: { type: String, required: true },
} as const;

const MealSchema = {
  id: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  foodItems: { type: [FoodItemSchema], required: true, default: [] },
  estimatedMacros: { type: MacroTargetsSchema, required: true },
  alternatives: { type: [MealOptionSchema], required: true, default: [] },
  status: { type: String, required: true },
} as const;

export const NutritionPlanSchema = new Schema<NutritionPlanSchemaClass>(
  {
    userProfileId: { type: String, required: true },
    nutritionProfileId: { type: String, required: true },
    fitnessProfileId: { type: String, required: true },
    status: { type: String, required: true, default: 'active' },
    weekStartDate: { type: String, required: true },
    weekEndDate: { type: String, required: true },
    macroTargets: { type: MacroTargetsSchema, required: true },
    days: {
      type: [
        {
          date: { type: String, required: true },
          dayIndex: { type: Number, required: true },
          dailyMacroTargets: { type: MacroTargetsSchema, required: true },
          meals: { type: [MealSchema], required: true, default: [] },
        },
      ],
      required: true,
      default: [],
    },
    generatedBy: { type: String, required: true, default: 'deterministic' },
    sourceContext: {
      formulaVersion: { type: String, required: false },
      activityMultiplier: { type: Number, required: false },
      goalAdjustment: { type: Number, required: false },
    },
    replacedAt: { type: Date, required: false },
  },
  {
    collection: NUTRITION_PLAN_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

NutritionPlanSchema.index({ userProfileId: 1, status: 1 });
NutritionPlanSchema.index({ userProfileId: 1, createdAt: -1 });
NutritionPlanSchema.index({ nutritionProfileId: 1, status: 1 });
NutritionPlanSchema.index(
  { userProfileId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
  },
);
