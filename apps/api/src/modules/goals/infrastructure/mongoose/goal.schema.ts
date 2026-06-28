import { HydratedDocument, Schema, Types } from 'mongoose';

import { GoalStatus, GoalType } from '../../domain/goals.types';

export type GoalDocument = HydratedDocument<GoalSchemaClass>;

export class GoalSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  type!: GoalType;
  status!: GoalStatus;
  startDate!: string;
  targetDate?: string;
  achievedAt?: string;
  targetValue?: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export const GOAL_MODEL_NAME = 'Goal';
export const GOAL_COLLECTION_NAME = 'goals';

export const GoalSchema = new Schema<GoalSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: 'active',
    },
    startDate: {
      type: String,
      required: true,
    },
    targetDate: {
      type: String,
      required: false,
      default: undefined,
    },
    achievedAt: {
      type: String,
      required: false,
      default: undefined,
    },
    targetValue: {
      type: Number,
      required: false,
      default: undefined,
    },
  },
  {
    collection: GOAL_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

GoalSchema.index({ userProfileId: 1, createdAt: -1 });
GoalSchema.index(
  { userProfileId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: 'active',
    },
  },
);
