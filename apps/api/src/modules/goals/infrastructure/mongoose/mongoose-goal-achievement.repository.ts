import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  GoalAchievement as GoalAchievementEntity,
} from '../../domain/entities/goal-achievement.entity';
import {
  CreateGoalAchievementRepositoryInput,
  GoalAchievementRepository,
} from '../../domain/repositories/goal-achievement.repository';
import {
  GOAL_ACHIEVEMENT_MODEL_NAME,
  GoalAchievementDocument,
  GoalAchievementSchemaClass,
} from './goal-achievement.schema';

@Injectable()
export class MongooseGoalAchievementRepository
  implements GoalAchievementRepository
{
  constructor(
    @InjectModel(GOAL_ACHIEVEMENT_MODEL_NAME)
    private readonly goalAchievementModel: Model<GoalAchievementSchemaClass>,
  ) {}

  async findManyByUserProfileId(
    userProfileId: string,
  ): Promise<GoalAchievementEntity[]> {
    const documents = await this.goalAchievementModel
      .find({ userProfileId })
      .sort({ achievedAt: -1, createdAt: -1, _id: -1 })
      .exec();

    return documents.map((document) =>
      this.toEntity(document as GoalAchievementDocument),
    );
  }

  async create(
    input: CreateGoalAchievementRepositoryInput,
  ): Promise<GoalAchievementEntity> {
    const document = await this.goalAchievementModel.create({
      goalId: input.goalId,
      userProfileId: input.userProfileId,
      achievedAt: input.achievedAt,
      completionPercentage: input.completionPercentage,
      notes: input.notes,
    });

    return this.toEntity(document as GoalAchievementDocument);
  }

  private toEntity(
    document: GoalAchievementDocument,
  ): GoalAchievementEntity {
    return new GoalAchievementEntity({
      goalId: document.goalId,
      achievedAt: new Date(document.achievedAt),
      completionPercentage: document.completionPercentage,
      notes: document.notes,
    });
  }
}
