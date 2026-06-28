import { HydratedDocument, Schema, Types } from 'mongoose';

import type { NotificationStatus } from '../../domain/notifications.types';

export type NotificationHistoryDocument =
  HydratedDocument<NotificationHistorySchemaClass>;

export class NotificationHistorySchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  notificationDecisionId!: string;
  previousStatus?: NotificationStatus;
  nextStatus!: NotificationStatus;
  reason?: string;
  occurredAt!: Date;
  metadata?: Record<string, unknown>;
}

export const NOTIFICATION_HISTORY_MODEL_NAME = 'NotificationHistory';
export const NOTIFICATION_HISTORY_COLLECTION_NAME = 'notification_history';

export const NotificationHistorySchema =
  new Schema<NotificationHistorySchemaClass>(
    {
      userProfileId: {
        type: String,
        required: true,
      },
      notificationDecisionId: {
        type: String,
        required: true,
      },
      previousStatus: {
        type: String,
        required: false,
        default: undefined,
      },
      nextStatus: {
        type: String,
        required: true,
      },
      reason: {
        type: String,
        required: false,
        default: undefined,
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
      collection: NOTIFICATION_HISTORY_COLLECTION_NAME,
      timestamps: false,
      versionKey: false,
    },
  );

NotificationHistorySchema.index({ userProfileId: 1, occurredAt: -1 });
NotificationHistorySchema.index({ notificationDecisionId: 1, occurredAt: -1 });
