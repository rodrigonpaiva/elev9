import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { HabitSnapshot as HabitSnapshotEntity } from '../../domain/entities/habit-snapshot.entity';
import {
  HabitSnapshotQueryOptions,
  HabitSnapshotRepository,
  UpsertHabitSnapshotRepositoryInput,
} from '../../domain/repositories/habit-snapshot.repository';
import { ConsistencyTrendValueObject } from '../../domain/value-objects/consistency-trend.value-object';
import {
  HABIT_SNAPSHOT_MODEL_NAME,
  HabitSnapshotDocument,
  HabitSnapshotSchemaClass,
} from './habit-snapshot.schema';
import { IdempotentUpsertHelper } from '../../../../shared/concurrency';
import type { HabitSourceContext } from '../../domain/habits.types';

@Injectable()
export class MongooseHabitSnapshotRepository implements HabitSnapshotRepository {
  constructor(
    @InjectModel(HABIT_SNAPSHOT_MODEL_NAME)
    private readonly habitSnapshotModel: Model<HabitSnapshotSchemaClass>,
  ) {}

  async findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<HabitSnapshotEntity | null> {
    const document = await this.habitSnapshotModel
      .findOne({ userProfileId, date })
      .exec();

    return document ? this.toEntity(document as HabitSnapshotDocument) : null;
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<HabitSnapshotEntity | null> {
    const document = await this.habitSnapshotModel
      .findOne({ userProfileId })
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .exec();

    return document ? this.toEntity(document as HabitSnapshotDocument) : null;
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: HabitSnapshotQueryOptions,
  ): Promise<HabitSnapshotEntity[]> {
    const query = this.habitSnapshotModel
      .find({ userProfileId })
      .sort({ date: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toEntity(document as HabitSnapshotDocument),
    );
  }

  async findById(id: string): Promise<HabitSnapshotEntity | null> {
    const document = await this.habitSnapshotModel.findById(id).exec();

    return document ? this.toEntity(document as HabitSnapshotDocument) : null;
  }

  async upsertDailySnapshot(
    input: UpsertHabitSnapshotRepositoryInput,
  ): Promise<HabitSnapshotEntity> {
    const now = new Date();

    try {
      const document = await this.habitSnapshotModel
        .findOneAndUpdate(
          {
            userProfileId: input.userProfileId,
            date: input.date,
          },
          {
            $set: {
              consistencyScore: input.consistencyScore,
              streakDays: input.streakDays,
              adherenceScore: input.adherenceScore,
              trend: input.trend,
              sourceContext: input.sourceContext,
              formulaVersion: input.formulaVersion,
              generatedAt: input.generatedAt,
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
        throw new Error('Failed to upsert habit snapshot.');
      }

      return this.toEntity(document as HabitSnapshotDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.habitSnapshotModel
            .findOne({ userProfileId: input.userProfileId, date: input.date })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as HabitSnapshotDocument)
            : null;
        },
      });
    }
  }

  private toEntity(document: HabitSnapshotDocument): HabitSnapshotEntity {
    return new HabitSnapshotEntity({
      userProfileId: document.userProfileId,
      date: document.date,
      consistencyScore: document.consistencyScore,
      streakDays: document.streakDays,
      adherenceScore: document.adherenceScore,
      trend: new ConsistencyTrendValueObject(document.trend),
      sourceContext: (document.sourceContext ?? {}) as unknown as HabitSourceContext,
      formulaVersion: document.formulaVersion,
      generatedAt: document.generatedAt,
    });
  }
}
