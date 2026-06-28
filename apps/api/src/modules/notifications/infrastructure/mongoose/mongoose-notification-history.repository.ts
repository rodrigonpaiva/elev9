import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  CreateNotificationHistoryRepositoryInput,
  NotificationHistoryQueryOptions,
  NotificationHistoryRecord,
  NotificationHistoryRepository,
} from '../../domain/repositories/notification-history.repository';
import {
  NOTIFICATION_HISTORY_MODEL_NAME,
  NotificationHistoryDocument,
  NotificationHistorySchemaClass,
} from './notification-history.schema';

@Injectable()
export class MongooseNotificationHistoryRepository implements NotificationHistoryRepository {
  constructor(
    @InjectModel(NOTIFICATION_HISTORY_MODEL_NAME)
    private readonly notificationHistoryModel: Model<NotificationHistorySchemaClass>,
  ) {}

  async create(
    input: CreateNotificationHistoryRepositoryInput,
  ): Promise<NotificationHistoryRecord> {
    const document = await this.notificationHistoryModel.create({
      userProfileId: input.userProfileId,
      notificationDecisionId: input.notificationDecisionId,
      previousStatus: input.previousStatus,
      nextStatus: input.nextStatus,
      reason: input.reason,
      occurredAt: input.occurredAt,
      metadata: input.metadata,
    });

    return this.toRecord(document as NotificationHistoryDocument);
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: NotificationHistoryQueryOptions,
  ): Promise<NotificationHistoryRecord[]> {
    const query = this.notificationHistoryModel
      .find({ userProfileId })
      .sort({ occurredAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toRecord(document as NotificationHistoryDocument),
    );
  }

  async findManyByNotificationDecisionId(
    notificationDecisionId: string,
    options?: NotificationHistoryQueryOptions,
  ): Promise<NotificationHistoryRecord[]> {
    const query = this.notificationHistoryModel
      .find({ notificationDecisionId })
      .sort({ occurredAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toRecord(document as NotificationHistoryDocument),
    );
  }

  private toRecord(
    document: NotificationHistoryDocument,
  ): NotificationHistoryRecord {
    return {
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      notificationDecisionId: document.notificationDecisionId,
      previousStatus: document.previousStatus,
      nextStatus: document.nextStatus,
      reason: document.reason,
      occurredAt: document.occurredAt,
      metadata: document.metadata,
    };
  }
}
