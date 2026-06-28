import { HydratedDocument, Schema, Types } from 'mongoose';

import type { ConsistencyTrend } from '../../domain/habits.types';

export type HabitSnapshotDocument = HydratedDocument<HabitSnapshotSchemaClass>;

export class HabitSnapshotSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  date!: string;
  consistencyScore!: number;
  streakDays!: number;
  adherenceScore!: number;
  trend!: ConsistencyTrend;
  sourceContext!: Record<string, unknown>;
  formulaVersion!: string;
  generatedAt!: Date;
  createdAt!: Date;
  updatedAt!: Date;
}

export const HABIT_SNAPSHOT_MODEL_NAME = 'HabitSnapshot';
export const HABIT_SNAPSHOT_COLLECTION_NAME = 'habit_snapshots';

export const HabitSnapshotSchema = new Schema<HabitSnapshotSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    consistencyScore: {
      type: Number,
      required: true,
    },
    streakDays: {
      type: Number,
      required: true,
    },
    adherenceScore: {
      type: Number,
      required: true,
    },
    trend: {
      type: String,
      required: true,
    },
    sourceContext: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    formulaVersion: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: HABIT_SNAPSHOT_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

HabitSnapshotSchema.index({ userProfileId: 1, date: 1 }, { unique: true });
HabitSnapshotSchema.index({
  userProfileId: 1,
  date: -1,
  createdAt: -1,
  _id: -1,
});
