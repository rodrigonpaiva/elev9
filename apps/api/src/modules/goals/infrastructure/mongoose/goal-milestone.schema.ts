import { HydratedDocument, Schema, Types } from 'mongoose';

import { GoalMilestoneType } from '../../domain/goals.types';

export type GoalMilestoneDocument = HydratedDocument<GoalMilestoneSchemaClass>;

export class GoalMilestoneSchemaClass {
  _id!: Types.ObjectId;
  goalId!: string;
  type!: GoalMilestoneType;
  title!: string;
  targetValue!: number;
  achieved!: boolean;
  achievedAt?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const GOAL_MILESTONE_MODEL_NAME = 'GoalMilestone';
export const GOAL_MILESTONE_COLLECTION_NAME = 'goal_milestones';

export const GoalMilestoneSchema = new Schema<GoalMilestoneSchemaClass>(
  {
    goalId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    targetValue: {
      type: Number,
      required: true,
    },
    achieved: {
      type: Boolean,
      required: true,
      default: false,
    },
    achievedAt: {
      type: String,
      required: false,
      default: undefined,
    },
  },
  {
    collection: GOAL_MILESTONE_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

GoalMilestoneSchema.index({ goalId: 1 });
GoalMilestoneSchema.index({ goalId: 1, achieved: 1 });
