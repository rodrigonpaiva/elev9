import { InjectModel } from "@nestjs/mongoose";
import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";

import { AuthUser } from "../../domain/entities/auth-user.entity";
import {
  AuthUserRepository,
  CreateAuthUserRepositoryInput,
} from "../../domain/repositories/auth-user.repository";
import {
  REGISTER_USER_ERROR_CODES,
  RegisterUserError,
} from "../../application/use-cases/register-user/register-user.errors";
import {
  AUTH_USER_MODEL_NAME,
  AuthUserDocument,
  AuthUserSchemaClass,
} from "./auth-user.schema";

@Injectable()
export class MongooseAuthUserRepository implements AuthUserRepository {
  constructor(
    @InjectModel(AUTH_USER_MODEL_NAME)
    private readonly authUserModel: Model<AuthUserSchemaClass>,
  ) {}

  async findByEmail(email: string): Promise<AuthUser | null> {
    const document = await this.authUserModel.findOne({ email }).exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as AuthUserDocument);
  }

  async create(input: CreateAuthUserRepositoryInput): Promise<AuthUser> {
    try {
      const document = await this.authUserModel.create(input);

      return this.toEntity(document as AuthUserDocument);
    } catch (error) {
      if (this.isDuplicateEmailError(error)) {
        throw new RegisterUserError(
          REGISTER_USER_ERROR_CODES.EMAIL_ALREADY_EXISTS,
          "Email already exists.",
        );
      }

      throw error;
    }
  }

  protected toEntity(document: AuthUserDocument): AuthUser {
    return new AuthUser({
      id: document._id.toString(),
      email: document.email,
      passwordHash: document.passwordHash,
      isEmailVerified: document.isEmailVerified,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  private isDuplicateEmailError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const maybeError = error as {
      code?: number;
      keyPattern?: Record<string, unknown>;
      keyValue?: Record<string, unknown>;
    };

    return (
      maybeError.code === 11000 &&
      ("email" in (maybeError.keyPattern ?? {}) ||
        "email" in (maybeError.keyValue ?? {}))
    );
  }
}
