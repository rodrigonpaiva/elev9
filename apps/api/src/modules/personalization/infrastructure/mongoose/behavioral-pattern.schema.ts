import { HydratedDocument, Schema, Types } from 'mongoose';

import type {
  BehavioralPatternType,
  ResponsivenessLevel,
} from '../../domain/personalization.types';

export type BehavioralPatternDocument =
  HydratedDocument<BehavioralPatternSchemaClass>;

export class BehavioralPatternSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  type!: BehavioralPatternType;
  confidence!: ResponsivenessLevel;
  evidenceCount!: number;
  lastObservedAt!: Date;
  formulaVersion!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const BEHAVIORAL_PATTERN_MODEL_NAME = 'BehavioralPattern';
export const BEHAVIORAL_PATTERN_COLLECTION_NAME = 'behavioral_patterns';

export const BehavioralPatternSchema = new Schema<BehavioralPatternSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    confidence: {
      type: String,
      required: true,
    },
    evidenceCount: {
      type: Number,
      required: true,
    },
    lastObservedAt: {
      type: Date,
      required: true,
    },
    formulaVersion: {
      type: String,
      required: true,
    },
  },
  {
    collection: BEHAVIORAL_PATTERN_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

BehavioralPatternSchema.index({ userProfileId: 1, type: 1 }, { unique: true });
BehavioralPatternSchema.index({
  userProfileId: 1,
  lastObservedAt: -1,
  createdAt: -1,
  _id: -1,
});
