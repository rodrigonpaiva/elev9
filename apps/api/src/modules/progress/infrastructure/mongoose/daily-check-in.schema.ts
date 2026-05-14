import { HydratedDocument, Schema, Types } from "mongoose";

export type DailyCheckInDocument = HydratedDocument<DailyCheckInSchemaClass>;

export class DailyCheckInSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  energyLevel!: number;
  sleepQuality!: number;
  muscleSoreness!: number;
  motivationLevel!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export const DAILY_CHECK_IN_MODEL_NAME = "DailyCheckIn";
export const DAILY_CHECK_IN_COLLECTION_NAME = "daily_check_ins";

export const DailyCheckInSchema = new Schema<DailyCheckInSchemaClass>(
  {
    userProfileId: { type: String, required: true },
    energyLevel: { type: Number, required: true },
    sleepQuality: { type: Number, required: true },
    muscleSoreness: { type: Number, required: true },
    motivationLevel: { type: Number, required: true },
  },
  {
    collection: DAILY_CHECK_IN_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

DailyCheckInSchema.index({ userProfileId: 1, createdAt: -1 });
