import { HydratedDocument, Schema, Types } from 'mongoose';

export type CoachConversationDocument =
  HydratedDocument<CoachConversationSchemaClass>;

export class CoachConversationSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export const COACH_CONVERSATION_MODEL_NAME = 'CoachConversation';
export const COACH_CONVERSATION_COLLECTION_NAME = 'coach_conversations';

export const CoachConversationSchema = new Schema<CoachConversationSchemaClass>(
  {
    userProfileId: { type: String, required: true, index: true },
  },
  {
    collection: COACH_CONVERSATION_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

CoachConversationSchema.index({ userProfileId: 1, createdAt: -1, _id: -1 });
