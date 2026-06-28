import { HydratedDocument, Schema, Types } from 'mongoose';

import {
  AdaptiveTrainingInfluenceCode,
  AdaptiveTrainingInfluenceImpact,
} from '../../domain/value-objects/adaptive-training-influence.value-object';
import {
  AdaptiveRecommendedIntensity,
  AdaptiveRecommendationType,
  AdaptiveVolumeAction,
} from '../../domain/value-objects/adaptive-recommendation-type.value-object';

export type AdaptiveTrainingRecommendationDocument =
  HydratedDocument<AdaptiveTrainingRecommendationSchemaClass>;

export class AdaptiveTrainingRecommendationSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  trainingPlanId?: string;
  date!: string;
  recommendationType!: AdaptiveRecommendationType;
  recommendedIntensity!: AdaptiveRecommendedIntensity;
  volumeAction!: AdaptiveVolumeAction;
  reasoning!: string;
  influences!: Array<{
    code: AdaptiveTrainingInfluenceCode;
    label: string;
    impact: AdaptiveTrainingInfluenceImpact;
    weight?: number;
    value?: number;
  }>;
  sourceContext?: Record<string, unknown>;
  formulaVersion!: string;
  generatedBy!: 'deterministic';
  createdAt!: Date;
  updatedAt!: Date;
}

export const ADAPTIVE_TRAINING_RECOMMENDATION_MODEL_NAME =
  'AdaptiveTrainingRecommendation';
export const ADAPTIVE_TRAINING_RECOMMENDATION_COLLECTION_NAME =
  'adaptive_training_recommendations';

const AdaptiveTrainingInfluenceSchema = {
  code: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  impact: {
    type: String,
    required: true,
  },
  weight: {
    type: Number,
    required: false,
    default: undefined,
  },
  value: {
    type: Number,
    required: false,
    default: undefined,
  },
} as const;

export const AdaptiveTrainingRecommendationSchema =
  new Schema<AdaptiveTrainingRecommendationSchemaClass>(
    {
      userProfileId: {
        type: String,
        required: true,
      },
      trainingPlanId: {
        type: String,
        required: false,
        default: undefined,
      },
      date: {
        type: String,
        required: true,
      },
      recommendationType: {
        type: String,
        required: true,
      },
      recommendedIntensity: {
        type: String,
        required: true,
      },
      volumeAction: {
        type: String,
        required: true,
      },
      reasoning: {
        type: String,
        required: true,
      },
      influences: {
        type: [AdaptiveTrainingInfluenceSchema],
        required: true,
        default: [],
      },
      sourceContext: {
        type: Schema.Types.Mixed,
        required: false,
        default: undefined,
      },
      formulaVersion: {
        type: String,
        required: true,
      },
      generatedBy: {
        type: String,
        required: true,
        default: 'deterministic',
      },
    },
    {
      collection: ADAPTIVE_TRAINING_RECOMMENDATION_COLLECTION_NAME,
      timestamps: true,
      versionKey: false,
    },
  );

AdaptiveTrainingRecommendationSchema.index(
  { userProfileId: 1, date: 1 },
  { unique: true },
);
AdaptiveTrainingRecommendationSchema.index({ trainingPlanId: 1, date: 1 });
AdaptiveTrainingRecommendationSchema.index({ userProfileId: 1, createdAt: -1 });
