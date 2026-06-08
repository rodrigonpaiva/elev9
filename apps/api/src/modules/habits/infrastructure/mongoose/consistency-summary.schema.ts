import { HydratedDocument, Schema, Types } from 'mongoose';

import type { HabitRiskLevel, ConsistencyTrend } from '../../domain/habits.types';

export type ConsistencySummaryDocument =
  HydratedDocument<ConsistencySummarySchemaClass>;

export class ConsistencySummarySchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  score!: number;
  trend!: ConsistencyTrend;
  currentStreak!: number;
  longestStreak!: number;
  adherenceRate!: number;
  riskLevel!: HabitRiskLevel;
  formulaVersion!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const CONSISTENCY_SUMMARY_MODEL_NAME = 'ConsistencySummary';
export const CONSISTENCY_SUMMARY_COLLECTION_NAME = 'consistency_summaries';

export const ConsistencySummarySchema = new Schema<ConsistencySummarySchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    trend: {
      type: String,
      required: true,
    },
    currentStreak: {
      type: Number,
      required: true,
    },
    longestStreak: {
      type: Number,
      required: true,
    },
    adherenceRate: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      required: true,
    },
    formulaVersion: {
      type: String,
      required: true,
    },
  },
  {
    collection: CONSISTENCY_SUMMARY_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

ConsistencySummarySchema.index({ userProfileId: 1 }, { unique: true });
