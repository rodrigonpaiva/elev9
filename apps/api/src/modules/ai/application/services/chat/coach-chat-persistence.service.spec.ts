import { CoachConversation } from '../../../domain/entities/coach-conversation.entity';
import { CoachConversationMemory } from '../../../domain/entities/coach-conversation-memory.entity';
import { CoachChatPersistenceService } from './coach-chat-persistence.service';
import { CoachConversationRepository } from '../../../domain/repositories/coach-conversation.repository';
import { CoachConversationMemoryRepository } from '../../../domain/repositories/coach-conversation-memory.repository';
import { CoachMessageRepository } from '../../../domain/repositories/coach-message.repository';

describe('CoachChatPersistenceService', () => {
  let coachConversationRepository: {
    create: jest.MockedFunction<CoachConversationRepository['create']>;
    findLatestByUserProfileId: jest.MockedFunction<
      CoachConversationRepository['findLatestByUserProfileId']
    >;
  };
  let coachMessageRepository: {
    create: jest.MockedFunction<CoachMessageRepository['create']>;
    findByConversationId: jest.MockedFunction<
      CoachMessageRepository['findByConversationId']
    >;
  };
  let coachConversationMemoryRepository: {
    findByConversationId: jest.MockedFunction<
      CoachConversationMemoryRepository['findByConversationId']
    >;
    upsertByConversationId: jest.MockedFunction<
      CoachConversationMemoryRepository['upsertByConversationId']
    >;
  };
  let service: CoachChatPersistenceService;

  beforeEach(() => {
    coachConversationRepository = {
      create: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
    };
    coachMessageRepository = {
      create: jest.fn(),
      findByConversationId: jest.fn(),
    };
    coachConversationMemoryRepository = {
      findByConversationId: jest.fn(),
      upsertByConversationId: jest.fn(),
    };

    service = new CoachChatPersistenceService(
      coachConversationRepository as unknown as CoachConversationRepository,
      coachMessageRepository as unknown as CoachMessageRepository,
      coachConversationMemoryRepository as unknown as CoachConversationMemoryRepository,
    );
  });

  it('creates a conversation when none exists and loads prior state', async () => {
    coachConversationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    coachConversationRepository.create.mockResolvedValue(
      new CoachConversation({
        id: 'conversation_123',
        userProfileId: 'profile_123',
        createdAt: new Date('2026-07-05T08:00:00.000Z'),
        updatedAt: new Date('2026-07-05T08:00:00.000Z'),
      }),
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      new CoachConversationMemory({
        id: 'memory_123',
        conversationId: 'conversation_123',
        summary: 'summary',
        metadata: {
          generatedFromMessageCount: 2,
          version: 'memory-v1',
        },
        createdAt: new Date('2026-07-05T08:00:00.000Z'),
        updatedAt: new Date('2026-07-05T08:00:00.000Z'),
      }),
    );

    const state = await service.resolveConversationState('profile_123');

    expect(coachConversationRepository.create).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
    });
    expect(coachMessageRepository.findByConversationId).not.toHaveBeenCalled();
    expect(state.conversationId).toBe('conversation_123');
    expect(state.conversationHistory).toEqual([]);
    expect(state.conversationMemory).toMatchObject({
      summary: 'summary',
      metadata: { version: 'memory-v1' },
    });
  });

  it('persists assistant messages with llm metadata and heuristic fallback metadata', async () => {
    coachMessageRepository.create.mockResolvedValue({
      id: 'message_123',
      conversationId: 'conversation_123',
      role: 'assistant',
      content: 'reply',
      createdAt: new Date('2026-07-05T08:00:00.000Z'),
    } as never);

    await service.persistAssistantMessage('conversation_123', {
      content: 'LLM reply',
      source: 'llm',
      provider: 'openai',
      model: 'gpt-5.5',
      promptVersion: 'coach-chat-prompt-v1',
    });

    await service.persistAssistantMessage('conversation_123', {
      content: 'Fallback reply',
      source: 'heuristic',
    });

    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(1, {
      conversationId: 'conversation_123',
      role: 'assistant',
      content: 'LLM reply',
      metadata: {
        source: 'llm',
        provider: 'openai',
        model: 'gpt-5.5',
        promptVersion: 'coach-chat-prompt-v1',
      },
    });
    expect(coachMessageRepository.create).toHaveBeenNthCalledWith(2, {
      conversationId: 'conversation_123',
      role: 'assistant',
      content: 'Fallback reply',
      metadata: {
        source: 'heuristic',
      },
    });
  });

  it('persists user messages', async () => {
    coachMessageRepository.create.mockResolvedValue({
      id: 'message_user_123',
      conversationId: 'conversation_123',
      role: 'user',
      content: 'Hello',
      createdAt: new Date('2026-07-05T08:00:00.000Z'),
    } as never);

    await service.persistUserMessage('conversation_123', 'Hello');

    expect(coachMessageRepository.create).toHaveBeenCalledWith({
      conversationId: 'conversation_123',
      role: 'user',
      content: 'Hello',
    });
  });
});
