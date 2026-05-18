import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  GET_COACH_FEEDBACK_HISTORY_ERROR_CODES,
  GetCoachFeedbackHistoryError,
} from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.errors";
import { GetCoachFeedbackHistoryUseCase } from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case";
import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.errors";
import { GenerateCoachFeedbackUseCase } from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case";
import { BuildUserHealthContextService } from "../../application/services/context-builder/build-user-health-context.service";
import { AiController } from "./ai.controller";
import { AuthSessionGuard } from "../../../users/presentation/http/guards/auth-session.guard";
import { GUARDS_METADATA } from "@nestjs/common/constants";

describe("AiController", () => {
  let generateCoachFeedbackUseCase: jest.Mocked<GenerateCoachFeedbackUseCase>;
  let getCoachFeedbackHistoryUseCase: jest.Mocked<GetCoachFeedbackHistoryUseCase>;
  let buildUserHealthContextService: jest.Mocked<BuildUserHealthContextService>;
  let controller: AiController;

  beforeEach(() => {
    generateCoachFeedbackUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GenerateCoachFeedbackUseCase>;
    getCoachFeedbackHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachFeedbackHistoryUseCase>;
    buildUserHealthContextService = {
      build: jest.fn(),
    } as unknown as jest.Mocked<BuildUserHealthContextService>;

    controller = new AiController(
      generateCoachFeedbackUseCase,
      getCoachFeedbackHistoryUseCase,
      buildUserHealthContextService,
    );
  });

  it("returns the safe response on success", async () => {
    generateCoachFeedbackUseCase.execute.mockResolvedValue({
      message: "Great consistency this week. You're on a 4-day streak.",
      insights: ["You trained 4 times in the last 7 days"],
      recommendations: ["Keep your current rhythm"],
    });

    const result = await controller.generateCoachFeedback(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
    );

    expect(generateCoachFeedbackUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
    });
    expect(result.message).toContain("4-day streak");
    expect(result).not.toHaveProperty("influences");
  });

  it("rejects extra body fields with HTTP 400", async () => {
    await expect(
      controller.generateCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { authUserId: "forbidden" },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps AI_COACH_INVALID_INPUT to HTTP 400", async () => {
    generateCoachFeedbackUseCase.execute.mockRejectedValue(
      new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_INPUT,
        "Invalid input.",
      ),
    );

    await expect(
      controller.generateCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps USER_PROFILE_NOT_FOUND to HTTP 404", async () => {
    generateCoachFeedbackUseCase.execute.mockRejectedValue(
      new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        "User profile not found.",
      ),
    );

    await expect(
      controller.generateCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps AUTH_INVALID_SESSION to HTTP 401", async () => {
    generateCoachFeedbackUseCase.execute.mockRejectedValue(
      new GenerateCoachFeedbackError(
        GENERATE_COACH_FEEDBACK_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.generateCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps unexpected failures to HTTP 500", async () => {
    generateCoachFeedbackUseCase.execute.mockRejectedValue(
      new Error("unexpected"),
    );

    await expect(
      controller.generateCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("returns feedback history", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockResolvedValue({
      feedbacks: [
        {
          id: "feedback_001",
          message: "Great consistency this week.",
          insights: ["You trained 4 times this week"],
          recommendations: ["Keep your current rhythm"],
          createdAt: "2026-05-04T10:00:00.000Z",
        },
      ],
    });

    const result = await controller.getCoachFeedbackHistory(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      { limit: 1 },
      {},
    );

    expect(getCoachFeedbackHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      limit: 1,
    });
    expect(result.feedbacks).toHaveLength(1);
  });

  it("maps GET invalid input to HTTP 400", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockRejectedValue(
      new GetCoachFeedbackHistoryError(
        GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_INPUT,
        "Invalid coach feedback history input.",
      ),
    );

    await expect(
      controller.getCoachFeedbackHistory(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { limit: 99 },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns the authenticated AI context", async () => {
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      userProfileId: "profile_123",
      userName: "Rodrigo Paiva",
      goal: "gain_muscle",
      activityLevel: "medium",
      weeklyFrequency: 4,
      adherenceScore: 75,
      currentStreak: 3,
      averageWorkoutDuration: 42,
      fatigueLevel: "LOW",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      activeTrainingPlanId: "training_123",
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
        createdAt: new Date("2026-05-04T09:00:00.000Z"),
      },
      nutritionProfile: {
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: ["rice", "eggs"],
      },
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-05-04T10:00:00.000Z"),
    });

    const result = await controller.getAiContext({
      authUser: {
        id: "auth_user_123",
        email: "user@email.com",
      },
    });

    expect(buildUserHealthContextService.build).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
    });
    expect(result).toMatchObject({
      userId: "auth_user_123",
      userProfileId: "profile_123",
      fatigueLevel: "LOW",
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
        createdAt: "2026-05-04T09:00:00.000Z",
      },
      nutritionProfile: {
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: ["rice", "eggs"],
      },
      generatedAt: "2026-05-04T10:00:00.000Z",
    });
  });

  it("omits nutritionProfile in AI context when absent", async () => {
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      adherenceScore: 0,
      currentStreak: 0,
      averageWorkoutDuration: 0,
      fatigueLevel: "MODERATE",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-05-04T10:00:00.000Z"),
    });

    const result = await controller.getAiContext({
      authUser: {
        id: "auth_user_123",
        email: "user@email.com",
      },
    });

    expect(result.nutritionProfile).toBeUndefined();
  });

  it("uses the same auth guard on AI routes", () => {
    const generateGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      AiController.prototype.generateCoachFeedback,
    ) as Array<new (...args: never[]) => unknown>;
    const historyGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      AiController.prototype.getCoachFeedbackHistory,
    ) as Array<new (...args: never[]) => unknown>;
    const contextGuards = Reflect.getMetadata(
      GUARDS_METADATA,
      AiController.prototype.getAiContext,
    ) as Array<new (...args: never[]) => unknown>;

    expect(generateGuards).toContain(AuthSessionGuard);
    expect(historyGuards).toContain(AuthSessionGuard);
    expect(contextGuards).toContain(AuthSessionGuard);
  });
});
