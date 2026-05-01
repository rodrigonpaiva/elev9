import { HydratedDocument, Schema, Types } from "mongoose";

import {
  ActivityLevel,
  FitnessGoal,
  LimitationSeverity,
} from "../../domain/entities/fitness-profile.entity";

export type FitnessProfileDocument = HydratedDocument<FitnessProfileSchemaClass>;

export class FitnessProfileSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  heightCm!: number;
  weightKg!: number;
  goal!: FitnessGoal;
  activityLevel!: ActivityLevel;
  trainingAvailability!: {
    daysPerWeek: number;
    minutesPerSession: number;
  };
  limitations!: Array<{
    type: string;
    description?: string;
    severity: LimitationSeverity;
  }>;
  status!: "active";
  createdAt!: Date;
  updatedAt!: Date;
}

export const FITNESS_PROFILE_MODEL_NAME = "FitnessProfile";
export const FITNESS_PROFILE_COLLECTION_NAME = "fitness_profiles";

export const FitnessProfileSchema = new Schema<FitnessProfileSchemaClass>(
  {
    userProfileId: { type: String, required: true, unique: true, index: true },
    heightCm: { type: Number, required: true },
    weightKg: { type: Number, required: true },
    goal: { type: String, required: true },
    activityLevel: { type: String, required: true },
    trainingAvailability: {
      daysPerWeek: { type: Number, required: true },
      minutesPerSession: { type: Number, required: true },
    },
    limitations: {
      type: [
        {
          type: { type: String, required: true },
          description: { type: String, required: false },
          severity: { type: String, required: true },
        },
      ],
      required: true,
      default: [],
    },
    status: { type: String, required: true, default: "active" },
  },
  {
    collection: FITNESS_PROFILE_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);
