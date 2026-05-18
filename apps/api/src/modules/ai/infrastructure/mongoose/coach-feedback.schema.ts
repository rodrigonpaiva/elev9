import { HydratedDocument, Schema, Types } from 'mongoose';

export type CoachFeedbackDocument = HydratedDocument<CoachFeedbackSchemaClass>;

export class CoachFeedbackSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  message!: string;
  insights!: string[];
  recommendations!: string[];
  influences?: string[];
  generatorVersion?: string;
  contextSnapshot?: {
    goal?: 'lose_weight' | 'gain_muscle' | 'maintain';
    activityLevel?: 'low' | 'medium' | 'high';
    hasTrainingPlan?: boolean;
    fatigueLevel?: 'LOW' | 'MODERATE' | 'HIGH';
    recoveryTrend?: 'improving' | 'stable' | 'needs_recovery';
    weeklyFrequency?: number;
    currentStreak?: number;
    averageWorkoutDuration?: number;
    recentWorkoutLogs?: Array<{
      date: string;
      durationMinutes: number;
      createdAt: string;
    }>;
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
    };
    nutritionProfile?: {
      goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
      mealsPerDay: number;
    };
  };
  createdAt!: Date;
  updatedAt!: Date;
}

export const COACH_FEEDBACK_MODEL_NAME = 'CoachFeedback';
export const COACH_FEEDBACK_COLLECTION_NAME = 'coach_feedbacks';

export const CoachFeedbackSchema = new Schema<CoachFeedbackSchemaClass>(
  {
    userProfileId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    insights: {
      type: [{ type: String, required: true }],
      required: true,
      default: [],
    },
    recommendations: {
      type: [{ type: String, required: true }],
      required: true,
      default: [],
    },
    influences: {
      type: [{ type: String, required: true }],
      required: false,
      default: undefined,
    },
    generatorVersion: {
      type: String,
      required: false,
      default: undefined,
    },
    contextSnapshot: {
      type: {
        goal: { type: String, required: false },
        activityLevel: { type: String, required: false },
        hasTrainingPlan: { type: Boolean, required: false },
        fatigueLevel: { type: String, required: false },
        recoveryTrend: { type: String, required: false },
        weeklyFrequency: { type: Number, required: false },
        currentStreak: { type: Number, required: false },
        averageWorkoutDuration: { type: Number, required: false },
        recentWorkoutLogs: {
          type: [
            {
              date: { type: String, required: false },
              durationMinutes: { type: Number, required: false },
              createdAt: { type: String, required: false },
            },
          ],
          required: false,
          default: undefined,
        },
        latestCheckIn: {
          energyLevel: { type: Number, required: false },
          sleepQuality: { type: Number, required: false },
          muscleSoreness: { type: Number, required: false },
          motivationLevel: { type: Number, required: false },
        },
        nutritionProfile: {
          goal: { type: String, required: false },
          mealsPerDay: { type: Number, required: false },
        },
      },
      required: false,
      default: undefined,
    },
  },
  {
    collection: COACH_FEEDBACK_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

CoachFeedbackSchema.index({ userProfileId: 1, createdAt: -1, _id: -1 });
