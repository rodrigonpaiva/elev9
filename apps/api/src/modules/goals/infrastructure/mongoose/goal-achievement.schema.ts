import { HydratedDocument, Schema, Types } from 'mongoose';

export type GoalAchievementDocument =
  HydratedDocument<GoalAchievementSchemaClass>;

export class GoalAchievementSchemaClass {
  _id!: Types.ObjectId;
  goalId!: string;
  userProfileId!: string;
  achievedAt!: string;
  completionPercentage!: number;
  notes?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const GOAL_ACHIEVEMENT_MODEL_NAME = 'GoalAchievement';
export const GOAL_ACHIEVEMENT_COLLECTION_NAME = 'goal_achievements';

export const GoalAchievementSchema = new Schema<GoalAchievementSchemaClass>(
  {
    goalId: {
      type: String,
      required: true,
    },
    userProfileId: {
      type: String,
      required: true,
    },
    achievedAt: {
      type: String,
      required: true,
    },
    completionPercentage: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      required: false,
      default: undefined,
    },
  },
  {
    collection: GOAL_ACHIEVEMENT_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

GoalAchievementSchema.index({ goalId: 1 });
GoalAchievementSchema.index({ userProfileId: 1, achievedAt: -1 });
