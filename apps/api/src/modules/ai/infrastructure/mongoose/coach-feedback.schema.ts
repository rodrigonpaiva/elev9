import { HydratedDocument, Schema, Types } from "mongoose";

export type CoachFeedbackDocument = HydratedDocument<CoachFeedbackSchemaClass>;

export class CoachFeedbackSchemaClass {
  _id!: Types.ObjectId;
  userProfileId!: string;
  message!: string;
  insights!: string[];
  recommendations!: string[];
  influences?: string[];
  createdAt!: Date;
  updatedAt!: Date;
}

export const COACH_FEEDBACK_MODEL_NAME = "CoachFeedback";
export const COACH_FEEDBACK_COLLECTION_NAME = "coach_feedbacks";

export const CoachFeedbackSchema = new Schema<CoachFeedbackSchemaClass>(
  {
    userProfileId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    insights: {
      type: [{ type: String, required: true }],
      required: true,
      default: [],
    },
    recommendations: {
      type: [{ type: String, required: true }],
      required: true,
      default: [],
    },
    influences: {
      type: [{ type: String, required: true }],
      required: false,
      default: undefined,
    },
  },
  {
    collection: COACH_FEEDBACK_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);

CoachFeedbackSchema.index({ userProfileId: 1, createdAt: -1, _id: -1 });
