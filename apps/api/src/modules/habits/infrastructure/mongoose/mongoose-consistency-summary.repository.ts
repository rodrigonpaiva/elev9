import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { ConsistencySummary as ConsistencySummaryEntity } from '../../domain/entities/consistency-summary.entity';
import {
  ConsistencySummaryRepository,
  UpsertConsistencySummaryRepositoryInput,
} from '../../domain/repositories/consistency-summary.repository';
import { ConsistencyTrendValueObject } from '../../domain/value-objects/consistency-trend.value-object';
import { HabitRiskLevelValueObject } from '../../domain/value-objects/habit-risk-level.value-object';
import {
  CONSISTENCY_SUMMARY_MODEL_NAME,
  ConsistencySummaryDocument,
  ConsistencySummarySchemaClass,
} from './consistency-summary.schema';
import { IdempotentUpsertHelper } from '../../../../shared/concurrency';

@Injectable()
export class MongooseConsistencySummaryRepository
  implements ConsistencySummaryRepository
{
  constructor(
    @InjectModel(CONSISTENCY_SUMMARY_MODEL_NAME)
    private readonly consistencySummaryModel: Model<ConsistencySummarySchemaClass>,
  ) {}

  async findByUserProfileId(
    userProfileId: string,
  ): Promise<ConsistencySummaryEntity | null> {
    const document = await this.consistencySummaryModel
      .findOne({ userProfileId })
      .exec();

    return document ? this.toEntity(document as ConsistencySummaryDocument) : null;
  }

  async upsertSummary(
    input: UpsertConsistencySummaryRepositoryInput,
  ): Promise<ConsistencySummaryEntity> {
    const now = new Date();

    try {
      const document = await this.consistencySummaryModel
        .findOneAndUpdate(
          { userProfileId: input.userProfileId },
          {
            $set: {
              score: input.score,
              trend: input.trend,
              currentStreak: input.currentStreak,
              longestStreak: input.longestStreak,
              adherenceRate: input.adherenceRate,
              riskLevel: input.riskLevel,
              formulaVersion: input.formulaVersion,
              updatedAt: now,
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
        throw new Error('Failed to upsert consistency summary.');
      }

      return this.toEntity(document as ConsistencySummaryDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.consistencySummaryModel
            .findOne({ userProfileId: input.userProfileId })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as ConsistencySummaryDocument)
            : null;
        },
      });
    }
  }

  private toEntity(
    document: ConsistencySummaryDocument,
  ): ConsistencySummaryEntity {
    return new ConsistencySummaryEntity({
      userProfileId: document.userProfileId,
      score: document.score,
      trend: new ConsistencyTrendValueObject(document.trend),
      currentStreak: document.currentStreak,
      longestStreak: document.longestStreak,
      adherenceRate: document.adherenceRate,
      riskLevel: new HabitRiskLevelValueObject(document.riskLevel),
      updatedAt: document.updatedAt,
      formulaVersion: document.formulaVersion,
    });
  }
}
