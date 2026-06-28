import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Goal as GoalEntity } from '../../domain/entities/goal.entity';
import {
  CreateGoalRepositoryInput,
  GoalRepository,
  GoalQueryOptions,
  ReplaceActiveGoalRepositoryInput,
} from '../../domain/repositories/goal.repository';
import { GoalStatusValueObject } from '../../domain/value-objects/goal-status.value-object';
import { GOAL_MODEL_NAME, GoalDocument, GoalSchemaClass } from './goal.schema';

@Injectable()
export class MongooseGoalRepository implements GoalRepository {
  constructor(
    @InjectModel(GOAL_MODEL_NAME)
    private readonly goalModel: Model<GoalSchemaClass>,
  ) {}

  async findActiveByUserProfileId(
    userProfileId: string,
  ): Promise<GoalEntity | null> {
    const document = await this.goalModel
      .findOne({
        userProfileId,
        status: 'active',
      })
      .exec();

    return document ? this.toEntity(document as GoalDocument) : null;
  }

  async findById(id: string): Promise<GoalEntity | null> {
    const document = await this.goalModel.findById(id).exec();
    return document ? this.toEntity(document as GoalDocument) : null;
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: GoalQueryOptions,
  ): Promise<GoalEntity[]> {
    const query = this.goalModel
      .find({ userProfileId })
      .sort({ createdAt: -1, _id: -1 });

    if (
      options?.limit !== undefined &&
      typeof (query as { limit?: (value: number) => unknown }).limit ===
        'function'
    ) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) => this.toEntity(document as GoalDocument));
  }

  async create(input: CreateGoalRepositoryInput): Promise<GoalEntity> {
    const document = await this.goalModel.create(input);
    return this.toEntity(document as GoalDocument);
  }

  async replaceActiveGoal(
    userProfileId: string,
    input: ReplaceActiveGoalRepositoryInput,
  ): Promise<GoalEntity> {
    await this.goalModel
      .updateMany(
        {
          userProfileId,
          status: 'active',
        },
        {
          $set: {
            status: 'abandoned',
            updatedAt: new Date(),
          },
        },
      )
      .exec();

    return this.create({
      userProfileId,
      type: input.type,
      status: 'active',
      startDate: input.startDate,
      targetDate: input.targetDate,
      targetValue: input.targetValue,
    });
  }

  async markAchieved(
    goalId: string,
    achievedAt: string,
  ): Promise<GoalEntity | null> {
    const document = await this.goalModel
      .findByIdAndUpdate(
        goalId,
        {
          $set: {
            status: 'achieved',
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

    return document ? this.toEntity(document as GoalDocument) : null;
  }

  async markAbandoned(goalId: string): Promise<GoalEntity | null> {
    const document = await this.goalModel
      .findByIdAndUpdate(
        goalId,
        {
          $set: {
            status: 'abandoned',
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    return document ? this.toEntity(document as GoalDocument) : null;
  }

  private toEntity(document: GoalDocument): GoalEntity {
    return new GoalEntity({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      type: document.type,
      status: new GoalStatusValueObject(document.status),
      startDate: new Date(document.startDate),
      targetDate: document.targetDate
        ? new Date(document.targetDate)
        : undefined,
      achievedAt: document.achievedAt
        ? new Date(document.achievedAt)
        : undefined,
      targetValue: document.targetValue,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
