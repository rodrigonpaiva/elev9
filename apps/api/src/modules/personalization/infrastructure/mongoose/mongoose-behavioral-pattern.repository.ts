import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { BehavioralPattern } from '../../domain/entities/behavioral-pattern.entity';
import {
  BehavioralPatternRepository,
  BehavioralPatternQueryOptions,
  UpsertBehavioralPatternRepositoryInput,
} from '../../domain/repositories/behavioral-pattern.repository';
import { BehavioralPatternTypeValueObject } from '../../domain/value-objects/behavioral-pattern-type.value-object';
import { ResponsivenessLevelValueObject } from '../../domain/value-objects/responsiveness-level.value-object';
import type { BehavioralPatternType } from '../../domain/personalization.types';
import {
  BEHAVIORAL_PATTERN_MODEL_NAME,
  type BehavioralPatternDocument,
  type BehavioralPatternSchemaClass,
} from './behavioral-pattern.schema';
import { IdempotentUpsertHelper } from '../../../../shared/concurrency';

@Injectable()
export class MongooseBehavioralPatternRepository
  implements BehavioralPatternRepository
{
  constructor(
    @InjectModel(BEHAVIORAL_PATTERN_MODEL_NAME)
    private readonly behavioralPatternModel: Model<BehavioralPatternSchemaClass>,
  ) {}

  async findManyByUserProfileId(
    userProfileId: string,
    options?: BehavioralPatternQueryOptions,
  ): Promise<BehavioralPattern[]> {
    const query = this.behavioralPatternModel
      .find({ userProfileId })
      .sort({ lastObservedAt: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();

    return documents.map((document) =>
      this.toEntity(document as BehavioralPatternDocument),
    );
  }

  async findByUserProfileIdAndType(
    userProfileId: string,
    type: BehavioralPatternType,
  ): Promise<BehavioralPattern | null> {
    const document = await this.behavioralPatternModel
      .findOne({ userProfileId, type })
      .exec();

    return document ? this.toEntity(document as BehavioralPatternDocument) : null;
  }

  async upsertPattern(
    input: UpsertBehavioralPatternRepositoryInput,
  ): Promise<BehavioralPattern> {
    const now = new Date();

    try {
      const document = await this.behavioralPatternModel
        .findOneAndUpdate(
          { userProfileId: input.userProfileId, type: input.type },
          {
            $set: {
              confidence: input.confidence,
              evidenceCount: input.evidenceCount,
              lastObservedAt: input.lastObservedAt,
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
        throw new Error('Failed to upsert behavioral pattern.');
      }

      return this.toEntity(document as BehavioralPatternDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.behavioralPatternModel
            .findOne({ userProfileId: input.userProfileId, type: input.type })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as BehavioralPatternDocument)
            : null;
        },
      });
    }
  }

  async replaceManyByUserProfileId(
    userProfileId: string,
    patterns: UpsertBehavioralPatternRepositoryInput[],
  ): Promise<BehavioralPattern[]> {
    await this.behavioralPatternModel.deleteMany({ userProfileId }).exec();

    if (patterns.length === 0) {
      return [];
    }

    const now = new Date();
    const documents = await this.behavioralPatternModel.insertMany(
      patterns.map((pattern) => ({
        userProfileId,
        type: pattern.type,
        confidence: pattern.confidence,
        evidenceCount: pattern.evidenceCount,
        lastObservedAt: pattern.lastObservedAt,
        formulaVersion: pattern.formulaVersion,
        createdAt: now,
        updatedAt: now,
      })),
      { ordered: true },
    );

    return documents.map((document) =>
      this.toEntity(document as BehavioralPatternDocument),
    );
  }

  private toEntity(document: BehavioralPatternDocument): BehavioralPattern {
    return new BehavioralPattern({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      type: new BehavioralPatternTypeValueObject(document.type),
      confidence: new ResponsivenessLevelValueObject(document.confidence),
      evidenceCount: document.evidenceCount,
      lastObservedAt: document.lastObservedAt,
      formulaVersion: document.formulaVersion,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
