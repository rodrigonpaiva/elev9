import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CoachDecision } from '../../domain/entities/coach-decision.entity';
import {
  CoachDecisionRepository,
  CoachDecisionQueryOptions,
  UpsertCoachDecisionRepositoryInput,
} from '../../domain/repositories/coach-decision.repository';
import {
  CoachDecisionInfluence as CoachDecisionInfluenceValueObject,
} from '../../domain/value-objects/coach-decision-influence.value-object';
import {
  COACH_DECISION_MODEL_NAME,
  CoachDecisionDocument,
  CoachDecisionSchemaClass,
} from './coach-decision.schema';

@Injectable()
export class MongooseCoachDecisionRepository
  implements CoachDecisionRepository
{
  constructor(
    @InjectModel(COACH_DECISION_MODEL_NAME)
    private readonly coachDecisionModel: Model<CoachDecisionSchemaClass>,
  ) {}

  async findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<CoachDecision | null> {
    const document = await this.coachDecisionModel
      .findOne({
        userProfileId,
        date,
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as CoachDecisionDocument);
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<CoachDecision | null> {
    const document = await this.coachDecisionModel
      .findOne({
        userProfileId,
      })
      .sort({ createdAt: -1, _id: -1 })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as CoachDecisionDocument);
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: CoachDecisionQueryOptions,
  ): Promise<CoachDecision[]> {
    const query = this.coachDecisionModel
      .find({
        userProfileId,
      })
      .sort({ date: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();

    return documents.map((document) =>
      this.toEntity(document as CoachDecisionDocument),
    );
  }

  async findRecentByUserProfileId(
    userProfileId: string,
    options?: CoachDecisionQueryOptions,
  ): Promise<CoachDecision[]> {
    return this.findManyByUserProfileId(userProfileId, options);
  }

  async findById(id: string): Promise<CoachDecision | null> {
    const document = await this.coachDecisionModel.findById(id).exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as CoachDecisionDocument);
  }

  async upsertDailyDecision(
    input: UpsertCoachDecisionRepositoryInput,
  ): Promise<CoachDecision> {
    const now = new Date();

    try {
      const document = await this.coachDecisionModel
        .findOneAndUpdate(
          {
            userProfileId: input.userProfileId,
            date: input.date,
          },
          {
            $set: {
              recoverySnapshotId: input.recoverySnapshotId,
              nutritionRecommendationId: input.nutritionRecommendationId,
              adaptiveTrainingRecommendationId:
                input.adaptiveTrainingRecommendationId,
              priority: input.priority,
              headline: input.headline,
              summary: input.summary,
              actionItems: input.actionItems,
              influences: input.influences,
              sourceContext: input.sourceContext,
              formulaVersion: input.formulaVersion,
              generatedBy: input.generatedBy,
              llmMetadata: input.llmMetadata,
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
        throw new Error('Failed to upsert coach decision.');
      }

      return this.toEntity(document as CoachDecisionDocument);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existingDocument = await this.coachDecisionModel
          .findOne({
            userProfileId: input.userProfileId,
            date: input.date,
          })
          .exec();

        if (existingDocument) {
          return this.toEntity(existingDocument as CoachDecisionDocument);
        }
      }

      throw error;
    }
  }

  private toEntity(document: CoachDecisionDocument): CoachDecision {
    return new CoachDecision({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      date: document.date,
      recoverySnapshotId: document.recoverySnapshotId,
      nutritionRecommendationId: document.nutritionRecommendationId,
      adaptiveTrainingRecommendationId:
        document.adaptiveTrainingRecommendationId,
      priority: document.priority,
      headline: document.headline,
      summary: document.summary,
      actionItems: [...document.actionItems],
      influences: document.influences.map(
        (influence) =>
          new CoachDecisionInfluenceValueObject({
            code: influence.code,
            label: influence.label,
            impact: influence.impact,
            source: influence.source,
            weight: influence.weight,
            value: influence.value,
          }),
      ),
      sourceContext: (document.sourceContext ?? {}) as Record<string, unknown>,
      formulaVersion: document.formulaVersion,
      generatedBy: document.generatedBy,
      llmMetadata: document.llmMetadata
        ? {
            provider: document.llmMetadata.provider,
            model: document.llmMetadata.model,
            used: document.llmMetadata.used,
            failed: document.llmMetadata.failed,
          }
        : undefined,
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
