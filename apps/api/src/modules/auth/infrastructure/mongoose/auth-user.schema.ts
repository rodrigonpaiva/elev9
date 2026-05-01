import { HydratedDocument, Schema, Types } from "mongoose";

export type AuthUserDocument = HydratedDocument<AuthUserSchemaClass>;

export class AuthUserSchemaClass {
  _id!: Types.ObjectId;
  email!: string;
  passwordHash!: string;
  isEmailVerified!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export const AUTH_USER_MODEL_NAME = "AuthUser";
export const AUTH_USER_COLLECTION_NAME = "auth_users";

export const AuthUserSchema = new Schema<AuthUserSchemaClass>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    isEmailVerified: { type: Boolean, required: true, default: false },
  },
  {
    collection: AUTH_USER_COLLECTION_NAME,
    timestamps: true,
    versionKey: false,
  },
);
