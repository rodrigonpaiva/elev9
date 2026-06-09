import { HydratedDocument, Schema, Types } from 'mongoose';

import type {
  CoachingStyle,
  EngagementProfile,
  PersonalizationTrend,
  ResponsivenessLevel,
} from '../../domain/personalization.types';

export type PersonalizationSnapshotDocument =
  HydratedDocument<PersonalizationSnapshotSchemaClass>;

export class PersonalizationSnapshotSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  date!: string;
  preferredCoachingStyle!: CoachingStyle;
  engagementProfile!: EngagementProfile;
  notificationResponsiveness!: ResponsivenessLevel;
  goalResponsiveness!: ResponsivenessLevel;
  recoveryResponsiveness!: ResponsivenessLevel;
  habitResponsiveness!: ResponsivenessLevel;
  riskOfDisengagement!: ResponsivenessLevel;
  trend!: PersonalizationTrend;
  sourceContext!: Record<string, unknown>;
  formulaVersion!: string;
  generatedAt!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const PERSONALIZATION_SNAPSHOT_MODEL_NAME = 'PersonalizationSnapshot';
export const PERSONALIZATION_SNAPSHOT_COLLECTION_NAME =
  'personalization_snapshots';

export const PersonalizationSnapshotSchema = new Schema<PersonalizationSnapshotSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    preferredCoachingStyle: {
      type: String,
      required: true,
    },
    engagementProfile: {
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
    riskOfDisengagement: {
      type: String,
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
      type: String,
      required: true,
    },
  },
  {
    collection: PERSONALIZATION_SNAPSHOT_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

PersonalizationSnapshotSchema.index(
  { userProfileId: 1, date: 1 },
  { unique: true },
);
PersonalizationSnapshotSchema.index({
  userProfileId: 1,
  date: -1,
  createdAt: -1,
  _id: -1,
});
