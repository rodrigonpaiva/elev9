import { CoachConversationMemorySummarizer } from '../memory/coach-conversation-memory-summarizer.service';
import { CoachChatMemoryUpdaterService } from './coach-chat-memory-updater.service';
import { CoachConversationMemoryRepository } from '../../../domain/repositories/coach-conversation-memory.repository';

describe('CoachChatMemoryUpdaterService', () => {
  let coachConversationMemorySummarizer: {
    summarize: jest.MockedFunction<
      CoachConversationMemorySummarizer['summarize']
    >;
  };
  let coachConversationMemoryRepository: {
    upsertByConversationId: jest.MockedFunction<
      CoachConversationMemoryRepository['upsertByConversationId']
    >;
  };
  let service: CoachChatMemoryUpdaterService;

  beforeEach(() => {
    coachConversationMemorySummarizer = {
      summarize: jest.fn(),
    };
    coachConversationMemoryRepository = {
      upsertByConversationId: jest.fn(),
    };

    service = new CoachChatMemoryUpdaterService(
      coachConversationMemorySummarizer as unknown as CoachConversationMemorySummarizer,
      coachConversationMemoryRepository as unknown as CoachConversationMemoryRepository,
    );
  });

  it('summarizes the latest exchange and stores the new memory snapshot', async () => {
    coachConversationMemorySummarizer.summarize.mockReturnValue({
      summary: 'goal=muscle_gain; fatigue=LOW',
      metadata: {
        generatedFromMessageCount: 4,
        version: 'memory-v2',
      },
    });

    await service.update({
      conversationId: 'conversation_123',
      healthContext: {
        goal: 'muscle_gain',
        fatigueLevel: 'LOW',
        recoveryTrend: 'improving',
      } as never,
      conversationHistory: [
        {
          role: 'user',
          content: 'Should I train today?',
          createdAt: '2026-07-05T08:00:00.000Z',
        },
      ],
      userMessage: 'Should I train today?',
      assistantReply: 'Train today.',
    });

    expect(coachConversationMemorySummarizer.summarize).toHaveBeenCalledWith({
      healthContext: {
        goal: 'muscle_gain',
        fatigueLevel: 'LOW',
        recoveryTrend: 'improving',
      },
      conversationMessages: [
        {
          role: 'user',
          content: 'Should I train today?',
          createdAt: '2026-07-05T08:00:00.000Z',
        },
        {
          role: 'user',
          content: 'Should I train today?',
          createdAt: expect.any(String),
        },
        {
          role: 'assistant',
          content: 'Train today.',
          createdAt: expect.any(String),
        },
      ],
    });
    expect(
      coachConversationMemoryRepository.upsertByConversationId,
    ).toHaveBeenCalledWith({
      conversationId: 'conversation_123',
      summary: 'goal=muscle_gain; fatigue=LOW',
      metadata: {
        generatedFromMessageCount: 4,
        version: 'memory-v2',
      },
    });
  });
});
