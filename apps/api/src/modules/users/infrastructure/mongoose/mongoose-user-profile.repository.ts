import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  CREATE_USER_PROFILE_ERROR_CODES,
  CreateUserProfileError,
} from "../../application/use-cases/create-user-profile/create-user-profile.errors";
import { UserProfile } from "../../domain/entities/user-profile.entity";
import {
  CreateUserProfileRepositoryInput,
  UserProfileRepository,
} from "../../domain/repositories/user-profile.repository";
import {
  USER_PROFILE_MODEL_NAME,
  UserProfileDocument,
  UserProfileSchemaClass,
} from "./user-profile.schema";

@Injectable()
export class MongooseUserProfileRepository implements UserProfileRepository {
  constructor(
    @InjectModel(USER_PROFILE_MODEL_NAME)
    private readonly userProfileModel: Model<UserProfileSchemaClass>,
  ) {}

  async findByAuthUserId(authUserId: string): Promise<UserProfile | null> {
    const document = await this.userProfileModel.findOne({ authUserId }).exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as UserProfileDocument);
  }

  async create(input: CreateUserProfileRepositoryInput): Promise<UserProfile> {
    try {
      const document = await this.userProfileModel.create(input);

      return this.toEntity(document as UserProfileDocument);
    } catch (error) {
      if (this.isDuplicateAuthUserIdError(error)) {
        throw new CreateUserProfileError(
          CREATE_USER_PROFILE_ERROR_CODES.ALREADY_EXISTS,
          "User profile already exists.",
        );
      }

      throw error;
    }
  }

  private toEntity(document: UserProfileDocument): UserProfile {
    return new UserProfile({
      id: document._id.toString(),
      authUserId: document.authUserId,
      name: document.name,
      birthDate: document.birthDate,
      gender: document.gender,
      language: document.language,
      timezone: document.timezone,
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  private isDuplicateAuthUserIdError(error: unknown): boolean {
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
      ("authUserId" in (maybeError.keyPattern ?? {}) ||
        "authUserId" in (maybeError.keyValue ?? {}))
    );
  }
}
