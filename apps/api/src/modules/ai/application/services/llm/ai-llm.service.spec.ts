import { AiLlmConfigService } from './ai-llm-config.service';
import { AiLlmPrompt } from './ai-llm.types';
import { AiLlmReliabilityService } from './ai-llm-reliability.service';
import { AiLlmService } from './ai-llm.service';
import { AiLlmObservabilityService } from '../observability/ai-llm-observability.service';
import { AiSafetyService } from '../safety/ai-safety.service';

describe('AiLlmService', () => {
  it('returns null when LLM is disabled', async () => {
    const reliabilityService = mockReliabilityService();
    const safetyService = mockSafetyService();
    const observabilityService = mockObservabilityService();
    const config = mockConfig({
      enabled: false,
    });
    const service = new AiLlmService(
      reliabilityService,
      safetyService,
      observabilityService,
      config,
    );

    const result = await service.generateReply(mockPrompt());

    expect(result).toBeNull();
    expect(reliabilityService.generateReply).not.toHaveBeenCalled();
    expect(observabilityService.recordRequest).not.toHaveBeenCalled();
  });

  it('returns null when streaming is disabled', async () => {
    const reliabilityService = mockReliabilityService();
    const safetyService = mockSafetyService();
    const observabilityService = mockObservabilityService();
    const config = mockConfig({
      enabled: true,
      provider: 'openai',
      streamingEnabled: false,
    });
    const service = new AiLlmService(
      reliabilityService,
      safetyService,
      observabilityService,
      config,
    );

    const result = await service.streamReply(mockPrompt());

    expect(result).toBeNull();
    expect(reliabilityService.streamReply).not.toHaveBeenCalled();
  });

  it('delegates to the reliability layer when enabled', async () => {
    const reliabilityService = mockReliabilityService({
      generateReply: jest.fn().mockResolvedValue({
        content: 'Keep it light today.',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        promptVersion: 'coach-chat-prompt-v1',
      }),
    });
    const safetyService = mockSafetyService();
    const observabilityService = mockObservabilityService();
    const config = mockConfig({
      enabled: true,
      provider: 'openai',
    });
    const service = new AiLlmService(
      reliabilityService,
      safetyService,
      observabilityService,
      config,
    );

    const result = await service.generateReply(mockPrompt());

    expect(reliabilityService.generateReply).toHaveBeenCalledWith(
      expect.objectContaining({
        promptVersion: 'coach-chat-prompt-v1',
      }),
    );
    expect(result).toEqual({
      content: 'Keep it light today.',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    expect(observabilityService.recordRequest).toHaveBeenCalled();
  });

  it('delegates to the streaming reliability layer when streaming is enabled', async () => {
    const reliabilityService = mockReliabilityService({
      streamReply: jest.fn().mockResolvedValue({
        content: 'Keep it light today.',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        promptVersion: 'coach-chat-prompt-v1',
      }),
    });
    const safetyService = mockSafetyService();
    const observabilityService = mockObservabilityService();
    const config = mockConfig({
      enabled: true,
      provider: 'openai',
      streamingEnabled: true,
    });
    const service = new AiLlmService(
      reliabilityService,
      safetyService,
      observabilityService,
      config,
    );

    const result = await service.streamReply(mockPrompt());

    expect(reliabilityService.streamReply).toHaveBeenCalled();
    expect(result).toEqual({
      content: 'Keep it light today.',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
  });

  it('returns null when the reliability layer fails', async () => {
    const reliabilityService = mockReliabilityService({
      generateReply: jest.fn().mockRejectedValue(new Error('OpenAI is down')),
    });
    const safetyService = mockSafetyService();
    const observabilityService = mockObservabilityService();
    const config = mockConfig({
      enabled: true,
      provider: 'openai',
    });
    const service = new AiLlmService(
      reliabilityService,
      safetyService,
      observabilityService,
      config,
    );

    await expect(service.generateReply(mockPrompt())).resolves.toBeNull();
  });

  it('returns null when the safety layer blocks the prompt', async () => {
    const reliabilityService = mockReliabilityService();
    const safetyService = mockSafetyService({
      preparePrompt: jest.fn().mockReturnValue({
        prompt: {
          ...mockPrompt(),
          trace: {
            requestId: 'request-1',
            conversationId: 'conversation-1',
            userIdHash: 'user-hash-1',
          },
        },
        metadata: {
          promptVersion: 'coach-chat-prompt-v1',
          safetyVersion: 'ai-safety-v1',
          contextVersion: 'user-health-context-v1',
          provider: 'openai',
          model: 'gpt-4.1-mini',
          timestamp: '2026-04-30T10:00:00.000Z',
          promptSizeChars: 42,
          contextSizeChars: 16,
          riskLevel: 'HIGH',
          classification: 'BLOCKED',
          redactionCount: 0,
          removedMessageCount: 0,
        },
        blocked: true,
        assessment: {
          riskLevel: 'HIGH',
          riskScore: 9,
          triggers: ['ignore_previous_instructions'],
        },
      }),
    });
    const config = mockConfig({
      enabled: true,
      provider: 'openai',
    });
    const observabilityService = mockObservabilityService();
    const service = new AiLlmService(
      reliabilityService,
      safetyService,
      observabilityService,
      config,
    );

    await expect(service.generateReply(mockPrompt())).resolves.toBeNull();
    expect(reliabilityService.generateReply).not.toHaveBeenCalled();
    expect(observabilityService.recordSafetyBlock).toHaveBeenCalled();
    expect(observabilityService.recordFallback).toHaveBeenCalled();
  });
});

function mockReliabilityService(
  overrides: Partial<AiLlmReliabilityService> = {},
): jest.Mocked<AiLlmReliabilityService> {
  return {
    generateReply: jest.fn(),
    streamReply: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AiLlmReliabilityService>;
}

function mockSafetyService(
  overrides: Partial<AiSafetyService> = {},
): jest.Mocked<AiSafetyService> {
  return {
    preparePrompt: jest.fn().mockReturnValue({
      prompt: mockPrompt(),
      metadata: {
        promptVersion: 'coach-chat-prompt-v1',
        safetyVersion: 'ai-safety-v1',
        contextVersion: 'user-health-context-v1',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        timestamp: '2026-04-30T10:00:00.000Z',
        promptSizeChars: 42,
        contextSizeChars: 16,
        riskLevel: 'SAFE',
        classification: 'SAFE',
        redactionCount: 0,
        removedMessageCount: 0,
      },
      blocked: false,
      assessment: {
        riskLevel: 'SAFE',
        riskScore: 0,
        triggers: [],
      },
    }),
    validateOutput: jest.fn().mockReturnValue({
      allowed: true,
      classification: 'SAFE',
    }),
    ...overrides,
  } as unknown as jest.Mocked<AiSafetyService>;
}

function mockObservabilityService(
  overrides: Partial<AiLlmObservabilityService> = {},
): jest.Mocked<AiLlmObservabilityService> {
  return {
    recordRequest: jest.fn(),
    recordSafetyBlock: jest.fn(),
    recordFallback: jest.fn(),
    observeAttempt: jest.fn(),
    recordRetry: jest.fn(),
    recordCircuitOpen: jest.fn(),
    snapshotUsageReport: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AiLlmObservabilityService>;
}

function mockConfig(
  overrides: Partial<{
    enabled: boolean;
    provider: string;
    streamingEnabled: boolean;
  }> = {},
): AiLlmConfigService {
  return {
    isEnabled: jest.fn().mockReturnValue(overrides.enabled ?? true),
    getProvider: jest.fn().mockReturnValue(overrides.provider ?? 'openai'),
    getModel: jest.fn().mockReturnValue('gpt-4.1-mini'),
    getApiKey: jest.fn().mockReturnValue('test-openai-key'),
    getTimeoutMs: jest.fn().mockReturnValue(15000),
    getMaxRetries: jest.fn().mockReturnValue(2),
    getCircuitThreshold: jest.fn().mockReturnValue(5),
    getCircuitResetMs: jest.fn().mockReturnValue(60000),
    getMaxResponseChars: jest.fn().mockReturnValue(4000),
    getObservabilityMaxTraces: jest.fn().mockReturnValue(1000),
    getObservabilityMaxReports: jest.fn().mockReturnValue(32),
    getObservabilityRetentionMs: jest.fn().mockReturnValue(86400000),
    isStreamingEnabled: jest
      .fn()
      .mockReturnValue(overrides.streamingEnabled ?? false),
  } as unknown as AiLlmConfigService;
}

function mockPrompt(): AiLlmPrompt {
  return {
    promptVersion: 'coach-chat-prompt-v1',
    messages: [{ role: 'user', content: 'Should I train today?' }],
  };
}
