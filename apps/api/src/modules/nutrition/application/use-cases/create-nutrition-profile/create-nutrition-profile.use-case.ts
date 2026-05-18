import { Inject, Injectable } from "@nestjs/common";

import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from "../../../../users/domain/repositories/user-profile.repository";
import { NutritionGoal } from "../../../domain/entities/nutrition-profile.entity";
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionProfileRepository,
} from "../../../domain/repositories/nutrition-profile.repository";
import {
  CREATE_NUTRITION_PROFILE_ERROR_CODES,
  CreateNutritionProfileError,
} from "./create-nutrition-profile.errors";
import { CreateNutritionProfileInput } from "./create-nutrition-profile.input";
import { CreateNutritionProfileOutput } from "./create-nutrition-profile.output";

const ALLOWED_GOALS = new Set<NutritionGoal>([
  "fat_loss",
  "maintenance",
  "muscle_gain",
]);

@Injectable()
export class CreateNutritionProfileUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(NUTRITION_PROFILE_REPOSITORY)
    private readonly nutritionProfileRepository: NutritionProfileRepository,
  ) {}

  async execute(
    input: CreateNutritionProfileInput,
  ): Promise<CreateNutritionProfileOutput> {
    const authUserId =
      typeof input.authUserId === "string" ? input.authUserId.trim() : "";
    const dietaryRestrictions = this.normalizeStringArray(
      input.dietaryRestrictions,
    );
    const allergies = this.normalizeStringArray(input.allergies);
    const dislikedFoods = this.normalizeStringArray(input.dislikedFoods);
    const preferredFoods = this.normalizeStringArray(input.preferredFoods);

    this.validateInput({
      authUserId,
      goal: input.goal,
      mealsPerDay: input.mealsPerDay,
      dietaryRestrictions,
      allergies,
      dislikedFoods,
      preferredFoods,
    });

    try {
      const userProfile =
        await this.userProfileRepository.findByAuthUserId(authUserId);

      if (!userProfile) {
        throw new CreateNutritionProfileError(
          CREATE_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
          "User profile not found.",
        );
      }

      const nutritionProfile =
        await this.nutritionProfileRepository.upsertByUserProfileId({
          userProfileId: userProfile.id,
          goal: input.goal,
          mealsPerDay: input.mealsPerDay,
          dietaryRestrictions,
          allergies,
          dislikedFoods,
          preferredFoods,
          status: "active",
        });

      return {
        nutritionProfile: {
          id: nutritionProfile.id,
          userProfileId: nutritionProfile.userProfileId,
          goal: nutritionProfile.goal,
          mealsPerDay: nutritionProfile.mealsPerDay,
          dietaryRestrictions: nutritionProfile.dietaryRestrictions,
          allergies: nutritionProfile.allergies,
          dislikedFoods: nutritionProfile.dislikedFoods,
          preferredFoods: nutritionProfile.preferredFoods,
          status: nutritionProfile.status,
          createdAt: nutritionProfile.createdAt,
          updatedAt: nutritionProfile.updatedAt,
        },
      };
    } catch (error) {
      if (error instanceof CreateNutritionProfileError) {
        throw error;
      }

      throw new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INTERNAL_ERROR,
        "An unexpected error occurred.",
      );
    }
  }

  private validateInput(input: {
    authUserId: string;
    goal: NutritionGoal;
    mealsPerDay: number;
    dietaryRestrictions: string[];
    allergies: string[];
    dislikedFoods: string[];
    preferredFoods: string[];
  }): void {
    if (!input.authUserId) {
      throw new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      );
    }

    if (!ALLOWED_GOALS.has(input.goal)) {
      throw new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid nutrition profile input.",
      );
    }

    if (
      !Number.isInteger(input.mealsPerDay) ||
      input.mealsPerDay < 1 ||
      input.mealsPerDay > 8
    ) {
      throw new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid nutrition profile input.",
      );
    }

    for (const values of [
      input.dietaryRestrictions,
      input.allergies,
      input.dislikedFoods,
      input.preferredFoods,
    ]) {
      for (const value of values) {
        if (!value) {
          throw new CreateNutritionProfileError(
            CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_INPUT,
            "Invalid nutrition profile input.",
          );
        }
      }
    }
  }

  private normalizeStringArray(values?: string[]): string[] {
    if (values === undefined) {
      return [];
    }

    if (!Array.isArray(values)) {
      throw new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid nutrition profile input.",
      );
    }

    return values.map((value) =>
      typeof value === "string" ? value.trim() : "",
    );
  }
}
