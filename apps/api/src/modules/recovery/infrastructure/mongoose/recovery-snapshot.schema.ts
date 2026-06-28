import { HydratedDocument, Schema, Types } from 'mongoose';

export type RecoverySnapshotDocument =
  HydratedDocument<RecoverySnapshotSchemaClass>;

export class RecoverySnapshotSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  date!: string;
  readinessScore!: number;
  fatigueScore!: number;
  recoveryTrend!: 'improving' | 'stable' | 'declining';
  recommendedIntensity!: 'recovery' | 'light' | 'moderate' | 'hard';
  influences!: Array<{
    code:
      | 'LOW_SLEEP'
      | 'LOW_ENERGY'
      | 'HIGH_MUSCLE_SORENESS'
      | 'HIGH_ADHERENCE'
      | 'LOW_ADHERENCE'
      | 'HIGH_WORKOUT_LOAD'
      | 'RECENT_WORKOUT_COMPLETION'
      | 'LONG_STREAK'
      | 'MISSED_WORKOUTS';
    label: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight?: number;
    value?: number;
  }>;
  formulaVersion!: string;
  sourceContext?: {
    sleepQuality?: number;
    energyLevel?: number;
    muscleSoreness?: number;
    adherenceScore?: number;
    recentWorkoutLoad?: number;
    currentStreak?: number;
    missedWorkouts?: number;
    recentCheckInsCount?: number;
    recentWorkoutLogsCount?: number;
    trainingPlanId?: string;
    previousReadinessScores?: number[];
    formulaVersion?: string;
    generatedAt?: string;
  };
  generatedBy!: 'deterministic';
  createdAt!: Date;
  updatedAt!: Date;
}

export const RECOVERY_SNAPSHOT_MODEL_NAME = 'RecoverySnapshot';
export const RECOVERY_SNAPSHOT_COLLECTION_NAME = 'recovery_snapshots';

const RecoveryInfluenceSchema = {
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

export const RecoverySnapshotSchema = new Schema<RecoverySnapshotSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    readinessScore: {
      type: Number,
      required: true,
    },
    fatigueScore: {
      type: Number,
      required: true,
    },
    recoveryTrend: {
      type: String,
      required: true,
    },
    recommendedIntensity: {
      type: String,
      required: true,
    },
    influences: {
      type: [RecoveryInfluenceSchema],
      required: true,
      default: [],
    },
    formulaVersion: {
      type: String,
      required: true,
    },
    sourceContext: {
      type: Schema.Types.Mixed,
      required: false,
      default: undefined,
    },
    generatedBy: {
      type: String,
      required: true,
      default: 'deterministic',
    },
  },
  {
    collection: RECOVERY_SNAPSHOT_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

RecoverySnapshotSchema.index({ userProfileId: 1, date: 1 }, { unique: true });
RecoverySnapshotSchema.index({ userProfileId: 1, createdAt: -1 });
