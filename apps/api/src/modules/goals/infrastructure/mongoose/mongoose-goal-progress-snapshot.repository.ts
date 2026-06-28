import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { GoalProgressSnapshot as GoalProgressSnapshotEntity } from '../../domain/entities/goal-progress-snapshot.entity';
import {
  GoalProgressSnapshotQueryOptions,
  GoalProgressSnapshotRepository,
  UpsertGoalProgressSnapshotRepositoryInput,
} from '../../domain/repositories/goal-progress-snapshot.repository';
import { GoalTrendValueObject } from '../../domain/value-objects/goal-trend.value-object';
import {
  GOAL_PROGRESS_SNAPSHOT_MODEL_NAME,
  GoalProgressSnapshotDocument,
  GoalProgressSnapshotSchemaClass,
} from './goal-progress-snapshot.schema';
import { IdempotentUpsertHelper } from '../../../../shared/concurrency';
import type { GoalSourceContext } from '../../../../shared/source-context';

@Injectable()
export class MongooseGoalProgressSnapshotRepository implements GoalProgressSnapshotRepository {
  constructor(
    @InjectModel(GOAL_PROGRESS_SNAPSHOT_MODEL_NAME)
    private readonly goalProgressSnapshotModel: Model<GoalProgressSnapshotSchemaClass>,
  ) {}

  async findByGoalIdAndDate(
    goalId: string,
    date: string,
  ): Promise<GoalProgressSnapshotEntity | null> {
    const document = await this.goalProgressSnapshotModel
      .findOne({ goalId, date })
      .exec();
    return document
      ? this.toEntity(document as GoalProgressSnapshotDocument)
      : null;
  }

  async findLatestByGoalId(
    goalId: string,
  ): Promise<GoalProgressSnapshotEntity | null> {
    const document = await this.goalProgressSnapshotModel
      .findOne({ goalId })
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .exec();
    return document
      ? this.toEntity(document as GoalProgressSnapshotDocument)
      : null;
  }

  async findManyByGoalId(
    goalId: string,
    options?: GoalProgressSnapshotQueryOptions,
  ): Promise<GoalProgressSnapshotEntity[]> {
    const query = this.goalProgressSnapshotModel
      .find({ goalId })
      .sort({ date: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toEntity(document as GoalProgressSnapshotDocument),
    );
  }

  async upsertDailySnapshot(
    input: UpsertGoalProgressSnapshotRepositoryInput,
  ): Promise<GoalProgressSnapshotEntity> {
    const now = new Date();

    try {
      const document = await this.goalProgressSnapshotModel
        .findOneAndUpdate(
          { goalId: input.goalId, date: input.date },
          {
            $set: {
              userProfileId: input.userProfileId,
              progressPercentage: input.progressPercentage,
              currentValue: input.currentValue,
              targetValue: input.targetValue,
              trend: input.trend,
              sourceContext: input.sourceContext,
              formulaVersion: input.formulaVersion,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();

      if (!document) {
        throw new Error('Failed to upsert goal progress snapshot.');
      }

      return this.toEntity(document as GoalProgressSnapshotDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.goalProgressSnapshotModel
            .findOne({ goalId: input.goalId, date: input.date })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as GoalProgressSnapshotDocument)
            : null;
        },
      });
    }
  }

  private toEntity(
    document: GoalProgressSnapshotDocument,
  ): GoalProgressSnapshotEntity {
    return new GoalProgressSnapshotEntity({
      goalId: document.goalId,
      userProfileId: document.userProfileId,
      date: document.date,
      progressPercentage: document.progressPercentage,
      currentValue: document.currentValue,
      targetValue: document.targetValue,
      trend: new GoalTrendValueObject(document.trend),
      sourceContext: (document.sourceContext ?? {}) as GoalSourceContext,
      formulaVersion: document.formulaVersion,
    });
  }
}
