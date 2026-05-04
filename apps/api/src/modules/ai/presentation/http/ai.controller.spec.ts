import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  GENERATE_COACH_FEEDBACK_ERROR_CODES,
  GenerateCoachFeedbackError,
} from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.errors";
import { GenerateCoachFeedbackUseCase } from "../../application/use-cases/generate-coach-feedback/generate-coach-feedback.use-case";
import { AiController } from "./ai.controller";

describe("AiController", () => {
  let generateCoachFeedbackUseCase: jest.Mocked<GenerateCoachFeedbackUseCase>;
  let controller: AiController;

  beforeEach(() => {
    generateCoachFeedbackUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GenerateCoachFeedbackUseCase>;

    controller = new AiController(generateCoachFeedbackUseCase);
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
});
