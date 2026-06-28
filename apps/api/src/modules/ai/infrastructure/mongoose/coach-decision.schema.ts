import { HydratedDocument, Schema, Types } from 'mongoose';

import {
  CoachDecisionInfluenceCode,
  CoachDecisionInfluenceImpact,
  CoachDecisionInfluenceSource,
} from '../../domain/value-objects/coach-decision-influence.value-object';
import { CoachDecisionPriority } from '../../domain/value-objects/coach-decision-priority.value-object';

export type CoachDecisionDocument = HydratedDocument<CoachDecisionSchemaClass>;

export class CoachDecisionSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  date!: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  adaptiveTrainingRecommendationId?: string;
  priority!: CoachDecisionPriority;
  headline!: string;
  summary!: string;
  actionItems!: string[];
  influences!: Array<{
    code: CoachDecisionInfluenceCode;
    label: string;
    impact: CoachDecisionInfluenceImpact;
    source: CoachDecisionInfluenceSource;
    weight?: number;
    value?: number;
  }>;
  sourceContext?: Record<string, unknown>;
  formulaVersion!: string;
  generatedBy!: 'deterministic' | 'llm_assisted';
  llmMetadata?: {
    provider?: string;
    model?: string;
    used: boolean;
    failed?: boolean;
  };
  createdAt!: Date;
  updatedAt!: Date;
}

export const COACH_DECISION_MODEL_NAME = 'CoachDecision';
export const COACH_DECISION_COLLECTION_NAME = 'coach_decisions';

const CoachDecisionInfluenceSchema = {
  code: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  impact: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  weight: {
    type: Number,
    required: false,
    default: undefined,
  },
  value: {
    type: Number,
    required: false,
    default: undefined,
  },
} as const;

export const CoachDecisionSchema = new Schema<CoachDecisionSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    recoverySnapshotId: {
      type: String,
      required: false,
      default: undefined,
    },
    nutritionRecommendationId: {
      type: String,
      required: false,
      default: undefined,
    },
    adaptiveTrainingRecommendationId: {
      type: String,
      required: false,
      default: undefined,
    },
    priority: {
      type: String,
      required: true,
    },
    headline: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    actionItems: {
      type: [{ type: String, required: true }],
      required: true,
      default: [],
    },
    influences: {
      type: [CoachDecisionInfluenceSchema],
      required: true,
      default: [],
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
    generatedBy: {
      type: String,
      required: true,
      default: 'deterministic',
    },
    llmMetadata: {
      type: {
        provider: { type: String, required: false, default: undefined },
        model: { type: String, required: false, default: undefined },
        used: { type: Boolean, required: true },
        failed: { type: Boolean, required: false, default: undefined },
      },
      required: false,
      default: undefined,
    },
  },
  {
    collection: COACH_DECISION_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

CoachDecisionSchema.index({ userProfileId: 1, date: 1 }, { unique: true });
CoachDecisionSchema.index({ userProfileId: 1, createdAt: -1 });
CoachDecisionSchema.index({ recoverySnapshotId: 1 });
CoachDecisionSchema.index({ nutritionRecommendationId: 1 });
CoachDecisionSchema.index({ adaptiveTrainingRecommendationId: 1 });
