import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  CreateEngagementEventRepositoryInput,
  EngagementEventQueryOptions,
  EngagementEventRecord,
  EngagementEventRepository,
} from '../../domain/repositories/engagement-event.repository';
import {
  ENGAGEMENT_EVENT_MODEL_NAME,
  EngagementEventDocument,
  EngagementEventSchemaClass,
} from './engagement-event.schema';

@Injectable()
export class MongooseEngagementEventRepository implements EngagementEventRepository {
  constructor(
    @InjectModel(ENGAGEMENT_EVENT_MODEL_NAME)
    private readonly engagementEventModel: Model<EngagementEventSchemaClass>,
  ) {}

  async create(
    input: CreateEngagementEventRepositoryInput,
  ): Promise<EngagementEventRecord> {
    const document = await this.engagementEventModel.create({
      userProfileId: input.userProfileId,
      notificationDecisionId: input.notificationDecisionId,
      type: input.type,
      occurredAt: input.occurredAt,
      metadata: input.metadata,
    });

    return this.toRecord(document as EngagementEventDocument);
  }

  async findManyByUserProfileId(
    userProfileId: string,
    options?: EngagementEventQueryOptions,
  ): Promise<EngagementEventRecord[]> {
    const query = this.engagementEventModel
      .find({ userProfileId })
      .sort({ occurredAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toRecord(document as EngagementEventDocument),
    );
  }

  async findManyByNotificationDecisionId(
    notificationDecisionId: string,
    options?: EngagementEventQueryOptions,
  ): Promise<EngagementEventRecord[]> {
    const query = this.engagementEventModel
      .find({ notificationDecisionId })
      .sort({ occurredAt: -1, _id: -1 });

    if (options?.limit !== undefined) {
      query.limit(options.limit);
    }

    const documents = await query.exec();
    return documents.map((document) =>
      this.toRecord(document as EngagementEventDocument),
    );
  }

  async findRecentByUserProfileId(
    userProfileId: string,
    options?: EngagementEventQueryOptions,
  ): Promise<EngagementEventRecord[]> {
    return this.findManyByUserProfileId(userProfileId, options);
  }

  private toRecord(document: EngagementEventDocument): EngagementEventRecord {
    return {
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      notificationDecisionId: document.notificationDecisionId,
      type: document.type,
      occurredAt: document.occurredAt,
      metadata: document.metadata,
    };
  }
}
