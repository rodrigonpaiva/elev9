import { CoachConversation } from "../../../domain/entities/coach-conversation.entity";
import { CoachConversationRepository } from "../../../domain/repositories/coach-conversation.repository";
import { CoachMessageRepository } from "../../../domain/repositories/coach-message.repository";
import { UserProfile } from "../../../../users/domain/entities/user-profile.entity";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import { GetCoachChatDebugHistoryUseCase } from "./get-coach-chat-debug-history.use-case";

describe("GetCoachChatDebugHistoryUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachConversationRepository: jest.Mocked<CoachConversationRepository>;
  let coachMessageRepository: jest.Mocked<CoachMessageRepository>;
  let useCase: GetCoachChatDebugHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    coachConversationRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationRepository>;
    coachMessageRepository = {
      create: jest.fn(),
      findByConversationId: jest.fn(),
    } as unknown as jest.Mocked<CoachMessageRepository>;

    useCase = new GetCoachChatDebugHistoryUseCase(
      userProfileRepository,
      coachConversationRepository,
      coachMessageRepository,
    );
  });

  it("returns debug history with assistant metadata in chronological order", async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: "conversation_123",
        userProfileId: "profile_123",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      }),
    );
    coachMessageRepository.findByConversationId.mockResolvedValue([
      {
        id: "message_002",
        conversationId: "conversation_123",
        role: "assistant",
        content: "Keep it light today.",
        createdAt: new Date("2026-05-18T10:00:01.000Z"),
        metadata: {
          source: "llm",
          provider: "openai",
          model: "gpt-4.1-mini",
          promptVersion: "coach-chat-prompt-v1",
        },
      },
      {
        id: "message_001",
        conversationId: "conversation_123",
        role: "user",
        content: "Should I train today?",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
      },
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      limit: 50,
    });

    expect(coachMessageRepository.findByConversationId).toHaveBeenCalledWith({
      conversationId: "conversation_123",
      limit: 50,
    });
    expect(result.messages).toEqual([
      {
        role: "user",
        content: "Should I train today?",
        createdAt: "2026-05-18T10:00:00.000Z",
      },
      {
        role: "assistant",
        content: "Keep it light today.",
        createdAt: "2026-05-18T10:00:01.000Z",
        metadata: {
          source: "llm",
          provider: "openai",
          model: "gpt-4.1-mini",
          promptVersion: "coach-chat-prompt-v1",
        },
      },
    ]);
  });

  it("returns an empty history when no conversation exists", async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result).toEqual({
      messages: [],
    });
  });

  it("rejects invalid sessions", async () => {
    await expect(
      useCase.execute({
        authUserId: "",
      }),
    ).rejects.toThrow("Invalid session.");
  });

  it("rejects missing user profiles", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
      }),
    ).rejects.toThrow("User profile not found.");
  });

  it("falls back to empty metadata for legacy messages", async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: "conversation_123",
        userProfileId: "profile_123",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      }),
    );
    coachMessageRepository.findByConversationId.mockResolvedValue([
      {
        id: "message_001",
        conversationId: "conversation_123",
        role: "assistant",
        content: "Keep it light today.",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
      },
    ]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.messages[0].metadata).toBeUndefined();
  });

  it("defaults to 50 and caps at 100", async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: "conversation_123",
        userProfileId: "profile_123",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      }),
    );
    coachMessageRepository.findByConversationId.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      limit: 100,
    });

    expect(result).toEqual({
      messages: [],
    });
    expect(coachMessageRepository.findByConversationId).toHaveBeenCalledWith({
      conversationId: "conversation_123",
      limit: 100,
    });
  });

  it("rejects limits above the maximum", async () => {
    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        limit: 101,
      }),
    ).rejects.toThrow("Invalid chat debug history input.");
  });
});

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
  userProfileRepository.findByAuthUserId.mockResolvedValue(
    new UserProfile({
      id: "profile_123",
      authUserId: "auth_user_123",
      name: "Rodrigo Paiva",
      language: "en-US",
      timezone: "UTC",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}
