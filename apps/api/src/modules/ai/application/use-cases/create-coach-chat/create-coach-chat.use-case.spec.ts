import { CoachChatReplyGenerator } from '../../services/chat/coach-chat-reply-generator.service';
import { BuildUserHealthContextService } from '../../services/context-builder/build-user-health-context.service';
import { AiLlmService } from '../../services/llm/ai-llm.service';
import { AiPromptBuilder } from '../../services/llm/ai-prompt-builder.service';
import { CoachConversationMemorySummarizer } from '../../services/memory/coach-conversation-memory-summarizer.service';
import { CoachConversation } from '../../../domain/entities/coach-conversation.entity';
import { CoachConversationMemory } from '../../../domain/entities/coach-conversation-memory.entity';
import { CoachConversationRepository } from '../../../domain/repositories/coach-conversation.repository';
import { CoachConversationMemoryRepository } from '../../../domain/repositories/coach-conversation-memory.repository';
import { CoachMessageRepository } from '../../../domain/repositories/coach-message.repository';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { CreateCoachChatUseCase } from './create-coach-chat.use-case';

describe('CreateCoachChatUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let coachConversationRepository: jest.Mocked<CoachConversationRepository>;
  let coachMessageRepository: jest.Mocked<CoachMessageRepository>;
  let coachConversationMemoryRepository: jest.Mocked<CoachConversationMemoryRepository>;
  let buildUserHealthContextService: {
    build: jest.MockedFunction<BuildUserHealthContextService['build']>;
  };
  let aiPromptBuilder: jest.Mocked<AiPromptBuilder>;
  let aiLlmService: jest.Mocked<AiLlmService>;
  let replyGenerator: jest.Mocked<CoachChatReplyGenerator>;
  let coachConversationMemorySummarizer: jest.Mocked<CoachConversationMemorySummarizer>;
  let useCase: CreateCoachChatUseCase;

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
    } as unknown as {
      build: jest.MockedFunction<BuildUserHealthContextService['build']>;
    };
    aiPromptBuilder = {
      build: jest.fn(),
    } as unknown as jest.Mocked<AiPromptBuilder>;
    aiLlmService = {
      generateReply: jest.fn(),
    } as unknown as jest.Mocked<AiLlmService>;
    replyGenerator = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<CoachChatReplyGenerator>;
    coachConversationMemorySummarizer = {
      summarize: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationMemorySummarizer>;
    coachConversationMemorySummarizer.summarize.mockReturnValue(
      buildMemorySummary({
        generatedFromMessageCount: 2,
      }),
    );

    useCase = new CreateCoachChatUseCase(
      userProfileRepository,
      coachConversationRepository,
      coachMessageRepository,
      coachConversationMemoryRepository,
      buildUserHealthContextService as unknown as BuildUserHealthContextService,
      aiPromptBuilder,
      aiLlmService,
      replyGenerator,
      coachConversationMemorySummarizer,
    );
  });

  it('uses the LLM reply when enabled and persists both messages', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue({
      content: 'OpenAI coach reply',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_123',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_123',
        role: 'assistant',
        content: 'OpenAI coach reply',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });
    coachConversationMemorySummarizer.summarize.mockReturnValue({
      summary:
        'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
      metadata: {
        generatedFromMessageCount: 2,
        version: 'memory-v1',
      },
    });
    replyGenerator.generate.mockReturnValue('Fallback reply');
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.upsertByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary:
          'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-18T10:00:03.000Z'),
        updatedAt: new Date('2026-05-18T10:00:03.000Z'),
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(aiPromptBuilder.build).toHaveBeenCalledWith({
      message: 'Should I train today?',
      healthContext: expect.objectContaining({
        authUserId: 'auth_user_123',
      }),
      conversationHistory: [],
    });
    expect(aiLlmService.generateReply).toHaveBeenCalledWith({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    expect(replyGenerator.generate).not.toHaveBeenCalled();
    expect(coachConversationMemorySummarizer.summarize).toHaveBeenCalled();
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation_123',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
      }),
    );
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(1, {
      conversationId: 'conversation_123',
      role: 'user',
      content: 'Should I train today?',
    });
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_123',
      role: 'assistant',
      content: 'OpenAI coach reply',
      metadata: {
        source: 'llm',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        promptVersion: 'coach-chat-prompt-v1',
      },
    });
    expect(result).toEqual({
      conversationId: 'conversation_123',
      reply: 'OpenAI coach reply',
    });
  });

  it('falls back to the heuristic reply when LLM is disabled', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_456',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
        updatedAt: new Date('2026-05-17T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.findByConversationId.mockResolvedValue([
      {
        id: 'message_002',
        conversationId: 'conversation_456',
        role: 'assistant',
        content: 'Try keeping the session lighter.',
        createdAt: new Date('2026-05-17T10:00:01.000Z'),
      },
      {
        id: 'message_001',
        conversationId: 'conversation_456',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-17T10:00:00.000Z'),
      },
    ]);
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_456',
        conversationId: 'conversation_456',
        summary:
          'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:1; user_concern=recovery',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-05-17T10:00:02.000Z'),
        updatedAt: new Date('2026-05-17T10:00:02.000Z'),
      }),
    );
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        fatigueLevel: 'HIGH',
        latestCheckIn: {
          energyLevel: 2,
          sleepQuality: 2,
          muscleSoreness: 4,
          motivationLevel: 2,
          createdAt: new Date('2026-05-18T09:00:00.000Z'),
        },
      }),
    );
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue(null);
    replyGenerator.generate.mockReturnValue(
      "Your recovery signals suggest keeping today's session lighter.",
    );
    coachConversationMemorySummarizer.summarize.mockReturnValue({
      summary:
        'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:2; user_concern=recovery',
      metadata: {
        generatedFromMessageCount: 4,
        version: 'memory-v1',
      },
    });
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_456',
        role: 'user',
        content: 'Should I train today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_456',
        role: 'assistant',
        content:
          "Your recovery signals suggest keeping today's session lighter.",
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(coachMessageRepository.findByConversationId).toHaveBeenCalledWith({
      conversationId: 'conversation_456',
      limit: 12,
    });
    expect(aiPromptBuilder.build).toHaveBeenCalledWith({
      message: 'Should I train today?',
      healthContext: expect.objectContaining({
        fatigueLevel: 'HIGH',
      }),
      conversationHistory: [
        {
          role: 'user',
          content: 'Should I train today?',
          createdAt: '2026-05-17T10:00:00.000Z',
        },
        {
          role: 'assistant',
          content: 'Try keeping the session lighter.',
          createdAt: '2026-05-17T10:00:01.000Z',
        },
      ],
      conversationMemory: {
        summary:
          'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:1; user_concern=recovery',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
      },
    });
    expect(replyGenerator.generate).toHaveBeenCalledWith({
      message: 'Should I train today?',
      healthContext: expect.objectContaining({
        fatigueLevel: 'HIGH',
      }),
    });
    expect(result.reply).toBe(
      "Your recovery signals suggest keeping today's session lighter.",
    );
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).toHaveBeenCalledWith({
      conversationId: 'conversation_456',
      summary:
        'goal=gain_muscle; fatigue=HIGH; recovery=needs_recovery; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:2; user_concern=recovery',
      metadata: {
        generatedFromMessageCount: 4,
        version: 'memory-v1',
      },
    });
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_456',
      role: 'assistant',
      content: "Your recovery signals suggest keeping today's session lighter.",
      metadata: {
        source: 'heuristic',
      },
    });
  });

  it('falls back to the heuristic reply when the provider fails', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(buildHealthContext());
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockRejectedValue(new Error('OpenAI is down'));
    replyGenerator.generate.mockReturnValue(
      'Your context looks steady. Keep the routine consistent and check in after your session.',
    );
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_789',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_789',
        role: 'user',
        content: 'What should I do today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_789',
        role: 'assistant',
        content:
          'Your context looks steady. Keep the routine consistent and check in after your session.',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'What should I do today?',
    });

    expect(replyGenerator.generate).toHaveBeenCalledTimes(1);
    expect(result.reply).toBe(
      'Your context looks steady. Keep the routine consistent and check in after your session.',
    );
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_789',
      role: 'assistant',
      content:
        'Your context looks steady. Keep the routine consistent and check in after your session.',
      metadata: {
        source: 'heuristic',
      },
    });
  });

  it('keeps the deterministic fallback when health context is sparse', async () => {
    mockUserProfile(userProfileRepository);
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    buildUserHealthContextService.build.mockResolvedValue(
      buildHealthContext({
        latestCheckIn: undefined,
        nutritionProfile: undefined,
        fatigueLevel: 'MODERATE',
      }),
    );
    aiPromptBuilder.build.mockReturnValue({
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    });
    aiLlmService.generateReply.mockResolvedValue(null);
    replyGenerator.generate.mockReturnValue(
      'Your context looks steady. Keep the routine consistent and check in after your session.',
    );
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_999',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-05-18T10:00:00.000Z'),
        updatedAt: new Date('2026-05-18T10:00:00.000Z'),
      }),
    );
    coachMessageRepository.create
      .mockResolvedValueOnce({
        id: 'message_user_123',
        conversationId: 'conversation_999',
        role: 'user',
        content: 'What should I do today?',
        createdAt: new Date('2026-05-18T10:00:01.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'message_assistant_123',
        conversationId: 'conversation_999',
        role: 'assistant',
        content:
          'Your context looks steady. Keep the routine consistent and check in after your session.',
        createdAt: new Date('2026-05-18T10:00:02.000Z'),
      });

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      message: 'What should I do today?',
    });

    expect(result.reply).toContain('Keep the routine consistent');
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_999',
      role: 'assistant',
      content:
        'Your context looks steady. Keep the routine consistent and check in after your session.',
      metadata: {
        source: 'heuristic',
      },
    });
  });
});

function mockUserProfile(
  userProfileRepository: jest.Mocked<UserProfileRepository>,
): void {
  userProfileRepository.findByAuthUserId.mockResolvedValue(
    new UserProfile({
      id: 'profile_123',
      authUserId: 'auth_user_123',
      name: 'Rodrigo Paiva',
      language: 'en-US',
      timezone: 'UTC',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

function buildHealthContext(
  overrides: Partial<
    Awaited<ReturnType<BuildUserHealthContextService['build']>>
  > = {},
): Awaited<ReturnType<BuildUserHealthContextService['build']>> {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    userName: 'Rodrigo Paiva',
    goal: 'gain_muscle',
    activityLevel: 'medium',
    weeklyFrequency: 4,
    adherenceScore: 75,
    currentStreak: 5,
    averageWorkoutDuration: 48,
    fatigueLevel: 'LOW',
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: 'training_123',
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-05-18T10:00:00.000Z'),
    latestCheckIn: {
      energyLevel: 4,
      sleepQuality: 4,
      muscleSoreness: 1,
      motivationLevel: 4,
      createdAt: new Date('2026-05-18T09:00:00.000Z'),
    },
    nutritionProfile: {
      goal: 'muscle_gain',
      mealsPerDay: 4,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: [],
    },
    ...overrides,
  };
}

function buildMemorySummary(
  overrides: Partial<{
    summary: string;
    generatedFromMessageCount: number;
    version: string;
  }> = {},
): {
  summary: string;
  metadata: {
    generatedFromMessageCount: number;
    version: string;
  };
} {
  const {
    summary = 'goal=gain_muscle; fatigue=LOW; recovery=improving; nutrition=muscle_gain/4 meals; workout_continuity=streak:5, recent_workouts:0; user_concern=general',
    generatedFromMessageCount = 2,
    version = 'memory-v1',
  } = overrides;

  return {
    summary,
    metadata: {
      generatedFromMessageCount,
      version,
    },
  };
}
