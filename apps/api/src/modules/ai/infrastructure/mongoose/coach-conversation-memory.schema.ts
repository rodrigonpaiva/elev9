import { HydratedDocument, Schema, Types } from "mongoose";

export type CoachConversationMemoryDocument =
  HydratedDocument<CoachConversationMemorySchemaClass>;

export class CoachConversationMemorySchemaClass {
  _id!: Types.ObjectId;
  conversationId!: string;
  summary!: string;
  metadata!: {
    generatedFromMessageCount: number;
    version: string;
  };
  createdAt!: Date;
  updatedAt!: Date;
}

export const COACH_CONVERSATION_MEMORY_MODEL_NAME = "CoachConversationMemory";
export const COACH_CONVERSATION_MEMORY_COLLECTION_NAME =
  "coach_conversation_memories";

export const CoachConversationMemorySchema = new Schema<CoachConversationMemorySchemaClass>(
  {
  conversationId: { type: String, required: true, unique: true, index: true },
    summary: { type: String, required: true },
    metadata: {
      generatedFromMessageCount: { type: Number, required: true },
      version: { type: String, required: true },
    },
  },
  {
    collection: COACH_CONVERSATION_MEMORY_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);
