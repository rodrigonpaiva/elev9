import { GetCoachChatDebugHistoryUseCase } from '../get-coach-chat-debug-history/get-coach-chat-debug-history.use-case';
import { GetCoachChatMemoryDebugUseCase } from '../get-coach-chat-memory-debug/get-coach-chat-memory-debug.use-case';
import { GetCoachChatPromptDebugUseCase } from '../get-coach-chat-prompt-debug/get-coach-chat-prompt-debug.use-case';
import { GetCoachChatReplyPathDebugUseCase } from '../get-coach-chat-reply-path-debug/get-coach-chat-reply-path-debug.use-case';
import { GetCoachChatDebugIndexUseCase } from './get-coach-chat-debug-index.use-case';

describe('GetCoachChatDebugIndexUseCase', () => {
  let getCoachChatDebugHistoryUseCase: jest.Mocked<GetCoachChatDebugHistoryUseCase>;
  let getCoachChatMemoryDebugUseCase: jest.Mocked<GetCoachChatMemoryDebugUseCase>;
  let getCoachChatPromptDebugUseCase: jest.Mocked<GetCoachChatPromptDebugUseCase>;
  let getCoachChatReplyPathDebugUseCase: jest.Mocked<GetCoachChatReplyPathDebugUseCase>;
  let useCase: GetCoachChatDebugIndexUseCase;

  beforeEach(() => {
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

    useCase = new GetCoachChatDebugIndexUseCase(
      getCoachChatDebugHistoryUseCase,
      getCoachChatMemoryDebugUseCase,
      getCoachChatPromptDebugUseCase,
      getCoachChatReplyPathDebugUseCase,
    );
  });

  it('aggregates the existing debug snapshots', async () => {
    getCoachChatDebugHistoryUseCase.execute.mockResolvedValue({
      messages: [
        {
          role: 'assistant',
          content:
            "Your recovery signals suggest keeping today's session lighter.",
          createdAt: '2026-05-18T09:00:00.000Z',
          metadata: {
            source: 'llm',
            promptVersion: 'coach-chat-prompt-v1',
          },
        },
      ],
    });
    getCoachChatMemoryDebugUseCase.execute.mockResolvedValue({
      memory: {
        version: 'memory-v1',
        generatedFromMessageCount: 18,
        summaryPreview:
          'recovery=high; nutrition=consistent; workout_continuity=strong.',
        metadata: {
          hasRecoveryContext: true,
          hasNutritionContext: true,
          hasWorkoutContinuity: true,
        },
        createdAt: '2026-05-18T10:05:00.000Z',
        updatedAt: '2026-05-18T10:10:00.000Z',
      },
    });
    getCoachChatPromptDebugUseCase.execute.mockResolvedValue({
      promptVersion: 'coach-chat-prompt-v1',
      llm: {
        enabled: true,
        provider: 'openai',
        model: 'gpt-4.1-mini',
      },
      context: {
        fatigueLevel: 'MODERATE',
        recoveryTrend: 'stable',
        hasNutritionProfile: true,
        hasLatestCheckIn: true,
        recentWorkoutCount: 2,
        recentConversationMessages: 3,
      },
      promptPreview: {
        systemSections: [
          'safety_rules',
          'adaptive_context',
          'conversation_context',
        ],
        userMessagePreview: 'I feel exhausted after training',
      },
    });
    getCoachChatReplyPathDebugUseCase.execute.mockResolvedValue({
      replyPath: {
        source: 'llm',
        fallbackActivated: false,
        llm: {
          enabled: true,
          provider: 'openai',
          model: 'gpt-4.1-mini',
          promptVersion: 'coach-chat-prompt-v1',
        },
      },
      context: {
        fatigueLevel: 'MODERATE',
        recoveryTrend: 'stable',
        hasNutritionProfile: true,
        hasLatestCheckIn: true,
        recentWorkoutCount: 2,
        recentConversationMessages: 3,
      },
      promptPreview: {
        systemSections: [
          'safety_rules',
          'adaptive_context',
          'conversation_context',
        ],
        userMessagePreview: 'I feel exhausted after training',
      },
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(getCoachChatDebugHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 10,
    });
    expect(result.replyPath.source).toBe('llm');
    expect(result.llm.promptVersion).toBe('coach-chat-prompt-v1');
    expect(result.promptVersion).toBe('coach-chat-prompt-v1');
    expect(result.promptPreview.systemSections).toEqual([
      'safety_rules',
      'adaptive_context',
      'conversation_context',
    ]);
    expect(result.memoryPreview).toEqual({
      version: 'memory-v1',
      generatedFromMessageCount: 18,
      summaryPreview:
        'recovery=high; nutrition=consistent; workout_continuity=strong.',
      metadata: {
        hasRecoveryContext: true,
        hasNutritionContext: true,
        hasWorkoutContinuity: true,
      },
      updatedAt: '2026-05-18T10:10:00.000Z',
    });
    expect(result.recentMessages).toHaveLength(1);
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('omits memory preview when memory debug use case returns nothing', async () => {
    getCoachChatDebugHistoryUseCase.execute.mockResolvedValue({ messages: [] });
    getCoachChatMemoryDebugUseCase.execute.mockResolvedValue({});
    getCoachChatPromptDebugUseCase.execute.mockResolvedValue({
      promptVersion: 'coach-chat-prompt-v1',
      llm: {
        enabled: true,
        provider: 'openai',
        model: 'gpt-4.1-mini',
      },
      context: {
        fatigueLevel: 'MODERATE',
        recoveryTrend: 'stable',
        hasNutritionProfile: true,
        hasLatestCheckIn: true,
        recentWorkoutCount: 2,
        recentConversationMessages: 3,
      },
      promptPreview: {
        systemSections: [
          'safety_rules',
          'adaptive_context',
          'conversation_context',
        ],
        userMessagePreview: 'I feel exhausted after training',
      },
    });
    getCoachChatReplyPathDebugUseCase.execute.mockResolvedValue({
      replyPath: {
        source: 'llm',
        fallbackActivated: false,
        llm: {
          enabled: true,
          provider: 'openai',
          model: 'gpt-4.1-mini',
          promptVersion: 'coach-chat-prompt-v1',
        },
      },
      context: {
        fatigueLevel: 'MODERATE',
        recoveryTrend: 'stable',
        hasNutritionProfile: true,
        hasLatestCheckIn: true,
        recentWorkoutCount: 2,
        recentConversationMessages: 3,
      },
      promptPreview: {
        systemSections: [
          'safety_rules',
          'adaptive_context',
          'conversation_context',
        ],
        userMessagePreview: 'I feel exhausted after training',
      },
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result).not.toHaveProperty('memoryPreview');
  });

  it('rejects invalid sessions', async () => {
    await expect(useCase.execute({ authUserId: '' })).rejects.toMatchObject({
      code: 'AUTH_INVALID_SESSION',
    });
  });
});
