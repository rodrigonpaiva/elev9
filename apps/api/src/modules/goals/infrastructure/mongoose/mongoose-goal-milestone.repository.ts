import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  GoalMilestone as GoalMilestoneEntity,
} from '../../domain/entities/goal-milestone.entity';
import { GoalMilestoneRepository } from '../../domain/repositories/goal-milestone.repository';
import { GoalMilestoneTypeValueObject } from '../../domain/value-objects/goal-milestone-type.value-object';
import {
  GOAL_MILESTONE_MODEL_NAME,
  GoalMilestoneDocument,
  GoalMilestoneSchemaClass,
} from './goal-milestone.schema';

@Injectable()
export class MongooseGoalMilestoneRepository implements GoalMilestoneRepository {
  constructor(
    @InjectModel(GOAL_MILESTONE_MODEL_NAME)
    private readonly goalMilestoneModel: Model<GoalMilestoneSchemaClass>,
  ) {}

  async findManyByGoalId(goalId: string): Promise<GoalMilestoneEntity[]> {
    const documents = await this.goalMilestoneModel
      .find({ goalId })
      .sort({ targetValue: 1, createdAt: 1, _id: 1 })
      .exec();

    return documents.map((document) => this.toEntity(document as GoalMilestoneDocument));
  }

  async createMany(input: GoalMilestoneEntity[]): Promise<GoalMilestoneEntity[]> {
    if (input.length === 0) {
      return [];
    }

    const documents = await this.goalMilestoneModel.insertMany(
      input.map((milestone) => ({
        goalId: milestone.goalId,
        type: milestone.type.value,
        title: milestone.title,
        targetValue: milestone.targetValue,
        achieved: milestone.achieved,
        achievedAt: milestone.achievedAt?.toISOString(),
      })),
      { ordered: true },
    );

    return documents.map((document) => this.toEntity(document as GoalMilestoneDocument));
  }

  async markAchieved(
    goalId: string,
    type: GoalMilestoneEntity['type']['value'],
    achievedAt: string,
  ): Promise<GoalMilestoneEntity | null> {
    const document = await this.goalMilestoneModel
      .findOneAndUpdate(
        { goalId, type },
        {
          $set: {
            achieved: true,
            achievedAt,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    return document ? this.toEntity(document as GoalMilestoneDocument) : null;
  }

  private toEntity(document: GoalMilestoneDocument): GoalMilestoneEntity {
    return new GoalMilestoneEntity({
      goalId: document.goalId,
      type: new GoalMilestoneTypeValueObject(document.type),
      title: document.title,
      targetValue: document.targetValue,
      achieved: document.achieved,
      achievedAt: document.achievedAt ? new Date(document.achievedAt) : undefined,
    });
  }
}
