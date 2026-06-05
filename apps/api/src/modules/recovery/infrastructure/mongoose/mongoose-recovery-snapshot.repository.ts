import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  RecoveryInfluence as RecoveryInfluenceValueObject,
  RecoverySnapshot as RecoverySnapshotEntity,
} from '../../domain/entities/recovery-snapshot.entity';
import {
  RecoverySnapshotRepository,
  RecoverySnapshotQueryOptions,
  UpsertRecoverySnapshotRepositoryInput,
} from '../../domain/repositories/recovery-snapshot.repository';
import {
  RECOVERY_SNAPSHOT_MODEL_NAME,
  RecoverySnapshotDocument,
  RecoverySnapshotSchemaClass,
} from './recovery-snapshot.schema';
import { IdempotentUpsertHelper } from '../../../../shared/concurrency';
import type { RecoverySourceContext } from '../../../../shared/source-context';

@Injectable()
export class MongooseRecoverySnapshotRepository
  implements RecoverySnapshotRepository
{
  constructor(
    @InjectModel(RECOVERY_SNAPSHOT_MODEL_NAME)
    private readonly recoverySnapshotModel: Model<RecoverySnapshotSchemaClass>,
  ) {}

  async findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<RecoverySnapshotEntity | null> {
    const document = await this.recoverySnapshotModel
      .findOne({
        userProfileId,
        date,
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as RecoverySnapshotDocument);
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<RecoverySnapshotEntity | null> {
    const document = await this.recoverySnapshotModel
      .findOne({
        userProfileId,
      })
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as RecoverySnapshotDocument);
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: RecoverySnapshotQueryOptions,
  ): Promise<RecoverySnapshotEntity[]> {
    const query = this.recoverySnapshotModel
      .find({
        userProfileId,
      })
      .sort({ date: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();

    return documents.map((document) =>
      this.toEntity(document as RecoverySnapshotDocument),
    );
  }

  async findRecentByUserProfileId(
    userProfileId: string,
    options?: RecoverySnapshotQueryOptions,
  ): Promise<RecoverySnapshotEntity[]> {
    return this.findManyByUserProfileId(userProfileId, options);
  }

  async upsertDailySnapshot(
    input: UpsertRecoverySnapshotRepositoryInput,
  ): Promise<RecoverySnapshotEntity> {
    const now = new Date();

    try {
      const document = await this.recoverySnapshotModel
        .findOneAndUpdate(
          {
            userProfileId: input.userProfileId,
            date: input.date,
          },
          {
            $set: {
              readinessScore: input.readinessScore,
              fatigueScore: input.fatigueScore,
              recoveryTrend: input.recoveryTrend,
              recommendedIntensity: input.recommendedIntensity,
              influences: input.influences,
              formulaVersion: input.formulaVersion,
              sourceContext: input.sourceContext,
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
        throw new Error('Failed to upsert recovery snapshot.');
      }

      return this.toEntity(document as RecoverySnapshotDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.recoverySnapshotModel
            .findOne({
              userProfileId: input.userProfileId,
              date: input.date,
            })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as RecoverySnapshotDocument)
            : null;
        },
      });
    }
  }

  private toEntity(
    document: RecoverySnapshotDocument,
  ): RecoverySnapshotEntity {
    return new RecoverySnapshotEntity({
      userProfileId: document.userProfileId,
      date: document.date,
      readinessScore: document.readinessScore,
      fatigueScore: document.fatigueScore,
      recoveryTrend: document.recoveryTrend,
      recommendedIntensity: document.recommendedIntensity,
      influences: document.influences.map(
        (influence) =>
          new RecoveryInfluenceValueObject({
            code: influence.code,
            label: influence.label,
            impact: influence.impact,
            weight: influence.weight,
            value: influence.value,
          }),
      ),
      formulaVersion: document.formulaVersion,
      sourceContext: (document.sourceContext ?? {}) as RecoverySourceContext,
      createdAt: document.createdAt,
    });
  }
}
