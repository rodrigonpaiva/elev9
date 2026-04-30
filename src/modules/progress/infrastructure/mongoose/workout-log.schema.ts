import { HydratedDocument, Schema, Types } from "mongoose";

export type WorkoutLogDocument = HydratedDocument<WorkoutLogSchemaClass>;

export class WorkoutLogSchemaClass {
  _id!: Types.ObjectId;
  trainingPlanId!: string;
  workoutDayIndex!: number;
  durationMinutes!: number;
  completedExercises!: Array<{
    name: string;
    setsDone: number;
    repsDone: number;
  }>;
  feedback?: {
    difficulty: "easy" | "medium" | "hard";
    notes?: string;
  };
  date!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const WORKOUT_LOG_MODEL_NAME = "WorkoutLog";
export const WORKOUT_LOG_COLLECTION_NAME = "workout_logs";

export const WorkoutLogSchema = new Schema<WorkoutLogSchemaClass>(
  {
    trainingPlanId: { type: String, required: true },
    workoutDayIndex: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    completedExercises: {
      type: [
        {
          name: { type: String, required: true },
          setsDone: { type: Number, required: true },
          repsDone: { type: Number, required: true },
        },
      ],
      required: true,
    },
    feedback: {
      difficulty: { type: String, required: false },
      notes: { type: String, required: false },
    },
    date: { type: String, required: true },
  },
  {
    collection: WORKOUT_LOG_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

WorkoutLogSchema.index(
  { trainingPlanId: 1, workoutDayIndex: 1, date: 1 },
  { unique: true },
);
