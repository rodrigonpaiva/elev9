import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  CREATE_FITNESS_PROFILE_ERROR_CODES,
  CreateFitnessProfileError,
} from "../../application/use-cases/create-fitness-profile/create-fitness-profile.errors";
import { FitnessProfile } from "../../domain/entities/fitness-profile.entity";
import {
  CreateFitnessProfileRepositoryInput,
  FitnessProfileRepository,
} from "../../domain/repositories/fitness-profile.repository";
import {
  FITNESS_PROFILE_MODEL_NAME,
  FitnessProfileDocument,
  FitnessProfileSchemaClass,
} from "./fitness-profile.schema";

@Injectable()
export class MongooseFitnessProfileRepository implements FitnessProfileRepository {
  constructor(
    @InjectModel(FITNESS_PROFILE_MODEL_NAME)
    private readonly fitnessProfileModel: Model<FitnessProfileSchemaClass>,
  ) {}

  async findById(fitnessProfileId: string): Promise<FitnessProfile | null> {
    const document = await this.fitnessProfileModel.findById(fitnessProfileId).exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as FitnessProfileDocument);
  }

  async findActiveByUserProfileId(
    userProfileId: string,
  ): Promise<FitnessProfile | null> {
    const document = await this.fitnessProfileModel
      .findOne({
        userProfileId,
        status: "active",
      })
      .exec();

    if (!document) {
      return null;
    }

    return this.toEntity(document as FitnessProfileDocument);
  }

  async create(
    input: CreateFitnessProfileRepositoryInput,
  ): Promise<FitnessProfile> {
    try {
      const document = await this.fitnessProfileModel.create(input);

      return this.toEntity(document as FitnessProfileDocument);
    } catch (error) {
      if (this.isDuplicateUserProfileIdError(error)) {
        throw new CreateFitnessProfileError(
          CREATE_FITNESS_PROFILE_ERROR_CODES.ALREADY_EXISTS,
          "Fitness profile already exists.",
        );
      }

      throw error;
    }
  }

  private toEntity(document: FitnessProfileDocument): FitnessProfile {
    return new FitnessProfile({
      id: document._id.toString(),
      userProfileId: document.userProfileId,
      heightCm: document.heightCm,
      weightKg: document.weightKg,
      goal: document.goal,
      activityLevel: document.activityLevel,
      trainingAvailability: {
        daysPerWeek: document.trainingAvailability.daysPerWeek,
        minutesPerSession: document.trainingAvailability.minutesPerSession,
      },
      limitations: document.limitations.map((limitation) => ({
        type: limitation.type,
        description: limitation.description,
        severity: limitation.severity,
      })),
      status: document.status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  }

  private isDuplicateUserProfileIdError(error: unknown): boolean {
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
      ("userProfileId" in (maybeError.keyPattern ?? {}) ||
        "userProfileId" in (maybeError.keyValue ?? {}))
    );
  }
}
