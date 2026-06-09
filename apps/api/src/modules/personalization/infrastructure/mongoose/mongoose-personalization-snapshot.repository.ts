import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { IdempotentUpsertHelper } from '../../../../shared/concurrency';
import { PersonalizationSnapshot } from '../../domain/entities/personalization-snapshot.entity';
import {
  PersonalizationSnapshotRepository,
  PersonalizationSnapshotQueryOptions,
  UpsertPersonalizationSnapshotRepositoryInput,
} from '../../domain/repositories/personalization-snapshot.repository';
import { CoachingStyleValueObject } from '../../domain/value-objects/coaching-style.value-object';
import { EngagementProfileValueObject } from '../../domain/value-objects/engagement-profile.value-object';
import { PersonalizationTrendValueObject } from '../../domain/value-objects/personalization-trend.value-object';
import { ResponsivenessLevelValueObject } from '../../domain/value-objects/responsiveness-level.value-object';
import type { PersonalizationSourceContext } from '../../../../shared/source-context';
import {
  PERSONALIZATION_SNAPSHOT_MODEL_NAME,
  type PersonalizationSnapshotDocument,
  type PersonalizationSnapshotSchemaClass,
} from './personalization-snapshot.schema';

@Injectable()
export class MongoosePersonalizationSnapshotRepository
  implements PersonalizationSnapshotRepository
{
  constructor(
    @InjectModel(PERSONALIZATION_SNAPSHOT_MODEL_NAME)
    private readonly personalizationSnapshotModel: Model<PersonalizationSnapshotSchemaClass>,
  ) {}

  async findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<PersonalizationSnapshot | null> {
    const document = await this.personalizationSnapshotModel
      .findOne({ userProfileId, date })
      .exec();

    return document ? this.toEntity(document as PersonalizationSnapshotDocument) : null;
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<PersonalizationSnapshot | null> {
    const document = await this.personalizationSnapshotModel
      .findOne({ userProfileId })
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .exec();

    return document ? this.toEntity(document as PersonalizationSnapshotDocument) : null;
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: PersonalizationSnapshotQueryOptions,
  ): Promise<PersonalizationSnapshot[]> {
    const query = this.personalizationSnapshotModel
      .find({ userProfileId })
      .sort({ date: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();

    return documents.map((document) =>
      this.toEntity(document as PersonalizationSnapshotDocument),
    );
  }

  async findById(id: string): Promise<PersonalizationSnapshot | null> {
    const document = await this.personalizationSnapshotModel.findById(id).exec();

    return document ? this.toEntity(document as PersonalizationSnapshotDocument) : null;
  }

  async upsertDailySnapshot(
    input: UpsertPersonalizationSnapshotRepositoryInput,
  ): Promise<PersonalizationSnapshot> {
    const now = new Date();

    try {
      const document = await this.personalizationSnapshotModel
        .findOneAndUpdate(
          { userProfileId: input.userProfileId, date: input.date },
          {
            $set: {
              preferredCoachingStyle: input.preferredCoachingStyle,
              engagementProfile: input.engagementProfile,
              notificationResponsiveness: input.notificationResponsiveness,
              goalResponsiveness: input.goalResponsiveness,
              recoveryResponsiveness: input.recoveryResponsiveness,
              habitResponsiveness: input.habitResponsiveness,
              riskOfDisengagement: input.riskOfDisengagement,
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
        throw new Error('Failed to upsert personalization snapshot.');
      }

      return this.toEntity(document as PersonalizationSnapshotDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.personalizationSnapshotModel
            .findOne({ userProfileId: input.userProfileId, date: input.date })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as PersonalizationSnapshotDocument)
            : null;
        },
      });
    }
  }

  private toEntity(
    document: PersonalizationSnapshotDocument,
  ): PersonalizationSnapshot {
    return new PersonalizationSnapshot({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      date: document.date,
      preferredCoachingStyle: new CoachingStyleValueObject(
        document.preferredCoachingStyle,
      ),
      engagementProfile: new EngagementProfileValueObject(
        document.engagementProfile,
      ),
      notificationResponsiveness: new ResponsivenessLevelValueObject(
        document.notificationResponsiveness,
      ),
      goalResponsiveness: new ResponsivenessLevelValueObject(
        document.goalResponsiveness,
      ),
      recoveryResponsiveness: new ResponsivenessLevelValueObject(
        document.recoveryResponsiveness,
      ),
      habitResponsiveness: new ResponsivenessLevelValueObject(
        document.habitResponsiveness,
      ),
      riskOfDisengagement: new ResponsivenessLevelValueObject(
        document.riskOfDisengagement,
      ),
      trend: new PersonalizationTrendValueObject(document.trend),
      sourceContext: (document.sourceContext ?? {}) as PersonalizationSourceContext,
      formulaVersion: document.formulaVersion,
      generatedAt: document.generatedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
