import { HydratedDocument, Schema, Types } from 'mongoose';

import type {
  NotificationChannel,
  NotificationFatigueLevel,
  NotificationInfluenceProps,
  NotificationPriority,
  NotificationSourceContext,
  NotificationStatus,
  NotificationSuppressionReason,
  NotificationType,
} from '../../domain/notifications.types';

export type NotificationDecisionDocument =
  HydratedDocument<NotificationDecisionSchemaClass>;

export class NotificationDecisionSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  date!: string;
  type!: NotificationType;
  priority!: NotificationPriority;
  channel!: NotificationChannel;
  status!: NotificationStatus;
  title!: string;
  message!: string;
  actionLabel?: string;
  actionTarget?: string;
  influences!: NotificationInfluenceProps[];
  sourceContext!: NotificationSourceContext;
  suppressed!: boolean;
  suppressionReasons!: NotificationSuppressionReason[];
  fatigueLevel!: NotificationFatigueLevel;
  formulaVersion!: string;
  generatedBy!: 'deterministic';
  createdAt!: Date;
  updatedAt!: Date;
}

export const NOTIFICATION_DECISION_MODEL_NAME = 'NotificationDecision';
export const NOTIFICATION_DECISION_COLLECTION_NAME = 'notification_decisions';

const NotificationInfluenceSchema = {
  code: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  impact: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  weight: {
    type: Number,
    required: false,
    default: undefined,
  },
  value: {
    type: Number,
    required: false,
    default: undefined,
  },
} as const;

export const NotificationDecisionSchema =
  new Schema<NotificationDecisionSchemaClass>(
    {
      userProfileId: {
        type: String,
        required: true,
      },
      date: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
      },
      priority: {
        type: String,
        required: true,
      },
      channel: {
        type: String,
        required: true,
        default: 'in_app',
      },
      status: {
        type: String,
        required: true,
        default: 'planned',
      },
      title: {
        type: String,
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      actionLabel: {
        type: String,
        required: false,
        default: undefined,
      },
      actionTarget: {
        type: String,
        required: false,
        default: undefined,
      },
      influences: {
        type: [NotificationInfluenceSchema],
        required: true,
        default: [],
      },
      sourceContext: {
        type: Schema.Types.Mixed,
        required: true,
        default: {},
      },
      suppressed: {
        type: Boolean,
        required: true,
        default: false,
      },
      suppressionReasons: {
        type: [String],
        required: true,
        default: [],
      },
      fatigueLevel: {
        type: String,
        required: true,
        default: 'low',
      },
      formulaVersion: {
        type: String,
        required: true,
      },
      generatedBy: {
        type: String,
        required: true,
        default: 'deterministic',
      },
    },
    {
      collection: NOTIFICATION_DECISION_COLLECTION_NAME,
      timestamps: true,
      versionKey: false,
    },
  );

NotificationDecisionSchema.index(
  { userProfileId: 1, date: 1 },
  { unique: true },
);
NotificationDecisionSchema.index({
  userProfileId: 1,
  date: -1,
  createdAt: -1,
  _id: -1,
});
NotificationDecisionSchema.index({ userProfileId: 1, status: 1 });
NotificationDecisionSchema.index({ userProfileId: 1, type: 1, date: -1 });
