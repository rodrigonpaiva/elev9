import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  GoalForecast as GoalForecastEntity,
} from '../../domain/entities/goal-forecast.entity';
import {
  GoalForecastRepository,
  UpsertGoalForecastRepositoryInput,
} from '../../domain/repositories/goal-forecast.repository';
import { GoalForecastConfidenceValueObject } from '../../domain/value-objects/goal-forecast-confidence.value-object';
import {
  GOAL_FORECAST_MODEL_NAME,
  GoalForecastDocument,
  GoalForecastSchemaClass,
} from './goal-forecast.schema';
import { IdempotentUpsertHelper } from '../../../../shared/concurrency';

@Injectable()
export class MongooseGoalForecastRepository implements GoalForecastRepository {
  constructor(
    @InjectModel(GOAL_FORECAST_MODEL_NAME)
    private readonly goalForecastModel: Model<GoalForecastSchemaClass>,
  ) {}

  async findByGoalId(goalId: string): Promise<GoalForecastEntity | null> {
    const document = await this.goalForecastModel.findOne({ goalId }).exec();
    return document ? this.toEntity(document as GoalForecastDocument) : null;
  }

  async upsertForecast(
    input: UpsertGoalForecastRepositoryInput,
  ): Promise<GoalForecastEntity> {
    const now = new Date();

    try {
      const document = await this.goalForecastModel
        .findOneAndUpdate(
          { goalId: input.goalId },
          {
            $set: {
              userProfileId: input.userProfileId,
              predictedCompletionDate: input.predictedCompletionDate,
              confidence: input.confidence,
              estimatedDaysRemaining: input.estimatedDaysRemaining,
              generatedAt: input.generatedAt,
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
        throw new Error('Failed to upsert goal forecast.');
      }

      return this.toEntity(document as GoalForecastDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.goalForecastModel
            .findOne({ goalId: input.goalId })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as GoalForecastDocument)
            : null;
        },
      });
    }
  }

  private toEntity(document: GoalForecastDocument): GoalForecastEntity {
    return new GoalForecastEntity({
      goalId: document.goalId,
      userProfileId: document.userProfileId,
      predictedCompletionDate: document.predictedCompletionDate
        ? new Date(document.predictedCompletionDate)
        : undefined,
      confidence: new GoalForecastConfidenceValueObject(document.confidence),
      estimatedDaysRemaining: document.estimatedDaysRemaining,
      generatedAt: new Date(document.generatedAt),
      formulaVersion: document.formulaVersion,
    });
  }
}
