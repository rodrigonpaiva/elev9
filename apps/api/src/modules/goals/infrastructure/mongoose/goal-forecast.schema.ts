import { HydratedDocument, Schema, Types } from 'mongoose';

import { GoalForecastConfidence } from '../../domain/goals.types';

export type GoalForecastDocument = HydratedDocument<GoalForecastSchemaClass>;

export class GoalForecastSchemaClass {
  _id!: Types.ObjectId;
  goalId!: string;
  userProfileId!: string;
  predictedCompletionDate?: string;
  confidence!: GoalForecastConfidence;
  estimatedDaysRemaining!: number;
  generatedAt!: string;
  formulaVersion!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const GOAL_FORECAST_MODEL_NAME = 'GoalForecast';
export const GOAL_FORECAST_COLLECTION_NAME = 'goal_forecasts';

export const GoalForecastSchema = new Schema<GoalForecastSchemaClass>(
  {
    goalId: {
      type: String,
      required: true,
    },
    userProfileId: {
      type: String,
      required: true,
    },
    predictedCompletionDate: {
      type: String,
      required: false,
      default: undefined,
    },
    confidence: {
      type: String,
      required: true,
    },
    estimatedDaysRemaining: {
      type: Number,
      required: true,
    },
    generatedAt: {
      type: String,
      required: true,
    },
    formulaVersion: {
      type: String,
      required: true,
    },
  },
  {
    collection: GOAL_FORECAST_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

GoalForecastSchema.index({ goalId: 1 }, { unique: true });
GoalForecastSchema.index({ userProfileId: 1, generatedAt: -1 });
