import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  CREATE_TRAINING_PLAN_ERROR_CODES,
  CreateTrainingPlanError,
} from "../../application/use-cases/create-training-plan/create-training-plan.errors";
import { TrainingPlan } from "../../domain/entities/training-plan.entity";
import {
  CreateTrainingPlanRepositoryInput,
  TrainingPlanRepository,
} from "../../domain/repositories/training-plan.repository";
import {
  TRAINING_PLAN_MODEL_NAME,
  TrainingPlanDocument,
  TrainingPlanSchemaClass,
} from "./training-plan.schema";

@Injectable()
export class MongooseTrainingPlanRepository implements TrainingPlanRepository {
  constructor(
    @InjectModel(TRAINING_PLAN_MODEL_NAME)
    private readonly trainingPlanModel: Model<TrainingPlanSchemaClass>,
  ) {}

  async findActiveByFitnessProfileId(
    fitnessProfileId: string,
  ): Promise<TrainingPlan | null> {
    const document = await this.trainingPlanModel
      .findOne({
        fitnessProfileId,
        status: "active",
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as TrainingPlanDocument);
  }

  async create(
    input: CreateTrainingPlanRepositoryInput,
  ): Promise<TrainingPlan> {
    try {
      const document = await this.trainingPlanModel.create(input);

      return this.toEntity(document as TrainingPlanDocument);
    } catch (error) {
      if (this.isDuplicateFitnessProfileIdError(error)) {
        throw new CreateTrainingPlanError(
          CREATE_TRAINING_PLAN_ERROR_CODES.ALREADY_EXISTS,
          "Training plan already exists.",
        );
      }

      throw error;
    }
  }

  private toEntity(document: TrainingPlanDocument): TrainingPlan {
    return new TrainingPlan({
      id: document._id.toString(),
      fitnessProfileId: document.fitnessProfileId,
      goal: document.goal,
      activityLevel: document.activityLevel,
      weeklySchedule: document.weeklySchedule.map((day) => ({
        dayIndex: day.dayIndex,
        title: day.title,
        focus: day.focus,
        format: day.format,
        intensity: day.intensity,
        exercises: day.exercises.map((exercise) => ({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
        })),
      })),
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  private isDuplicateFitnessProfileIdError(error: unknown): boolean {
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
      ("fitnessProfileId" in (maybeError.keyPattern ?? {}) ||
        "fitnessProfileId" in (maybeError.keyValue ?? {}))
    );
  }
}
