import { CoachChatReplyGenerator } from './coach-chat-reply-generator.service';
import { CoachChatReplyOrchestratorService } from './coach-chat-reply-orchestrator.service';
import { AiLlmService } from '../llm/ai-llm.service';

describe('CoachChatReplyOrchestratorService', () => {
  let aiLlmService: {
    generateReply: jest.MockedFunction<AiLlmService['generateReply']>;
    streamReply: jest.MockedFunction<AiLlmService['streamReply']>;
    canStream: jest.MockedFunction<AiLlmService['canStream']>;
  };
  let replyGenerator: {
    generate: jest.MockedFunction<CoachChatReplyGenerator['generate']>;
  };
  let service: CoachChatReplyOrchestratorService;

  beforeEach(() => {
    aiLlmService = {
      generateReply: jest.fn(),
      streamReply: jest.fn(),
      canStream: jest.fn().mockReturnValue(false),
    };
    replyGenerator = {
      generate: jest.fn().mockReturnValue('Deterministic fallback reply'),
    };

    service = new CoachChatReplyOrchestratorService(
      aiLlmService as unknown as AiLlmService,
      replyGenerator as unknown as CoachChatReplyGenerator,
    );
  });

  it('returns the synchronous LLM reply and forwards it to the stream callback', async () => {
    aiLlmService.generateReply.mockResolvedValue({
      content: 'LLM reply',
      provider: 'openai',
      model: 'gpt-5.5',
      promptVersion: 'coach-chat-prompt-v1',
    } as never);

    const onDelta = jest.fn();
    const result = await service.execute({
      prompt: { metadata: { provider: 'openai', model: 'gpt-5.5' } } as never,
      context: {
        healthContext: { fatigueLevel: 'LOW', recoveryTrend: 'stable' },
      } as never,
      message: 'Should I train today?',
      options: { onDelta },
    });

    expect(result).toEqual({
      content: 'LLM reply',
      source: 'llm',
      provider: 'openai',
      model: 'gpt-5.5',
      promptVersion: 'coach-chat-prompt-v1',
    });
    expect(onDelta).toHaveBeenCalledWith('LLM reply');
  });

  it('uses the streaming path when enabled and the provider supports it', async () => {
    aiLlmService.canStream.mockReturnValue(true);
    aiLlmService.streamReply.mockImplementation(async (_prompt, onDelta) => {
      onDelta?.('Hel');
      onDelta?.('lo');
      return {
        content: 'Hello',
        provider: 'openai',
        model: 'gpt-5.5',
        promptVersion: 'coach-chat-prompt-v1',
      } as never;
    });

    const onDelta = jest.fn();
    const result = await service.execute({
      prompt: { metadata: { provider: 'openai', model: 'gpt-5.5' } } as never,
      context: {
        healthContext: { fatigueLevel: 'LOW', recoveryTrend: 'stable' },
      } as never,
      message: 'Should I train today?',
      options: { onDelta, streaming: true },
    });

    expect(aiLlmService.streamReply).toHaveBeenCalled();
    expect(onDelta).toHaveBeenCalledWith('Hel');
    expect(onDelta).toHaveBeenCalledWith('lo');
    expect(result.source).toBe('llm');
    expect(result.content).toBe('Hello');
  });

  it('falls back deterministically when the LLM is disabled', async () => {
    aiLlmService.generateReply.mockResolvedValue(null);

    const result = await service.execute({
      prompt: { metadata: { provider: 'openai', model: 'gpt-5.5' } } as never,
      context: {
        healthContext: { fatigueLevel: 'LOW', recoveryTrend: 'stable' },
      } as never,
      message: 'Should I train today?',
    });

    expect(replyGenerator.generate).toHaveBeenCalled();
    expect(result).toEqual({
      content: 'Deterministic fallback reply',
      source: 'heuristic',
    });
  });

  it('falls back deterministically when the synchronous LLM path throws', async () => {
    aiLlmService.generateReply.mockRejectedValue(new Error('provider failed'));

    const result = await service.execute({
      prompt: { metadata: { provider: 'openai', model: 'gpt-5.5' } } as never,
      context: {
        healthContext: { fatigueLevel: 'LOW', recoveryTrend: 'stable' },
      } as never,
      message: 'Should I train today?',
    });

    expect(replyGenerator.generate).toHaveBeenCalled();
    expect(result).toEqual({
      content: 'Deterministic fallback reply',
      source: 'heuristic',
    });
  });

  it('falls back deterministically when streaming fails before a delta is emitted', async () => {
    aiLlmService.canStream.mockReturnValue(true);
    aiLlmService.streamReply.mockRejectedValue(new Error('stream failed'));

    const onDelta = jest.fn();
    const result = await service.execute({
      prompt: { metadata: { provider: 'openai', model: 'gpt-5.5' } } as never,
      context: {
        healthContext: { fatigueLevel: 'LOW', recoveryTrend: 'stable' },
      } as never,
      message: 'Should I train today?',
      options: { onDelta, streaming: true },
    });

    expect(replyGenerator.generate).toHaveBeenCalled();
    expect(onDelta).toHaveBeenCalledWith('Deterministic fallback reply');
    expect(result).toEqual({
      content: 'Deterministic fallback reply',
      source: 'heuristic',
    });
  });
});
