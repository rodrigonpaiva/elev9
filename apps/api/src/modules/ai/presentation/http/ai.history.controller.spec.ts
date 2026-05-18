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
import {
  GET_COACH_FEEDBACK_HISTORY_ERROR_CODES,
  GetCoachFeedbackHistoryError,
} from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.errors";
import { GetCoachFeedbackHistoryUseCase } from "../../application/use-cases/get-coach-feedback-history/get-coach-feedback-history.use-case";
import { GenerateCoachFeedbackUseCase } from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case";
import { BuildUserHealthContextService } from "../../application/services/context-builder/build-user-health-context.service";
import { AiController } from "./ai.controller";

describe("AiController history", () => {
  let generateCoachFeedbackUseCase: jest.Mocked<GenerateCoachFeedbackUseCase>;
  let getCoachFeedbackDebugHistoryUseCase: jest.Mocked<GetCoachFeedbackDebugHistoryUseCase>;
  let getCoachFeedbackHistoryUseCase: jest.Mocked<GetCoachFeedbackHistoryUseCase>;
  let buildUserHealthContextService: jest.Mocked<BuildUserHealthContextService>;
  let controller: AiController;

  beforeEach(() => {
    generateCoachFeedbackUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GenerateCoachFeedbackUseCase>;
    getCoachFeedbackDebugHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachFeedbackDebugHistoryUseCase>;
    getCoachFeedbackHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachFeedbackHistoryUseCase>;
    buildUserHealthContextService = {
      build: jest.fn(),
    } as unknown as jest.Mocked<BuildUserHealthContextService>;

    controller = new AiController(
      generateCoachFeedbackUseCase,
      getCoachFeedbackDebugHistoryUseCase,
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
