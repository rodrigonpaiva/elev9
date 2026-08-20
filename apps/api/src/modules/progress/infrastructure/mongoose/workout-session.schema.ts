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
