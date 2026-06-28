import { HydratedDocument, Schema, Types } from 'mongoose';

import { GoalTrend } from '../../domain/goals.types';

export type GoalProgressSnapshotDocument =
  HydratedDocument<GoalProgressSnapshotSchemaClass>;

export class GoalProgressSnapshotSchemaClass {
  _id!: Types.ObjectId;
  goalId!: string;
  userProfileId!: string;
  date!: string;
  progressPercentage!: number;
  currentValue!: number;
  targetValue!: number;
  trend!: GoalTrend;
  sourceContext?: Record<string, unknown>;
  formulaVersion!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const GOAL_PROGRESS_SNAPSHOT_MODEL_NAME = 'GoalProgressSnapshot';
export const GOAL_PROGRESS_SNAPSHOT_COLLECTION_NAME = 'goal_progress_snapshots';

export const GoalProgressSnapshotSchema =
  new Schema<GoalProgressSnapshotSchemaClass>(
    {
      goalId: {
        type: String,
        required: true,
      },
      userProfileId: {
        type: String,
        required: true,
      },
      date: {
        type: String,
        required: true,
      },
      progressPercentage: {
        type: Number,
        required: true,
      },
      currentValue: {
        type: Number,
        required: true,
      },
      targetValue: {
        type: Number,
        required: true,
      },
      trend: {
        type: String,
        required: true,
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
    },
    {
      collection: GOAL_PROGRESS_SNAPSHOT_COLLECTION_NAME,
      timestamps: true,
      versionKey: false,
    },
  );

GoalProgressSnapshotSchema.index({ goalId: 1, date: 1 }, { unique: true });
GoalProgressSnapshotSchema.index({ userProfileId: 1, date: -1 });
GoalProgressSnapshotSchema.index({ goalId: 1, createdAt: -1 });
