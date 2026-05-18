import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { CreateCoachChatUseCase } from "../../application/use-cases/create-coach-chat/create-coach-chat.use-case";
import { GetCoachChatDebugHistoryUseCase } from "../../application/use-cases/get-coach-chat-debug-history/get-coach-chat-debug-history.use-case";
import {
  GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES,
  GetCoachChatDebugHistoryError,
} from "../../application/use-cases/get-coach-chat-debug-history/get-coach-chat-debug-history.errors";
import { GetCoachFeedbackDebugHistoryUseCase } from "../../application/use-cases/get-coach-feedback-debug-history/get-coach-feedback-debug-history.use-case";
import { ReplayCoachFeedbackUseCase } from "../../application/use-cases/replay-coach-feedback/replay-coach-feedback.use-case";
import {
  GET_COACH_FEEDBACK_HISTORY_ERROR_CODES,
  GetCoachFeedbackHistoryError,
} from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.errors";
import { GetCoachFeedbackHistoryUseCase } from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case";
import {
  CREATE_COACH_CHAT_ERROR_CODES,
  CreateCoachChatError,
} from "../../application/use-cases/create-coach-chat/create-coach-chat.errors";
import { GetCoachChatHistoryUseCase } from "../../application/use-cases/get-coach-chat-history/get-coach-chat-history.use-case";
import {
  GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES,
  GetCoachChatPromptDebugError,
} from "../../application/use-cases/get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.errors";
import { GetCoachChatPromptDebugUseCase } from "../../application/use-cases/get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.use-case";
import {
  GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES,
  GetCoachChatReplyPathDebugError,
} from "../../application/use-cases/get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.errors";
import { GetCoachChatReplyPathDebugUseCase } from "../../application/use-cases/get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.use-case";
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
  let createCoachChatUseCase: jest.Mocked<CreateCoachChatUseCase>;
  let getCoachChatHistoryUseCase: jest.Mocked<GetCoachChatHistoryUseCase>;
  let getCoachChatDebugHistoryUseCase: jest.Mocked<GetCoachChatDebugHistoryUseCase>;
  let getCoachChatPromptDebugUseCase: jest.Mocked<GetCoachChatPromptDebugUseCase>;
  let getCoachChatReplyPathDebugUseCase: jest.Mocked<GetCoachChatReplyPathDebugUseCase>;
  let getCoachFeedbackDebugHistoryUseCase: jest.Mocked<GetCoachFeedbackDebugHistoryUseCase>;
  let replayCoachFeedbackUseCase: jest.Mocked<ReplayCoachFeedbackUseCase>;
  let getCoachFeedbackHistoryUseCase: jest.Mocked<GetCoachFeedbackHistoryUseCase>;
  let buildUserHealthContextService: jest.Mocked<BuildUserHealthContextService>;
  let controller: AiController;

  beforeEach(() => {
    generateCoachFeedbackUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GenerateCoachFeedbackUseCase>;
    createCoachChatUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateCoachChatUseCase>;
    getCoachChatHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatHistoryUseCase>;
    getCoachChatDebugHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatDebugHistoryUseCase>;
    getCoachChatPromptDebugUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatPromptDebugUseCase>;
    getCoachChatReplyPathDebugUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatReplyPathDebugUseCase>;
    getCoachFeedbackDebugHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachFeedbackDebugHistoryUseCase>;
    replayCoachFeedbackUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReplayCoachFeedbackUseCase>;
    getCoachFeedbackHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachFeedbackHistoryUseCase>;
    buildUserHealthContextService = {
      build: jest.fn(),
    } as unknown as jest.Mocked<BuildUserHealthContextService>;

    controller = new AiController(
      generateCoachFeedbackUseCase,
      createCoachChatUseCase,
      getCoachChatHistoryUseCase,
      getCoachChatDebugHistoryUseCase,
      getCoachChatPromptDebugUseCase,
      getCoachChatReplyPathDebugUseCase,
      getCoachFeedbackDebugHistoryUseCase,
      replayCoachFeedbackUseCase,
      getCoachFeedbackHistoryUseCase,
      buildUserHealthContextService,
    );
  });

  it("returns chat reply and conversation id", async () => {
    createCoachChatUseCase.execute.mockResolvedValue({
      conversationId: "conversation_123",
      reply: "Your recovery signals suggest keeping today's session lighter.",
    });

    const result = await controller.createCoachChat(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      { message: "Should I train today?" },
    );

    expect(createCoachChatUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      message: "Should I train today?",
    });
    expect(result).toEqual({
      conversationId: "conversation_123",
      reply: "Your recovery signals suggest keeping today's session lighter.",
    });
  });

  it("rejects invalid chat payloads with HTTP 400", async () => {
    await expect(
      controller.createCoachChat(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { message: "Hi", extra: true } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps chat invalid session to HTTP 401", async () => {
    createCoachChatUseCase.execute.mockRejectedValue(
      new CreateCoachChatError(
        CREATE_COACH_CHAT_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
      ),
    );

    await expect(
      controller.createCoachChat(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { message: "Should I train today?" },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps debug chat history invalid input to HTTP 400", async () => {
    getCoachChatDebugHistoryUseCase.execute.mockRejectedValue(
      new GetCoachChatDebugHistoryError(
        GET_COACH_CHAT_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT,
        "Invalid chat debug history input.",
      ),
    );

    await expect(
      controller.getCoachChatDebugHistory(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { limit: 0 as never },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns sanitized prompt debug data", async () => {
    getCoachChatPromptDebugUseCase.execute.mockResolvedValue({
      promptVersion: "coach-chat-prompt-v1",
      llm: {
        enabled: true,
        provider: "openai",
        model: "gpt-4.1-mini",
      },
      context: {
        fatigueLevel: "HIGH",
        recoveryTrend: "needs_recovery",
        hasNutritionProfile: true,
        hasLatestCheckIn: true,
        recentWorkoutCount: 3,
        recentConversationMessages: 6,
      },
      promptPreview: {
        systemSections: [
          "safety_rules",
          "adaptive_context",
          "conversation_context",
        ],
        userMessagePreview: "I feel tired today after my workout",
      },
    });

    const result = await controller.getCoachChatPromptDebug(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
    );

    expect(getCoachChatPromptDebugUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
    });
    expect(result).toEqual({
      promptVersion: "coach-chat-prompt-v1",
      llm: {
        enabled: true,
        provider: "openai",
        model: "gpt-4.1-mini",
      },
      context: {
        fatigueLevel: "HIGH",
        recoveryTrend: "needs_recovery",
        hasNutritionProfile: true,
        hasLatestCheckIn: true,
        recentWorkoutCount: 3,
        recentConversationMessages: 6,
      },
      promptPreview: {
        systemSections: [
          "safety_rules",
          "adaptive_context",
          "conversation_context",
        ],
        userMessagePreview: "I feel tired today after my workout",
      },
    });
  });

  it("maps prompt debug invalid input to HTTP 400", async () => {
    getCoachChatPromptDebugUseCase.execute.mockRejectedValue(
      new GetCoachChatPromptDebugError(
        GET_COACH_CHAT_PROMPT_DEBUG_ERROR_CODES.INVALID_INPUT,
        "Invalid chat prompt debug input.",
      ),
    );

    await expect(
      controller.getCoachChatPromptDebug(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { extra: true } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns sanitized reply path debug data", async () => {
    getCoachChatReplyPathDebugUseCase.execute.mockResolvedValue({
      replyPath: {
        source: "llm",
        fallbackActivated: false,
        llm: {
          enabled: true,
          provider: "openai",
          model: "gpt-4.1-mini",
          promptVersion: "coach-chat-prompt-v1",
        },
      },
      context: {
        fatigueLevel: "HIGH",
        recoveryTrend: "needs_recovery",
        hasNutritionProfile: true,
        hasLatestCheckIn: true,
        recentWorkoutCount: 3,
        recentConversationMessages: 5,
      },
      promptPreview: {
        systemSections: [
          "safety_rules",
          "adaptive_context",
          "conversation_context",
        ],
        userMessagePreview: "I feel exhausted after training",
      },
    });

    const result = await controller.getCoachChatReplyPathDebug(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
    );

    expect(getCoachChatReplyPathDebugUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
    });
    expect(result.replyPath.source).toBe("llm");
    expect(result.replyPath.llm.promptVersion).toBe("coach-chat-prompt-v1");
  });

  it("maps reply path invalid input to HTTP 400", async () => {
    getCoachChatReplyPathDebugUseCase.execute.mockRejectedValue(
      new GetCoachChatReplyPathDebugError(
        GET_COACH_CHAT_REPLY_PATH_DEBUG_ERROR_CODES.INVALID_INPUT,
        "Invalid chat reply path debug input.",
      ),
    );

    await expect(
      controller.getCoachChatReplyPathDebug(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { extra: true } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns chat history in the internal order", async () => {
    getCoachChatHistoryUseCase.execute.mockResolvedValue([
      {
        role: "user",
        content: "Should I train today?",
        createdAt: "2026-05-18T09:00:00.000Z",
      },
      {
        role: "assistant",
        content: "Your recovery signals suggest keeping today's session lighter.",
        createdAt: "2026-05-18T09:00:01.000Z",
      },
    ]);

    const result = await controller.getCoachChatHistory(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      { limit: 50 },
      {},
    );

    expect(getCoachChatHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      limit: 50,
    });
    expect(result).toHaveLength(2);
  });

  it("returns debug chat history with assistant metadata", async () => {
    getCoachChatDebugHistoryUseCase.execute.mockResolvedValue({
      messages: [
        {
          role: "user",
          content: "Should I train today?",
          createdAt: "2026-05-18T09:00:00.000Z",
        },
        {
          role: "assistant",
          content: "Keep it light today.",
          createdAt: "2026-05-18T09:00:01.000Z",
          metadata: {
            source: "llm",
            provider: "openai",
            model: "gpt-4.1-mini",
            promptVersion: "coach-chat-prompt-v1",
          },
        },
      ],
    });

    const result = await controller.getCoachChatDebugHistory(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      { limit: 50 },
      {},
    );

    expect(getCoachChatDebugHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      limit: 50,
    });
    expect(result.messages[1].metadata).toEqual({
      source: "llm",
      provider: "openai",
      model: "gpt-4.1-mini",
      promptVersion: "coach-chat-prompt-v1",
    });
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
    expect(result).not.toHaveProperty("generatorVersion");
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
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        AiController.prototype.getCoachChatPromptDebug,
      ) as Array<new (...args: never[]) => unknown>,
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        AiController.prototype.getCoachChatReplyPathDebug,
      ) as Array<new (...args: never[]) => unknown>,
    ).toContain(AuthSessionGuard);
    expect(contextGuards).toContain(AuthSessionGuard);
  });
});
