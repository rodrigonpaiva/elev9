import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NotificationDecision } from '../../domain/entities/notification-decision.entity';
import {
  NotificationDecisionRepository,
  NotificationDecisionQueryOptions,
  UpsertNotificationDecisionRepositoryInput,
} from '../../domain/repositories/notification-decision.repository';
import { NotificationInfluence } from '../../domain/value-objects/notification-influence.value-object';
import type {
  NotificationSourceContext,
  NotificationStatus,
} from '../../domain/notifications.types';
import {
  NOTIFICATION_DECISION_MODEL_NAME,
  NotificationDecisionDocument,
  NotificationDecisionSchemaClass,
} from './notification-decision.schema';
import { IdempotentUpsertHelper } from '../../../../shared/concurrency';

@Injectable()
export class MongooseNotificationDecisionRepository implements NotificationDecisionRepository {
  constructor(
    @InjectModel(NOTIFICATION_DECISION_MODEL_NAME)
    private readonly notificationDecisionModel: Model<NotificationDecisionSchemaClass>,
  ) {}

  async findByUserProfileIdAndDate(
    userProfileId: string,
    date: string,
  ): Promise<NotificationDecision | null> {
    const document = await this.notificationDecisionModel
      .findOne({ userProfileId, date })
      .exec();

    return document
      ? this.toEntity(document as NotificationDecisionDocument)
      : null;
  }

  async findLatestByUserProfileId(
    userProfileId: string,
  ): Promise<NotificationDecision | null> {
    const document = await this.notificationDecisionModel
      .findOne({ userProfileId })
      .sort({ date: -1, createdAt: -1, _id: -1 })
      .exec();

    return document
      ? this.toEntity(document as NotificationDecisionDocument)
      : null;
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: NotificationDecisionQueryOptions,
  ): Promise<NotificationDecision[]> {
    const query = this.notificationDecisionModel
      .find({ userProfileId })
      .sort({ date: -1, createdAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toEntity(document as NotificationDecisionDocument),
    );
  }

  async findById(id: string): Promise<NotificationDecision | null> {
    const document = await this.notificationDecisionModel.findById(id).exec();

    return document
      ? this.toEntity(document as NotificationDecisionDocument)
      : null;
  }

  async updateStatus(
    notificationDecisionId: string,
    status: NotificationStatus,
  ): Promise<NotificationDecision | null> {
    const document = await this.notificationDecisionModel
      .findByIdAndUpdate(
        notificationDecisionId,
        {
          $set: {
            status,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    return document
      ? this.toEntity(document as NotificationDecisionDocument)
      : null;
  }

  async upsertDailyDecision(
    input: UpsertNotificationDecisionRepositoryInput,
  ): Promise<NotificationDecision> {
    const now = new Date();

    try {
      const document = await this.notificationDecisionModel
        .findOneAndUpdate(
          { userProfileId: input.userProfileId, date: input.date },
          {
            $set: {
              type: input.type,
              priority: input.priority,
              channel: input.channel,
              status: input.status,
              title: input.title,
              message: input.message,
              actionLabel: input.actionLabel,
              actionTarget: input.actionTarget,
              influences: input.influences,
              sourceContext: input.sourceContext,
              suppressed: input.suppressed ?? false,
              suppressionReasons: input.suppressionReasons ?? [],
              fatigueLevel: input.fatigueLevel ?? 'low',
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
        throw new Error('Failed to upsert notification decision.');
      }

      return this.toEntity(document as NotificationDecisionDocument);
    } catch (error) {
      return IdempotentUpsertHelper.handleDuplicateKeyFallback({
        error,
        reload: async () => {
          const existingDocument = await this.notificationDecisionModel
            .findOne({ userProfileId: input.userProfileId, date: input.date })
            .exec();

          return existingDocument
            ? this.toEntity(existingDocument as NotificationDecisionDocument)
            : null;
        },
      });
    }
  }

  private toEntity(
    document: NotificationDecisionDocument,
  ): NotificationDecision {
    return new NotificationDecision({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      date: document.date,
      type: document.type,
      priority: document.priority,
      channel: document.channel,
      status: document.status,
      title: document.title,
      message: document.message,
      actionLabel: document.actionLabel,
      actionTarget: document.actionTarget,
      influences: document.influences.map(
        (influence) =>
          new NotificationInfluence({
            code: influence.code,
            label: influence.label,
            impact: influence.impact,
            source: influence.source,
            weight: influence.weight,
            value: influence.value,
          }),
      ),
      sourceContext: (document.sourceContext ??
        {}) as NotificationSourceContext,
      suppressed: document.suppressed ?? false,
      suppressionReasons: document.suppressionReasons ?? [],
      fatigueLevel: document.fatigueLevel ?? 'low',
      formulaVersion: document.formulaVersion,
      generatedBy: document.generatedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }
}
