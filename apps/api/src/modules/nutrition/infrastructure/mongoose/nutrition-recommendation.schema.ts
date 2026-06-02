import { HydratedDocument, Schema, Types } from 'mongoose';

export type NutritionRecommendationDocument =
  HydratedDocument<NutritionRecommendationSchemaClass>;

export class NutritionRecommendationSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  message!: string;
  recommendations!: string[];
  influences!: string[];
  generatorVersion!: string;
  contextSnapshot!: Record<string, unknown>;
  createdAt!: Date;
}

export const NUTRITION_RECOMMENDATION_MODEL_NAME = 'NutritionRecommendation';
export const NUTRITION_RECOMMENDATION_COLLECTION_NAME =
  'nutrition_recommendations';

export const NutritionRecommendationSchema =
  new Schema<NutritionRecommendationSchemaClass>(
    {
      userProfileId: { type: String, required: true },
      message: { type: String, required: true },
      recommendations: { type: [String], required: true, default: [] },
      influences: { type: [String], required: true, default: [] },
      generatorVersion: { type: String, required: true },
      contextSnapshot: { type: Schema.Types.Mixed, required: true },
    },
    {
      collection: NUTRITION_RECOMMENDATION_COLLECTION_NAME,
      timestamps: { createdAt: true, updatedAt: false },
      versionKey: false,
    },
  );

NutritionRecommendationSchema.index({ userProfileId: 1, createdAt: -1 });
