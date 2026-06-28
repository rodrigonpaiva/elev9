import { HydratedDocument, Schema, Types } from 'mongoose';

import type { EngagementEventType } from '../../domain/notifications.types';

export type EngagementEventDocument =
  HydratedDocument<EngagementEventSchemaClass>;

export class EngagementEventSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  notificationDecisionId?: string;
  type!: EngagementEventType;
  occurredAt!: Date;
  metadata?: Record<string, unknown>;
}

export const ENGAGEMENT_EVENT_MODEL_NAME = 'EngagementEvent';
export const ENGAGEMENT_EVENT_COLLECTION_NAME = 'engagement_events';

export const EngagementEventSchema = new Schema<EngagementEventSchemaClass>(
  {
    userProfileId: {
      type: String,
      required: true,
    },
    notificationDecisionId: {
      type: String,
      required: false,
      default: undefined,
    },
    type: {
      type: String,
      required: true,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: false,
      default: undefined,
    },
  },
  {
    collection: ENGAGEMENT_EVENT_COLLECTION_NAME,
    timestamps: false,
    versionKey: false,
  },
);

EngagementEventSchema.index({ userProfileId: 1, occurredAt: -1 });
EngagementEventSchema.index({ notificationDecisionId: 1, occurredAt: -1 });
EngagementEventSchema.index({ userProfileId: 1, type: 1, occurredAt: -1 });
