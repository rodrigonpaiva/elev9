import { HydratedDocument, Schema, Types } from "mongoose";

import {
  ActivityLevel,
  FitnessGoal,
} from "../../../fitness/domain/entities/fitness-profile.entity";
import {
  TrainingPlanFormat,
  TrainingPlanIntensity,
} from "../../domain/entities/training-plan.entity";

export type TrainingPlanDocument = HydratedDocument<TrainingPlanSchemaClass>;

export class TrainingPlanSchemaClass {
  _id!: Types.ObjectId;
  fitnessProfileId!: string;
  goal!: FitnessGoal;
  activityLevel!: ActivityLevel;
  weeklySchedule!: Array<{
    dayIndex: number;
    title: string;
    focus: string;
    format: TrainingPlanFormat;
    intensity: TrainingPlanIntensity;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
    }>;
  }>;
  status!: "active";
  createdAt!: Date;
  updatedAt!: Date;
}

export const TRAINING_PLAN_MODEL_NAME = "TrainingPlan";
export const TRAINING_PLAN_COLLECTION_NAME = "training_plans";

export const TrainingPlanSchema = new Schema<TrainingPlanSchemaClass>(
  {
    fitnessProfileId: { type: String, required: true },
    goal: { type: String, required: true },
    activityLevel: { type: String, required: true },
    weeklySchedule: {
      type: [
        {
          dayIndex: { type: Number, required: true },
          title: { type: String, required: true },
          focus: { type: String, required: true },
          format: { type: String, required: true },
          intensity: { type: String, required: true },
          exercises: {
            type: [
              {
                name: { type: String, required: true },
                sets: { type: Number, required: true },
                reps: { type: String, required: true },
                restSeconds: { type: Number, required: true },
              },
            ],
            required: true,
          },
        },
      ],
      required: true,
    },
    status: { type: String, required: true, default: "active" },
  },
  {
    collection: TRAINING_PLAN_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

TrainingPlanSchema.index(
  { fitnessProfileId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  },
);
