import { HydratedDocument, Schema, Types } from 'mongoose';

export type WorkoutSessionDocument =
  HydratedDocument<WorkoutSessionSchemaClass>;

export class WorkoutSessionSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  trainingPlanId!: string;
  workoutDayIndex!: number;
  date!: string;
  status!: 'active' | 'completed';
  completedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
  replacements!: Array<{
    exerciseIndex: number;
    originalExercise: {
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
    };
    replacementExercise: {
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
    };
    reason: string;
    idempotencyKey: string;
    replacedAt: Date;
  }>;
}

export const WORKOUT_SESSION_MODEL_NAME = 'WorkoutSession';
export const WORKOUT_SESSION_COLLECTION_NAME = 'workout_sessions';

export const WorkoutSessionSchema = new Schema<WorkoutSessionSchemaClass>(
  {
    userProfileId: { type: String, required: true },
    trainingPlanId: { type: String, required: true },
    workoutDayIndex: { type: Number, required: true },
    date: { type: String, required: true },
    status: { type: String, required: true, default: 'active' },
    completedAt: { type: Date, required: false },
    replacements: {
      type: [
        {
          exerciseIndex: { type: Number, required: true },
          originalExercise: {
            name: { type: String, required: true },
            sets: { type: Number, required: true },
            reps: { type: String, required: true },
            restSeconds: { type: Number, required: true },
          },
          replacementExercise: {
            name: { type: String, required: true },
            sets: { type: Number, required: true },
            reps: { type: String, required: true },
            restSeconds: { type: Number, required: true },
          },
          reason: { type: String, required: true },
          idempotencyKey: { type: String, required: true },
          replacedAt: { type: Date, required: true },
        },
      ],
      required: true,
      default: [],
    },
  },
  {
    collection: WORKOUT_SESSION_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

WorkoutSessionSchema.index(
  { trainingPlanId: 1, workoutDayIndex: 1, date: 1 },
  { unique: true },
);
