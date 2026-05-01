import { Inject, Injectable } from "@nestjs/common";

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../domain/repositories/user-profile.repository";
import {
  CREATE_USER_PROFILE_ERROR_CODES,
  CreateUserProfileError,
} from "./create-user-profile.errors";
import { CreateUserProfileInput } from "./create-user-profile.input";
import { CreateUserProfileOutput } from "./create-user-profile.output";

const ALLOWED_GENDERS = new Set([
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const);

@Injectable()
export class CreateUserProfileUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
  ) {}

  async execute(
    input: CreateUserProfileInput,
  ): Promise<CreateUserProfileOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const normalizedName =
      typeof input.name === "string" ? input.name.trim() : "";
    const birthDate = this.normalizeBirthDate(input.birthDate);

    this.validateInput({
      authUserId,
      name: normalizedName,
      birthDate,
      gender: input.gender,
    });

    try {
      const existingProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (existingProfile) {
        throw new CreateUserProfileError(
          CREATE_USER_PROFILE_ERROR_CODES.ALREADY_EXISTS,
          "User profile already exists.",
        );
      }

      const userProfile = await this.userProfileRepository.create({
        authUserId,
        name: normalizedName,
        birthDate,
        gender: input.gender,
        language: "en-US",
        timezone: "UTC",
        status: "active",
      });

      return {
        userProfile: {
          id: userProfile.id,
          authUserId: userProfile.authUserId,
          name: userProfile.name,
          birthDate: userProfile.birthDate,
          gender: userProfile.gender,
          language: userProfile.language,
          timezone: userProfile.timezone,
          status: userProfile.status,
          createdAt: userProfile.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof CreateUserProfileError) {
        throw error;
      }

      throw new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private validateInput(input: {
    authUserId: string;
    name: string;
    birthDate?: Date;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
  }): void {
    if (!input.authUserId) {
      throw new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    if (!input.name || input.name.length < 2 || input.name.length > 80) {
      throw new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid user profile input.",
      );
    }

    if (input.gender && !ALLOWED_GENDERS.has(input.gender)) {
      throw new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid user profile input.",
      );
    }
  }

  private normalizeBirthDate(birthDate?: string): Date | undefined {
    if (birthDate === undefined) {
      return undefined;
    }

    if (typeof birthDate !== "string" || !birthDate.trim()) {
      throw new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid user profile input.",
      );
    }

    const normalizedBirthDate = new Date(birthDate);

    if (Number.isNaN(normalizedBirthDate.getTime())) {
      throw new CreateUserProfileError(
        CREATE_USER_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid user profile input.",
      );
    }

    return normalizedBirthDate;
  }
}
