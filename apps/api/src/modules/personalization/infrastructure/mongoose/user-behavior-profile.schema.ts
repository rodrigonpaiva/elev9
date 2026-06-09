import { HydratedDocument, Schema, Types } from 'mongoose';

import type {
  CoachingStyle,
  EngagementProfile,
  ResponsivenessLevel,
} from '../../domain/personalization.types';

export type UserBehaviorProfileDocument =
  HydratedDocument<UserBehaviorProfileSchemaClass>;

export class UserBehaviorProfileSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  preferredCoachingStyle!: CoachingStyle;
  notificationResponsiveness!: ResponsivenessLevel;
  goalResponsiveness!: ResponsivenessLevel;
  recoveryResponsiveness!: ResponsivenessLevel;
  habitResponsiveness!: ResponsivenessLevel;
  engagementProfile!: EngagementProfile;
  riskOfDisengagement!: ResponsivenessLevel;
  formulaVersion!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const USER_BEHAVIOR_PROFILE_MODEL_NAME = 'UserBehaviorProfile';
export const USER_BEHAVIOR_PROFILE_COLLECTION_NAME =
  'user_behavior_profiles';

export const UserBehaviorProfileSchema = new Schema<UserBehaviorProfileSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    preferredCoachingStyle: {
      type: String,
      required: true,
    },
    notificationResponsiveness: {
      type: String,
      required: true,
    },
    goalResponsiveness: {
      type: String,
      required: true,
    },
    recoveryResponsiveness: {
      type: String,
      required: true,
    },
    habitResponsiveness: {
      type: String,
      required: true,
    },
    engagementProfile: {
      type: String,
      required: true,
    },
    riskOfDisengagement: {
      type: String,
      required: true,
    },
    formulaVersion: {
      type: String,
      required: true,
    },
  },
  {
    collection: USER_BEHAVIOR_PROFILE_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

UserBehaviorProfileSchema.index({ userProfileId: 1 }, { unique: true });
