import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  CREATE_NUTRITION_PROFILE_ERROR_CODES,
  CreateNutritionProfileError,
} from "../../application/use-cases/create-nutrition-profile/create-nutrition-profile.errors";
import { CreateNutritionProfileUseCase } from "../../application/use-cases/create-nutrition-profile/create-nutrition-profile.use-case";
import {
  GET_NUTRITION_PROFILE_ERROR_CODES,
  GetNutritionProfileError,
} from "../../application/use-cases/get-nutrition-profile/get-nutrition-profile.errors";
import { GetNutritionProfileUseCase } from "../../application/use-cases/get-nutrition-profile/get-nutrition-profile.use-case";
import { NutritionController } from "./nutrition.controller";

describe("NutritionController", () => {
  let createNutritionProfileUseCase: jest.Mocked<CreateNutritionProfileUseCase>;
  let getNutritionProfileUseCase: jest.Mocked<GetNutritionProfileUseCase>;
  let controller: NutritionController;

  beforeEach(() => {
    createNutritionProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateNutritionProfileUseCase>;
    getNutritionProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetNutritionProfileUseCase>;

    controller = new NutritionController(
      createNutritionProfileUseCase,
      getNutritionProfileUseCase,
    );
  });

  it("uses the authenticated user", async () => {
    createNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_123",
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: "active",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      },
    });

    await controller.createProfile(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {
        goal: "muscle_gain",
        mealsPerDay: 4,
      },
    );

    expect(createNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      goal: "muscle_gain",
      mealsPerDay: 4,
      dietaryRestrictions: undefined,
      allergies: undefined,
      dislikedFoods: undefined,
      preferredFoods: undefined,
    });
  });

  it("returns a safe payload", async () => {
    createNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_123",
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: "active",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:05:00.000Z"),
      },
    });

    const result = await controller.createProfile(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
      },
    );

    expect(result).toEqual({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_123",
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: "active",
        createdAt: "2026-05-18T10:00:00.000Z",
        updatedAt: "2026-05-18T10:05:00.000Z",
      },
    });
  });

  it("maps invalid input errors to HTTP 400", async () => {
    createNutritionProfileUseCase.execute.mockRejectedValue(
      new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_INPUT,
        "Invalid nutrition profile input.",
      ),
    );

    await expect(
      controller.createProfile(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          goal: "muscle_gain",
          mealsPerDay: 4,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps missing user profile errors to HTTP 404", async () => {
    createNutritionProfileUseCase.execute.mockRejectedValue(
      new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        "User profile not found.",
      ),
    );

    await expect(
      controller.createProfile(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {
          goal: "muscle_gain",
          mealsPerDay: 4,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maintains isolation by using only the authenticated user context", async () => {
    createNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_abc",
        goal: "maintenance",
        mealsPerDay: 3,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: "active",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      },
    });

    await controller.createProfile(
      {
        authUser: {
          id: "auth_user_real",
          email: "user@email.com",
        },
      },
      {
        goal: "maintenance",
        mealsPerDay: 3,
        userProfileId: "forged_profile_id",
      } as CreateNutritionProfileUseCase extends never ? never : any,
    );

    expect(createNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_real",
      goal: "maintenance",
      mealsPerDay: 3,
      dietaryRestrictions: undefined,
      allergies: undefined,
      dislikedFoods: undefined,
      preferredFoods: undefined,
    });
  });

  it("maps invalid session errors to HTTP 401", async () => {
    createNutritionProfileUseCase.execute.mockRejectedValue(
      new CreateNutritionProfileError(
        CREATE_NUTRITION_PROFILE_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.createProfile(
        {
          authUser: {
            id: "",
            email: "user@email.com",
          },
        },
        {
          goal: "muscle_gain",
          mealsPerDay: 4,
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("uses authUserId for get profile", async () => {
    getNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_123",
        goal: "maintenance",
        mealsPerDay: 3,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: "active",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:05:00.000Z"),
      },
    });

    await controller.getProfile(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
      {},
    );

    expect(getNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
    });
  });

  it("returns a safe and consistent response for get profile", async () => {
    getNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_123",
        goal: "maintenance",
        mealsPerDay: 3,
        dietaryRestrictions: ["vegetarian"],
        allergies: ["peanut"],
        dislikedFoods: ["broccoli"],
        preferredFoods: ["rice"],
        status: "active",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:05:00.000Z"),
      },
    });

    const result = await controller.getProfile(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
      {},
    );

    expect(result).toEqual({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_123",
        goal: "maintenance",
        mealsPerDay: 3,
        dietaryRestrictions: ["vegetarian"],
        allergies: ["peanut"],
        dislikedFoods: ["broccoli"],
        preferredFoods: ["rice"],
        status: "active",
        createdAt: "2026-05-18T10:00:00.000Z",
        updatedAt: "2026-05-18T10:05:00.000Z",
      },
    });
  });

  it("maintains isolation by using only authenticated context on get profile", async () => {
    getNutritionProfileUseCase.execute.mockResolvedValue({
      nutritionProfile: {
        id: "nutrition_123",
        userProfileId: "profile_real",
        goal: "fat_loss",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
        status: "active",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:05:00.000Z"),
      },
    });

    await controller.getProfile(
      {
        authUser: {
          id: "auth_user_real",
          email: "user@email.com",
        },
      },
      {},
      {},
    );

    expect(getNutritionProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_real",
    });
  });

  it("maps nutrition profile not found to HTTP 404", async () => {
    getNutritionProfileUseCase.execute.mockRejectedValue(
      new GetNutritionProfileError(
        GET_NUTRITION_PROFILE_ERROR_CODES.NUTRITION_PROFILE_NOT_FOUND,
        "Nutrition profile not found.",
      ),
    );

    await expect(
      controller.getProfile(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
