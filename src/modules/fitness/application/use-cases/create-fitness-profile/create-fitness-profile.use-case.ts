import { Inject, Injectable } from "@nestjs/common";

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import {
  ActivityLevel,
  FitnessGoal,
  FitnessProfileLimitation,
} from "../../../domain/entities/fitness-profile.entity";
import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from "../../../domain/repositories/fitness-profile.repository";
import {
  CREATE_FITNESS_PROFILE_ERROR_CODES,
  CreateFitnessProfileError,
} from "./create-fitness-profile.errors";
import { CreateFitnessProfileInput } from "./create-fitness-profile.input";
import { CreateFitnessProfileOutput } from "./create-fitness-profile.output";

const ALLOWED_GOALS = new Set<FitnessGoal>([
  "lose_weight",
  "gain_muscle",
  "maintain",
]);
const ALLOWED_ACTIVITY_LEVELS = new Set<ActivityLevel>(["low", "medium", "high"]);
const ALLOWED_LIMITATION_SEVERITIES = new Set(["low", "medium", "high"] as const);

@Injectable()
export class CreateFitnessProfileUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
  ) {}

  async execute(
    input: CreateFitnessProfileInput,
  ): Promise<CreateFitnessProfileOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const limitations = this.normalizeLimitations(input.limitations);

    this.validateInput({
      authUserId,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      goal: input.goal,
      activityLevel: input.activityLevel,
      daysPerWeek: input.trainingAvailability?.daysPerWeek,
      minutesPerSession: input.trainingAvailability?.minutesPerSession,
      limitations,
    });

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CreateFitnessProfileError(
          CREATE_FITNESS_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const existingFitnessProfile =
        await this.fitnessProfileRepository.findActiveByUserProfileId(
          userProfile.id,
        );

      if (existingFitnessProfile) {
        throw new CreateFitnessProfileError(
          CREATE_FITNESS_PROFILE_ERROR_CODES.ALREADY_EXISTS,
          "Fitness profile already exists.",
        );
      }

      const fitnessProfile = await this.fitnessProfileRepository.create({
        userProfileId: userProfile.id,
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        goal: input.goal,
        activityLevel: input.activityLevel,
        trainingAvailability: {
          daysPerWeek: input.trainingAvailability.daysPerWeek,
          minutesPerSession: input.trainingAvailability.minutesPerSession,
        },
        limitations,
        status: "active",
      });

      return {
        fitnessProfile: {
          id: fitnessProfile.id,
          userProfileId: fitnessProfile.userProfileId,
          heightCm: fitnessProfile.heightCm,
          weightKg: fitnessProfile.weightKg,
          goal: fitnessProfile.goal,
          activityLevel: fitnessProfile.activityLevel,
          trainingAvailability: fitnessProfile.trainingAvailability,
          limitations: fitnessProfile.limitations,
          status: fitnessProfile.status,
          createdAt: fitnessProfile.createdAt,
        },
      };
    } catch (error) {
      if (error instanceof CreateFitnessProfileError) {
        throw error;
      }

      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private validateInput(input: {
    authUserId: string;
    heightCm: number;
    weightKg: number;
    goal: FitnessGoal;
    activityLevel: ActivityLevel;
    daysPerWeek: number | undefined;
    minutesPerSession: number | undefined;
    limitations: FitnessProfileLimitation[];
  }): void {
    if (!input.authUserId) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    if (!Number.isInteger(input.heightCm) || input.heightCm < 100 || input.heightCm > 250) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid fitness profile input.",
      );
    }

    if (
      typeof input.weightKg !== "number" ||
      Number.isNaN(input.weightKg) ||
      input.weightKg < 30 ||
      input.weightKg > 300
    ) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid fitness profile input.",
      );
    }

    if (!ALLOWED_GOALS.has(input.goal)) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid fitness profile input.",
      );
    }

    if (!ALLOWED_ACTIVITY_LEVELS.has(input.activityLevel)) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid fitness profile input.",
      );
    }

    if (
      input.daysPerWeek === undefined ||
      !Number.isInteger(input.daysPerWeek) ||
      input.daysPerWeek < 1 ||
      input.daysPerWeek > 7
    ) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid fitness profile input.",
      );
    }

    if (
      input.minutesPerSession === undefined ||
      !Number.isInteger(input.minutesPerSession) ||
      input.minutesPerSession < 10 ||
      input.minutesPerSession > 180
    ) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid fitness profile input.",
      );
    }

    for (const limitation of input.limitations) {
      if (
        !limitation ||
        typeof limitation.type !== "string" ||
        !limitation.type.trim() ||
        !ALLOWED_LIMITATION_SEVERITIES.has(limitation.severity)
      ) {
        throw new CreateFitnessProfileError(
          CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
          "Invalid fitness profile input.",
        );
      }

      if (
        limitation.description !== undefined &&
        typeof limitation.description !== "string"
      ) {
        throw new CreateFitnessProfileError(
          CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
          "Invalid fitness profile input.",
        );
      }
    }
  }

  private normalizeLimitations(
    limitations?: FitnessProfileLimitation[],
  ): FitnessProfileLimitation[] {
    if (limitations === undefined) {
      return [];
    }

    if (!Array.isArray(limitations)) {
      throw new CreateFitnessProfileError(
        CREATE_FITNESS_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid fitness profile input.",
      );
    }

    return limitations.map((limitation) => ({
      type:
        typeof limitation?.type === "string" ? limitation.type.trim() : "",
      description:
        typeof limitation?.description === "string"
          ? limitation.description.trim()
          : limitation?.description,
      severity: limitation?.severity,
    }));
  }
}
