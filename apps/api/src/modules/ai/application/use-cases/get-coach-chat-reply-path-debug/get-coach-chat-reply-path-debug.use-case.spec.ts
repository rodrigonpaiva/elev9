import { AiLlmConfigService } from "../../services/llm/ai-llm-config.service";
import { AiPromptBuilder } from "../../services/llm/ai-prompt-builder.service";
import { BuildUserHealthContextService } from "../../services/context-builder/build-user-health-context.service";
import { CoachConversationMemoryRepository } from "../../../domain/repositories/coach-conversation-memory.repository";
import { CoachConversationRepository } from "../../../domain/repositories/coach-conversation.repository";
import { CoachMessageRepository } from "../../../domain/repositories/coach-message.repository";
import { UserProfileRepository } from "../../../../users/domain/repositories/user-profile.repository";
import { GetCoachChatReplyPathDebugUseCase } from "./get-coach-chat-reply-path-debug.use-case";

describe("GetCoachChatReplyPathDebugUseCase", () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachConversationRepository: jest.Mocked<CoachConversationRepository>;
  let coachMessageRepository: jest.Mocked<CoachMessageRepository>;
  let coachConversationMemoryRepository: jest.Mocked<CoachConversationMemoryRepository>;
  let buildUserHealthContextService: jest.Mocked<BuildUserHealthContextService>;
  let aiPromptBuilder: AiPromptBuilder;
  let aiLlmConfigService: jest.Mocked<AiLlmConfigService>;
  let useCase: GetCoachChatReplyPathDebugUseCase;

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
    coachConversationMemoryRepository = {
      findByConversationId: jest.fn(),
      upsertByConversationId: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationMemoryRepository>;

    buildUserHealthContextService = {
      build: jest.fn(),
    } as unknown as jest.Mocked<BuildUserHealthContextService>;

    aiPromptBuilder = new AiPromptBuilder();
    aiLlmConfigService = {
      isEnabled: jest.fn(),
      getProvider: jest.fn(),
      getModel: jest.fn(),
      getApiKey: jest.fn(),
    } as unknown as jest.Mocked<AiLlmConfigService>;

    useCase = new GetCoachChatReplyPathDebugUseCase(
      userProfileRepository,
      coachConversationRepository,
      coachMessageRepository,
      coachConversationMemoryRepository,
      buildUserHealthContextService,
      aiPromptBuilder,
      aiLlmConfigService,
    );
  });

  it("returns the llm reply path with sanitized debug data", async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: "profile_123",
    } as never);
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      userProfileId: "profile_123",
      goal: "gain_muscle",
      activityLevel: "medium",
      weeklyFrequency: 4,
      adherenceScore: 75,
      currentStreak: 5,
      averageWorkoutDuration: 48,
      fatigueLevel: "HIGH",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      activeTrainingPlanId: "training_123",
      recentWorkoutLogs: [
        {
          id: "workout_1",
          trainingPlanId: "training_123",
          workoutDayIndex: 1,
          durationMinutes: 50,
          completedExercises: [{ name: "Bench Press", setsDone: 3, repsDone: 8 }],
          date: "2026-05-18",
          createdAt: new Date("2026-05-18T08:00:00.000Z"),
          updatedAt: new Date("2026-05-18T08:00:00.000Z"),
        },
        {
          id: "workout_2",
          trainingPlanId: "training_123",
          workoutDayIndex: 2,
          durationMinutes: 40,
          completedExercises: [{ name: "Row", setsDone: 3, repsDone: 10 }],
          date: "2026-05-19",
          createdAt: new Date("2026-05-19T08:00:00.000Z"),
          updatedAt: new Date("2026-05-19T08:00:00.000Z"),
        },
        {
          id: "workout_3",
          trainingPlanId: "training_123",
          workoutDayIndex: 3,
          durationMinutes: 55,
          completedExercises: [{ name: "Squat", setsDone: 3, repsDone: 6 }],
          date: "2026-05-20",
          createdAt: new Date("2026-05-20T08:00:00.000Z"),
          updatedAt: new Date("2026-05-20T08:00:00.000Z"),
        },
      ],
      latestCheckIn: {
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 3,
        createdAt: new Date("2026-05-18T09:00:00.000Z"),
      },
      nutritionProfile: {
        goal: "muscle_gain",
        mealsPerDay: 4,
        dietaryRestrictions: ["gluten_free"],
        allergies: ["peanuts"],
        dislikedFoods: ["broccoli"],
        preferredFoods: ["rice", "eggs"],
      },
      generatedAt: new Date("2026-05-18T10:00:00.000Z"),
    } as never);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue({
      id: "conversation_123",
      userProfileId: "profile_123",
      createdAt: new Date("2026-05-18T08:30:00.000Z"),
      updatedAt: new Date("2026-05-18T10:05:00.000Z"),
    });
    coachMessageRepository.findByConversationId.mockResolvedValue([
      {
        id: "message_001",
        conversationId: "conversation_123",
        role: "assistant",
        content: "Keep it light today.",
        createdAt: new Date("2026-05-18T09:30:00.000Z"),
      },
      {
        id: "message_002",
        conversationId: "conversation_123",
        role: "user",
        content: "Should I train today?",
        createdAt: new Date("2026-05-18T09:45:00.000Z"),
      },
      {
        id: "message_003",
        conversationId: "conversation_123",
        role: "assistant",
        content: "Your recovery signals suggest keeping today's session lighter.",
        createdAt: new Date("2026-05-18T09:45:01.000Z"),
      },
      {
        id: "message_004",
        conversationId: "conversation_123",
        role: "user",
        content: "I feel exhausted after training",
        createdAt: new Date("2026-05-18T09:46:00.000Z"),
      },
    ]);
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue({
      id: "memory_123",
      conversationId: "conversation_123",
      summary:
        "goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:3; user_concern=recovery",
      metadata: {
        generatedFromMessageCount: 4,
        version: "memory-v1",
      },
      createdAt: new Date("2026-05-18T10:05:00.000Z"),
      updatedAt: new Date("2026-05-18T10:05:00.000Z"),
    } as never);
    aiLlmConfigService.isEnabled.mockReturnValue(true);
    aiLlmConfigService.getProvider.mockReturnValue("openai");
    aiLlmConfigService.getModel.mockReturnValue("gpt-4.1-mini");
    aiLlmConfigService.getApiKey.mockReturnValue("sk-test");

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.replyPath).toEqual({
      source: "llm",
      fallbackActivated: false,
      llm: {
        enabled: true,
        provider: "openai",
        model: "gpt-4.1-mini",
        promptVersion: "coach-chat-prompt-v1",
      },
    });
    expect(result.context).toEqual({
      fatigueLevel: "HIGH",
      recoveryTrend: "needs_recovery",
      hasNutritionProfile: true,
      hasLatestCheckIn: true,
      recentWorkoutCount: 3,
      recentConversationMessages: 4,
    });
    expect(result.promptPreview).toEqual({
      systemSections: [
        "safety_rules",
        "adaptive_context",
        "conversation_memory",
        "conversation_context",
      ],
      userMessagePreview: "I feel exhausted after training",
    });
    expect(result.conversationMemory).toEqual({
      version: "memory-v1",
      generatedFromMessageCount: 4,
      summaryPreview:
        "goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:3; user_concern=recovery",
    });
    expect(JSON.stringify(result)).not.toContain("auth_user_123");
    expect(JSON.stringify(result)).not.toContain("profile_123");
  });

  it.each([
    {
      label: "llm disabled",
      enabled: false,
      provider: "openai",
      apiKey: "sk-test",
      fallbackReason: "llm_disabled" as const,
    },
    {
      label: "invalid provider",
      enabled: true,
      provider: "anthropic",
      apiKey: "sk-test",
      fallbackReason: "invalid_provider" as const,
    },
    {
      label: "provider failure",
      enabled: true,
      provider: "openai",
      apiKey: "",
      fallbackReason: "provider_failure" as const,
    },
  ])("returns heuristic fallback for $label", async ({
    enabled,
    provider,
    apiKey,
    fallbackReason,
  }) => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: "profile_123",
    } as never);
    buildUserHealthContextService.build.mockResolvedValue({
      authUserId: "auth_user_123",
      userProfileId: "profile_123",
      fatigueLevel: "MODERATE",
      availableEquipment: [],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date("2026-05-18T10:00:00.000Z"),
    } as never);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(null);
    coachMessageRepository.findByConversationId.mockResolvedValue([]);
    aiLlmConfigService.isEnabled.mockReturnValue(enabled);
    aiLlmConfigService.getProvider.mockReturnValue(provider);
    aiLlmConfigService.getModel.mockReturnValue("gpt-4.1-mini");
    aiLlmConfigService.getApiKey.mockReturnValue(apiKey);

    const result = await useCase.execute({
      authUserId: "auth_user_123",
    });

    expect(result.replyPath).toMatchObject({
      source: "heuristic",
      fallbackActivated: true,
      fallbackReason,
      llm: {
        enabled,
        provider,
        model: "gpt-4.1-mini",
        promptVersion: "coach-chat-prompt-v1",
      },
    });
    expect(coachConversationRepository.create).not.toHaveBeenCalled();
    expect(coachMessageRepository.create).not.toHaveBeenCalled();
  });

  it("rejects invalid sessions", async () => {
    await expect(useCase.execute({ authUserId: "" })).rejects.toMatchObject({
      code: "AUTH_INVALID_SESSION",
    });
  });
});
