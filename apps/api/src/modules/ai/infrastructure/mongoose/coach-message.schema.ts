import { HydratedDocument, Schema, Types } from "mongoose";

export type CoachMessageDocument = HydratedDocument<CoachMessageSchemaClass>;

export class CoachMessageSchemaClass {
  _id!: Types.ObjectId;
  conversationId!: string;
  role!: "user" | "assistant";
  content!: string;
  metadata?: {
    source?: "heuristic" | "llm";
    provider?: string;
    model?: string;
    promptVersion?: string;
  };
  createdAt!: Date;
  updatedAt!: Date;
}

export const COACH_MESSAGE_MODEL_NAME = "CoachMessage";
export const COACH_MESSAGE_COLLECTION_NAME = "coach_messages";

export const CoachMessageSchema = new Schema<CoachMessageSchemaClass>(
  {
    conversationId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    content: { type: String, required: true },
    metadata: {
      source: { type: String, required: false },
      provider: { type: String, required: false },
      model: { type: String, required: false },
      promptVersion: { type: String, required: false },
    },
  },
  {
    collection: COACH_MESSAGE_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

CoachMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
