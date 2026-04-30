import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  LOG_WORKOUT_ERROR_CODES,
  LogWorkoutError,
} from "../../application/use-cases/log-workout/log-workout.errors";
import { WorkoutLog } from "../../domain/entities/workout-log.entity";
import {
  CreateWorkoutLogRepositoryInput,
  WorkoutLogRepository,
} from "../../domain/repositories/workout-log.repository";
import {
  WORKOUT_LOG_MODEL_NAME,
  WorkoutLogDocument,
  WorkoutLogSchemaClass,
} from "./workout-log.schema";

@Injectable()
export class MongooseWorkoutLogRepository implements WorkoutLogRepository {
  constructor(
    @InjectModel(WORKOUT_LOG_MODEL_NAME)
    private readonly workoutLogModel: Model<WorkoutLogSchemaClass>,
  ) {}

  async findByTrainingPlanDayAndDate(input: {
    trainingPlanId: string;
    workoutDayIndex: number;
    date: string;
  }): Promise<WorkoutLog | null> {
    const document = await this.workoutLogModel
      .findOne({
        trainingPlanId: input.trainingPlanId,
        workoutDayIndex: input.workoutDayIndex,
        date: input.date,
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as WorkoutLogDocument);
  }

  async create(input: CreateWorkoutLogRepositoryInput): Promise<WorkoutLog> {
    try {
      const document = await this.workoutLogModel.create(input);

      return this.toEntity(document as WorkoutLogDocument);
    } catch (error) {
      if (this.isDuplicateWorkoutLogError(error)) {
        throw new LogWorkoutError(
          LOG_WORKOUT_ERROR_CODES.ALREADY_EXISTS,
          "Workout log already exists.",
        );
      }

      throw error;
    }
  }

  private toEntity(document: WorkoutLogDocument): WorkoutLog {
    return new WorkoutLog({
      id: document._id.toString(),
      trainingPlanId: document.trainingPlanId,
      workoutDayIndex: document.workoutDayIndex,
      durationMinutes: document.durationMinutes,
      completedExercises: document.completedExercises.map((exercise) => ({
        name: exercise.name,
        setsDone: exercise.setsDone,
        repsDone: exercise.repsDone,
      })),
      feedback: document.feedback?.difficulty
        ? {
            difficulty: document.feedback.difficulty,
            notes: document.feedback.notes,
          }
        : undefined,
      date: document.date,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  private isDuplicateWorkoutLogError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const maybeError = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };

    return (
      maybeError.code === 11000 &&
      ("trainingPlanId" in (maybeError.keyPattern ?? {}) ||
        "trainingPlanId" in (maybeError.keyValue ?? {}))
    );
  }
}
