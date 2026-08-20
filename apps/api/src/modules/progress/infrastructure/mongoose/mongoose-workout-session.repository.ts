import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { WorkoutSession } from '../../domain/entities/workout-session.entity';
import {
  CreateWorkoutSessionRepositoryInput,
  WorkoutSessionRepository,
} from '../../domain/repositories/workout-session.repository';
import {
  WORKOUT_SESSION_MODEL_NAME,
  WorkoutSessionDocument,
  WorkoutSessionSchemaClass,
} from './workout-session.schema';

@Injectable()
export class MongooseWorkoutSessionRepository implements WorkoutSessionRepository {
  constructor(
    @InjectModel(WORKOUT_SESSION_MODEL_NAME)
    private readonly workoutSessionModel: Model<WorkoutSessionSchemaClass>,
  ) {}

  async findById(id: string): Promise<WorkoutSession | null> {
    const document = await this.workoutSessionModel.findById(id).exec();
    return document ? this.toEntity(document as WorkoutSessionDocument) : null;
  }

  async findByPlanDayAndDate(input: {
    trainingPlanId: string;
    workoutDayIndex: number;
    date: string;
  }): Promise<WorkoutSession | null> {
    const document = await this.workoutSessionModel
      .findOne({
        trainingPlanId: input.trainingPlanId,
        workoutDayIndex: input.workoutDayIndex,
        date: input.date,
      })
      .exec();

    return document ? this.toEntity(document as WorkoutSessionDocument) : null;
  }

  async create(
    input: CreateWorkoutSessionRepositoryInput,
  ): Promise<WorkoutSession> {
    try {
      const document = await this.workoutSessionModel.create(input);
      return this.toEntity(document as WorkoutSessionDocument);
    } catch (error) {
      if (this.isDuplicateSessionError(error)) {
        const existing = await this.findByPlanDayAndDate(input);
        if (existing) return existing;
      }

      throw error;
    }
  }

  async complete(
    id: string,
    completedAt: Date,
  ): Promise<WorkoutSession | null> {
    const document = await this.workoutSessionModel
      .findByIdAndUpdate(
        id,
        { $set: { status: 'completed', completedAt } },
        { new: true },
      )
      .exec();

    return document ? this.toEntity(document as WorkoutSessionDocument) : null;
  }

  private toEntity(document: WorkoutSessionDocument): WorkoutSession {
    return new WorkoutSession({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      trainingPlanId: document.trainingPlanId,
      workoutDayIndex: document.workoutDayIndex,
      date: document.date,
      status: document.status,
      startedAt: document.createdAt,
      updatedAt: document.updatedAt,
      completedAt: document.completedAt,
    });
  }

  private isDuplicateSessionError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }
}
