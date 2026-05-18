import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES,
  GetCoachFeedbackDebugHistoryError,
} from "../../application/use-cases/get-coach-feedback-debug-history/get-coach-feedback-debug-history.errors";
import { GetCoachFeedbackDebugHistoryUseCase } from "../../application/use-cases/get-coach-feedback-debug-history/get-coach-feedback-debug-history.use-case";
import { GetCoachChatMemoryDebugUseCase } from "../../application/use-cases/get-coach-chat-memory-debug/get-coach-chat-memory-debug.use-case";
import { GetCoachChatPromptDebugUseCase } from "../../application/use-cases/get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.use-case";
import { GetCoachChatReplyPathDebugUseCase } from "../../application/use-cases/get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.use-case";
import { GetCoachChatDebugIndexUseCase } from "../../application/use-cases/get-coach-chat-debug-index/get-coach-chat-debug-index.use-case";
import { CreateCoachChatUseCase } from "../../application/use-cases/create-coach-chat/create-coach-chat.use-case";
import {
  REPLAY_COACH_FEEDBACK_ERROR_CODES,
  ReplayCoachFeedbackError,
} from "../../application/use-cases/replay-coach-feedback/replay-coach-feedback.errors";
import { ReplayCoachFeedbackUseCase } from "../../application/use-cases/replay-coach-feedback/replay-coach-feedback.use-case";
import {
  GET_COACH_FEEDBACK_HISTORY_ERROR_CODES,
  GetCoachFeedbackHistoryError,
} from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.errors";
import { GetCoachFeedbackHistoryUseCase } from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case";
import { GetCoachChatHistoryUseCase } from "../../application/use-cases/get-coach-chat-history/get-coach-chat-history.use-case";
import { GetCoachChatDebugHistoryUseCase } from "../../application/use-cases/get-coach-chat-debug-history/get-coach-chat-debug-history.use-case";
import { GenerateCoachFeedbackUseCase } from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case";
import { BuildUserHealthContextService } from "../../application/services/context-builder/build-user-health-context.service";
import { AiController } from "./ai.controller";

describe("AiController history", () => {
  let generateCoachFeedbackUseCase: jest.Mocked<GenerateCoachFeedbackUseCase>;
  let createCoachChatUseCase: jest.Mocked<CreateCoachChatUseCase>;
  let getCoachChatHistoryUseCase: jest.Mocked<GetCoachChatHistoryUseCase>;
  let getCoachChatDebugHistoryUseCase: jest.Mocked<GetCoachChatDebugHistoryUseCase>;
  let getCoachChatMemoryDebugUseCase: jest.Mocked<GetCoachChatMemoryDebugUseCase>;
  let getCoachChatPromptDebugUseCase: jest.Mocked<GetCoachChatPromptDebugUseCase>;
  let getCoachChatReplyPathDebugUseCase: jest.Mocked<GetCoachChatReplyPathDebugUseCase>;
  let getCoachChatDebugIndexUseCase: jest.Mocked<GetCoachChatDebugIndexUseCase>;
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
    getCoachChatMemoryDebugUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatMemoryDebugUseCase>;
    getCoachChatPromptDebugUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatPromptDebugUseCase>;
    getCoachChatReplyPathDebugUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatReplyPathDebugUseCase>;
    getCoachChatDebugIndexUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachChatDebugIndexUseCase>;
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
      getCoachChatMemoryDebugUseCase,
      getCoachChatPromptDebugUseCase,
      getCoachChatReplyPathDebugUseCase,
      getCoachChatDebugIndexUseCase,
      getCoachFeedbackDebugHistoryUseCase,
      replayCoachFeedbackUseCase,
      getCoachFeedbackHistoryUseCase,
      buildUserHealthContextService,
    );
  });

  it("returns empty history", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockResolvedValue({
      feedbacks: [],
    });

    const result = await controller.getCoachFeedbackHistory(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
      {},
    );

    expect(getCoachFeedbackHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      limit: undefined,
    });
    expect(result).toEqual({ feedbacks: [] });
  });

  it("supports limit=1", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockResolvedValue({
      feedbacks: [
        {
          id: "feedback_002",
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

    expect(result.feedbacks).toHaveLength(1);
  });

  it("keeps public history response compatible when internal metadata exists", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockResolvedValue({
      feedbacks: [
        {
          id: "feedback_002",
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

    expect(result.feedbacks[0]).not.toHaveProperty("influences");
  });

  it("returns debug history with influences", async () => {
    getCoachFeedbackDebugHistoryUseCase.execute.mockResolvedValue({
      feedbacks: [
        {
          id: "feedback_002",
          message: "Great consistency this week.",
          insights: ["You trained 4 times this week"],
          recommendations: ["Keep your current rhythm"],
          influences: ["fatigue:high", "nutrition:muscle_gain"],
          generatorVersion: "heuristic-v1",
          contextSnapshot: {
            fatigueLevel: "HIGH",
            recoveryTrend: "needs_recovery",
            weeklyFrequency: 4,
            currentStreak: 6,
            averageWorkoutDuration: 82,
            latestCheckIn: {
              energyLevel: 2,
              sleepQuality: 2,
              muscleSoreness: 4,
              motivationLevel: 3,
            },
            nutritionProfile: {
              goal: "muscle_gain",
              mealsPerDay: 4,
            },
          },
          createdAt: "2026-05-04T10:00:00.000Z",
        },
      ],
    });

    const result = await controller.getCoachFeedbackDebugHistory(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      { limit: 10 },
      {},
    );

    expect(getCoachFeedbackDebugHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      limit: 10,
    });
    expect(result.feedbacks[0].influences).toEqual([
      "fatigue:high",
      "nutrition:muscle_gain",
    ]);
    expect(result.feedbacks[0].generatorVersion).toBe("heuristic-v1");
    expect(result.feedbacks[0].contextSnapshot).toEqual({
      fatigueLevel: "HIGH",
      recoveryTrend: "needs_recovery",
      weeklyFrequency: 4,
      currentStreak: 6,
      averageWorkoutDuration: 82,
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
      },
      nutritionProfile: {
        goal: "muscle_gain",
        mealsPerDay: 4,
      },
    });
  });

  it("replays a feedback from the debug endpoint", async () => {
    replayCoachFeedbackUseCase.execute.mockResolvedValue({
      feedbackId: "feedback_123",
      generatorVersion: "heuristic-v1",
      persisted: {
        message: "persisted",
        insights: ["i1"],
        recommendations: ["r1"],
        influences: ["training:low_consistency"],
      },
      replayed: {
        message: "persisted",
        insights: ["i1"],
        recommendations: ["r2"],
        influences: ["training:low_consistency"],
      },
      matches: {
        message: true,
        insights: true,
        recommendations: false,
        influences: true,
      },
    });

    const result = await controller.replayCoachFeedback(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      "feedback_123",
      {},
    );

    expect(replayCoachFeedbackUseCase.execute).toHaveBeenCalledWith({
      authUserId: "auth_user_123",
      feedbackId: "feedback_123",
    });
    expect(result.matches.recommendations).toBe(false);
  });

  it("maps replay context missing to HTTP 400", async () => {
    replayCoachFeedbackUseCase.execute.mockRejectedValue(
      new ReplayCoachFeedbackError(
        REPLAY_COACH_FEEDBACK_ERROR_CODES.CONTEXT_MISSING,
        "Coach feedback replay context is missing.",
      ),
    );

    await expect(
      controller.replayCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        "feedback_123",
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects replay requests with unexpected body payload", async () => {
    await expect(
      controller.replayCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        "feedback_123",
        { unexpected: true },
      ),
    ).rejects.toMatchObject({
      response: {
        code: REPLAY_COACH_FEEDBACK_ERROR_CODES.INVALID_INPUT,
      },
    });
  });

  it("maps replay not found to HTTP 404", async () => {
    replayCoachFeedbackUseCase.execute.mockRejectedValue(
      new ReplayCoachFeedbackError(
        REPLAY_COACH_FEEDBACK_ERROR_CODES.COACH_FEEDBACK_NOT_FOUND,
        "Coach feedback not found.",
      ),
    );

    await expect(
      controller.replayCoachFeedback(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        "feedback_123",
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("returns empty debug history", async () => {
    getCoachFeedbackDebugHistoryUseCase.execute.mockResolvedValue({
      feedbacks: [],
    });

    const result = await controller.getCoachFeedbackDebugHistory(
      {
        authUser: {
          id: "auth_user_123",
          email: "user@email.com",
        },
      },
      {},
      {},
    );

    expect(result).toEqual({ feedbacks: [] });
  });

  it("public history still does not expose generatorVersion", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockResolvedValue({
      feedbacks: [
        {
          id: "feedback_002",
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

    expect(result.feedbacks[0]).not.toHaveProperty("generatorVersion");
  });

  it("rejects unexpected GET body on debug history", async () => {
    await expect(
      controller.getCoachFeedbackDebugHistory(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
        { unexpected: true },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps debug invalid limit to HTTP 400", async () => {
    getCoachFeedbackDebugHistoryUseCase.execute.mockRejectedValue(
      new GetCoachFeedbackDebugHistoryError(
        GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.INVALID_INPUT,
        "Invalid coach feedback debug history input.",
      ),
    );

    await expect(
      controller.getCoachFeedbackDebugHistory(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        { limit: 101 },
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps debug user profile not found to HTTP 404", async () => {
    getCoachFeedbackDebugHistoryUseCase.execute.mockRejectedValue(
      new GetCoachFeedbackDebugHistoryError(
        GET_COACH_FEEDBACK_DEBUG_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        "User profile not found.",
      ),
    );

    await expect(
      controller.getCoachFeedbackDebugHistory(
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

  it("rejects unexpected GET body", async () => {
    await expect(
      controller.getCoachFeedbackHistory(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
        { unexpected: true },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("maps invalid limit to HTTP 400", async () => {
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

  it("maps user profile not found to HTTP 404", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockRejectedValue(
      new GetCoachFeedbackHistoryError(
        GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        "User profile not found.",
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
        {},
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps invalid session to HTTP 401", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockRejectedValue(
      new GetCoachFeedbackHistoryError(
        GET_COACH_FEEDBACK_HISTORY_ERROR_CODES.INVALID_SESSION,
        "Invalid session.",
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
        {},
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps unexpected failures to HTTP 500", async () => {
    getCoachFeedbackHistoryUseCase.execute.mockRejectedValue(
      new Error("unexpected"),
    );

    await expect(
      controller.getCoachFeedbackHistory(
        {
          authUser: {
            id: "auth_user_123",
            email: "user@email.com",
          },
        },
        {},
        {},
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
