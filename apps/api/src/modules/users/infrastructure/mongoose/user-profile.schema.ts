import { HydratedDocument, Schema, Types } from "mongoose";

export type UserProfileDocument = HydratedDocument<UserProfileSchemaClass>;

export class UserProfileSchemaClass {
  _id!: Types.ObjectId;
  authUserId!: string;
  name!: string;
  birthDate?: Date;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  language!: "en-US";
  timezone!: "UTC";
  status!: "active";
  createdAt!: Date;
  updatedAt!: Date;
}

export const USER_PROFILE_MODEL_NAME = "UserProfile";
export const USER_PROFILE_COLLECTION_NAME = "user_profiles";

export const UserProfileSchema = new Schema<UserProfileSchemaClass>(
  {
    authUserId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    birthDate: { type: Date, required: false },
    gender: { type: String, required: false },
    language: { type: String, required: true, default: "en-US" },
    timezone: { type: String, required: true, default: "UTC" },
    status: { type: String, required: true, default: "active" },
  },
  {
    collection: USER_PROFILE_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);
