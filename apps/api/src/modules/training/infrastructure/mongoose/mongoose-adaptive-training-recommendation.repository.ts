import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  AdaptiveTrainingRecommendation as AdaptiveTrainingRecommendationEntity,
} from '../../domain/entities/adaptive-training-recommendation.entity';
import {
  AdaptiveTrainingInfluence as AdaptiveTrainingInfluenceValueObject,
} from '../../domain/value-objects/adaptive-training-influence.value-object';
import {
  AdaptiveTrainingRecommendationRepository,
  AdaptiveTrainingRecommendationQueryOptions,
  UpsertAdaptiveTrainingRecommendationRepositoryInput,
} from '../../domain/repositories/adaptive-training-recommendation.repository';
import {
  ADAPTIVE_TRAINING_RECOMMENDATION_MODEL_NAME,
  AdaptiveTrainingRecommendationDocument,
  AdaptiveTrainingRecommendationSchemaClass,
} from './adaptive-training-recommendation.schema';

@Injectable()
export class MongooseAdaptiveTrainingRecommendationRepository
  implements AdaptiveTrainingRecommendationRepository
{
  constructor(
    @InjectModel(ADAPTIVE_TRAINING_RECOMMENDATION_MODEL_NAME)
    private readonly adaptiveTrainingRecommendationModel: Model<AdaptiveTrainingRecommendationSchemaClass>,
  ) {}

  async findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<AdaptiveTrainingRecommendationEntity | null> {
    const document = await this.adaptiveTrainingRecommendationModel
      .findOne({
        userProfileId,
        date,
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as AdaptiveTrainingRecommendationDocument);
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<AdaptiveTrainingRecommendationEntity | null> {
    const document = await this.adaptiveTrainingRecommendationModel
      .findOne({
        userProfileId,
      })
      .sort({ createdAt: -1, _id: -1 })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as AdaptiveTrainingRecommendationDocument);
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: AdaptiveTrainingRecommendationQueryOptions,
  ): Promise<AdaptiveTrainingRecommendationEntity[]> {
    const query = this.adaptiveTrainingRecommendationModel
      .find({
        userProfileId,
      })
      .sort({ date: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();

    return documents.map((document) =>
      this.toEntity(document as AdaptiveTrainingRecommendationDocument),
    );
  }

  async findRecentByUserProfileId(
    userProfileId: string,
    options?: AdaptiveTrainingRecommendationQueryOptions,
  ): Promise<AdaptiveTrainingRecommendationEntity[]> {
    return this.findManyByUserProfileId(userProfileId, options);
  }

  async upsertDailyRecommendation(
    input: UpsertAdaptiveTrainingRecommendationRepositoryInput,
  ): Promise<AdaptiveTrainingRecommendationEntity> {
    const now = new Date();

    try {
      const document = await this.adaptiveTrainingRecommendationModel
        .findOneAndUpdate(
          {
            userProfileId: input.userProfileId,
            date: input.date,
          },
          {
            $set: {
              trainingPlanId: input.trainingPlanId,
              recommendationType: input.recommendationType,
              recommendedIntensity: input.recommendedIntensity,
              volumeAction: input.volumeAction,
              reasoning: input.reasoning,
              influences: input.influences,
              sourceContext: input.sourceContext,
              formulaVersion: input.formulaVersion,
              generatedBy: input.generatedBy,
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
        throw new Error('Failed to upsert adaptive training recommendation.');
      }

      return this.toEntity(
        document as AdaptiveTrainingRecommendationDocument,
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existingDocument = await this.adaptiveTrainingRecommendationModel
          .findOne({
            userProfileId: input.userProfileId,
            date: input.date,
          })
          .exec();

        if (existingDocument) {
          return this.toEntity(
            existingDocument as AdaptiveTrainingRecommendationDocument,
          );
        }
      }

      throw error;
    }
  }

  private toEntity(
    document: AdaptiveTrainingRecommendationDocument,
  ): AdaptiveTrainingRecommendationEntity {
    return new AdaptiveTrainingRecommendationEntity({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      trainingPlanId: document.trainingPlanId,
      date: document.date,
      recommendationType: document.recommendationType,
      recommendedIntensity: document.recommendedIntensity,
      volumeAction: document.volumeAction,
      reasoning: document.reasoning,
      influences: document.influences.map(
        (influence) =>
          new AdaptiveTrainingInfluenceValueObject({
            code: influence.code,
            label: influence.label,
            impact: influence.impact,
            weight: influence.weight,
            value: influence.value,
          }),
      ),
      sourceContext: document.sourceContext ?? {},
      formulaVersion: document.formulaVersion,
      generatedBy: document.generatedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}
