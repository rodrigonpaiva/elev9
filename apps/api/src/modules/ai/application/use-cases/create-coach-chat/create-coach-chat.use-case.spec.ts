import { CoachChatReplyGenerator } from "../../services/chat/coach-chat-reply-generator.service";
import { BuildUserHealthContextService } from "../../services/context-builder/build-user-health-context.service";
import { CoachConversation } from "../../../domain/entities/coach-conversation.entity";
import { CoachConversationRepository } from "../../../domain/repositories/coach-conversation.repository";
import { CoachMessageRepository } from "../../../domain/repositories/coach-message.repository";
import { UserProfile } from "../../../../users/domain/entities/user-profile.entity";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import { CREATE_COACH_CHAT_ERROR_CODES } from "./create-coach-chat.errors";
import { CreateCoachChatUseCase } from "./create-coach-chat.use-case";

describe("CreateCoachChatUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachConversationRepository: jest.Mocked<CoachConversationRepository>;
  let coachMessageRepository: jest.Mocked<CoachMessageRepository>;
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService["build"]>;
  };
  let replyGenerator: CoachChatReplyGenerator;
  let useCase: CreateCoachChatUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    coachConversationRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
    };
    coachMessageRepository = {
      create: jest.fn(),
      findByConversationId: jest.fn(),
    };
    buildUserHealthContextService = {
      build: jest.fn(),
    };
    replyGenerator = new CoachChatReplyGenerator();

    useCase = new CreateCoachChatUseCase(
      userProfileRepository,
      coachConversationRepository,
      coachMessageRepository,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      replyGenerator,
    );
  });

  it("creates a conversation automatically and persists both messages", async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(null);
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: "conversation_123",
        userProfileId: "profile_123",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      }),
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      userProfileId: "profile_123",
      userName: "Rodrigo Paiva",
      goal: "gain_muscle",
      activityLevel: "medium",
      weeklyFrequency: 4,
      adherenceScore: 75,
      currentStreak: 5,
      averageWorkoutDuration: 48,
      fatigueLevel: "LOW",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      activeTrainingPlanId: "training_123",
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-05-18T10:00:00.000Z"),
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 1,
        motivationLevel: 4,
        createdAt: new Date("2026-05-18T09:00:00.000Z"),
      },
      nutritionProfile: {
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
      },
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: "message_user_123",
        conversationId: "conversation_123",
        role: "user",
        content: "Should I train today?",
        createdAt: new Date("2026-05-18T10:00:01.000Z"),
      })
      .mockResolvedValueOnce({
        id: "message_assistant_123",
        conversationId: "conversation_123",
        role: "assistant",
        content:
          "Your recent consistency looks strong. This may be a good moment for controlled progression.",
        createdAt: new Date("2026-05-18T10:00:02.000Z"),
      });

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      message: "Should I train today?",
    });

    expect(coachConversationRepository.create).toHaveBeenCalledWith({
      userProfileId: "profile_123",
    });
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(1, {
      conversationId: "conversation_123",
      role: "user",
      content: "Should I train today?",
    });
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: "conversation_123",
      role: "assistant",
      content:
        "Your recent consistency looks strong. This may be a good moment for controlled progression.",
    });
    expect(result).toEqual({
      conversationId: "conversation_123",
      reply:
        "Your recent consistency looks strong. This may be a good moment for controlled progression.",
    });
  });

  it("reuses an existing conversation for subsequent messages", async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: "conversation_456",
        userProfileId: "profile_123",
        createdAt: new Date("2026-05-17T10:00:00.000Z"),
        updatedAt: new Date("2026-05-17T10:00:00.000Z"),
      }),
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      userProfileId: "profile_123",
      userName: "Rodrigo Paiva",
      goal: "gain_muscle",
      activityLevel: "medium",
      weeklyFrequency: 4,
      adherenceScore: 60,
      currentStreak: 2,
      averageWorkoutDuration: 40,
      fatigueLevel: "MODERATE",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      activeTrainingPlanId: "training_123",
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-05-18T10:00:00.000Z"),
    });
    coachMessageRepository.create.mockResolvedValue({
      id: "message_123",
      conversationId: "conversation_456",
      role: "assistant",
      content: "Your context looks steady. Keep the routine consistent and check in after your session.",
      createdAt: new Date("2026-05-18T10:00:02.000Z"),
    });

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      message: "Quick check-in",
    });

    expect(coachConversationRepository.create).not.toHaveBeenCalled();
    expect(result.conversationId).toBe("conversation_456");
  });

  it("returns a lighter-session reply when recovery signals are high", async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: "conversation_789",
        userProfileId: "profile_123",
        createdAt: new Date("2026-05-18T10:00:00.000Z"),
        updatedAt: new Date("2026-05-18T10:00:00.000Z"),
      }),
    );
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      userProfileId: "profile_123",
      userName: "Rodrigo Paiva",
      goal: "gain_muscle",
      activityLevel: "high",
      weeklyFrequency: 4,
      adherenceScore: 40,
      currentStreak: 1,
      averageWorkoutDuration: 55,
      fatigueLevel: "HIGH",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      activeTrainingPlanId: "training_123",
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-05-18T10:00:00.000Z"),
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 2,
        createdAt: new Date("2026-05-18T09:00:00.000Z"),
      },
    });
    coachMessageRepository.create.mockResolvedValue({
      id: "message_123",
      conversationId: "conversation_789",
      role: "assistant",
      content: "Your recovery signals suggest keeping today's session lighter.",
      createdAt: new Date("2026-05-18T10:00:02.000Z"),
    });

    const result = await useCase.execute({
      authUserId: "auth_user_123",
      message: "Should I train hard today?",
    });

    expect(result.reply).toBe(
      "Your recovery signals suggest keeping today's session lighter.",
    );
  });

  it("returns invalid input for blank messages", async () => {
    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        message: "   ",
      }),
    ).rejects.toMatchObject({
      code: CREATE_COACH_CHAT_ERROR_CODES.INVALID_INPUT,
    });
  });

  it("returns USER_PROFILE_NOT_FOUND when no profile exists", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: "auth_user_123",
        message: "Hello",
      }),
    ).rejects.toMatchObject({
      code: CREATE_COACH_CHAT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
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

it("falls back to a steady-context reply without check-in or nutrition", async () => {
  const userProfileRepository = {
    findByAuthUserId: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<UserProfileRepository>;
  const coachConversationRepository = {
    create: jest.fn(),
    findLatestByUserProfileId: jest.fn(),
  } as unknown as jest.Mocked<CoachConversationRepository>;
  const coachMessageRepository = {
    create: jest.fn(),
    findByConversationId: jest.fn(),
  } as unknown as jest.Mocked<CoachMessageRepository>;
  const buildUserHealthContextService = {
    build: jest.fn(),
  } as unknown as {
    build: jest.MockedFunction<BuildUserHealthContextService["build"]>;
  };
  const useCase = new CreateCoachChatUseCase(
    userProfileRepository,
    coachConversationRepository,
    coachMessageRepository,
    buildUserHealthContextService as unknown as BuildUserHealthContextService,
    new CoachChatReplyGenerator(),
  );

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
  coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
    new CoachConversation({
      id: "conversation_999",
      userProfileId: "profile_123",
      createdAt: new Date("2026-05-18T10:00:00.000Z"),
      updatedAt: new Date("2026-05-18T10:00:00.000Z"),
    }),
  );
  buildUserHealthContextService.build.mockResolvedValue({
    authUserId: "auth_user_123",
    userProfileId: "profile_123",
    userName: "Rodrigo Paiva",
    goal: "maintain",
    activityLevel: "medium",
    weeklyFrequency: 3,
    adherenceScore: 60,
    currentStreak: 1,
    averageWorkoutDuration: 40,
    fatigueLevel: "MODERATE",
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: "training_123",
    recentWorkoutLogs: [],
    generatedAt: new Date("2026-05-18T10:00:00.000Z"),
  });
  coachMessageRepository.create.mockResolvedValue({
    id: "message_123",
    conversationId: "conversation_999",
    role: "assistant",
    content:
      "Your context looks steady. Keep the routine consistent and check in after your session.",
    createdAt: new Date("2026-05-18T10:00:02.000Z"),
  });

  await expect(
    useCase.execute({
      authUserId: "auth_user_123",
      message: "What should I do today?",
    }),
  ).resolves.toEqual({
    conversationId: "conversation_999",
    reply:
      "Your context looks steady. Keep the routine consistent and check in after your session.",
  });
});
