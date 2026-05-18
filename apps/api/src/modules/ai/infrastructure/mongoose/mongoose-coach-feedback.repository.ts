import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoachFeedback } from "../../domain/entities/coach-feedback.entity";
import {
  CoachFeedbackRepository,
  CreateCoachFeedbackRepositoryInput,
} from "../../domain/repositories/coach-feedback.repository";
import {
  COACH_FEEDBACK_MODEL_NAME,
  CoachFeedbackDocument,
  CoachFeedbackSchemaClass,
} from "./coach-feedback.schema";

@Injectable()
export class MongooseCoachFeedbackRepository implements CoachFeedbackRepository {
  constructor(
    @InjectModel(COACH_FEEDBACK_MODEL_NAME)
    private readonly coachFeedbackModel: Model<CoachFeedbackSchemaClass>,
  ) {}

  async create(
    input: CreateCoachFeedbackRepositoryInput,
  ): Promise<CoachFeedback> {
    const document = await this.coachFeedbackModel.create(input);

    return this.toEntity(document as CoachFeedbackDocument);
  }

  async findByUserProfileId(input: {
    userProfileId: string;
    limit: number;
  }): Promise<CoachFeedback[]> {
    const documents = await this.coachFeedbackModel
      .find({
        userProfileId: input.userProfileId,
      })
      .sort({
        createdAt: -1,
        _id: -1,
      })
      .limit(input.limit)
      .exec();

    return documents.map((document) =>
      this.toEntity(document as CoachFeedbackDocument),
    );
  }

  private toEntity(document: CoachFeedbackDocument): CoachFeedback {
    return new CoachFeedback({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      message: document.message,
      insights: [...document.insights],
      recommendations: [...document.recommendations],
      influences: document.influences ? [...document.influences] : [],
      generatorVersion: document.generatorVersion,
      contextSnapshot: document.contextSnapshot
        ? {
            fatigueLevel: document.contextSnapshot.fatigueLevel,
            recoveryTrend: document.contextSnapshot.recoveryTrend,
            weeklyFrequency: document.contextSnapshot.weeklyFrequency,
            currentStreak: document.contextSnapshot.currentStreak,
            averageWorkoutDuration: document.contextSnapshot.averageWorkoutDuration,
            latestCheckIn: document.contextSnapshot.latestCheckIn
              ? {
                  energyLevel: document.contextSnapshot.latestCheckIn.energyLevel,
                  sleepQuality: document.contextSnapshot.latestCheckIn.sleepQuality,
                  muscleSoreness: document.contextSnapshot.latestCheckIn.muscleSoreness,
                  motivationLevel: document.contextSnapshot.latestCheckIn.motivationLevel,
                }
              : undefined,
            nutritionProfile: document.contextSnapshot.nutritionProfile
              ? {
                  goal: document.contextSnapshot.nutritionProfile.goal,
                  mealsPerDay: document.contextSnapshot.nutritionProfile.mealsPerDay,
                }
              : undefined,
          }
        : undefined,
      createdAt: document.createdAt,
    });
  }
}
