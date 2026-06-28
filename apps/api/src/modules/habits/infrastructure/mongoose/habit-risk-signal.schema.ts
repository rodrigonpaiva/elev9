import { HydratedDocument, Schema, Types } from 'mongoose';

import type { HabitRiskLevel, RiskSignalType } from '../../domain/habits.types';

export type HabitRiskSignalDocument =
  HydratedDocument<HabitRiskSignalSchemaClass>;

export class HabitRiskSignalSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  type!: RiskSignalType;
  level!: HabitRiskLevel;
  title!: string;
  description!: string;
  generatedAt!: Date;
  formulaVersion!: string;
  createdAt!: Date;
}

export const HABIT_RISK_SIGNAL_MODEL_NAME = 'HabitRiskSignal';
export const HABIT_RISK_SIGNAL_COLLECTION_NAME = 'habit_risk_signals';

export const HabitRiskSignalSchema = new Schema<HabitRiskSignalSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
    },
    formulaVersion: {
      type: String,
      required: true,
    },
  },
  {
    collection: HABIT_RISK_SIGNAL_COLLECTION_NAME,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

HabitRiskSignalSchema.index({
  userProfileId: 1,
  generatedAt: -1,
  createdAt: -1,
  _id: -1,
});
HabitRiskSignalSchema.index({ userProfileId: 1, type: 1 });
