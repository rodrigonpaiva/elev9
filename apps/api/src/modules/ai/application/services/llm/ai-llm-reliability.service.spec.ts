import { AiLlmConfigService } from './ai-llm-config.service';
import {
  LLMAuthenticationError,
  LLMConfigurationError,
  LLMTimeoutError,
  LLMUnavailableError,
} from './ai-llm.errors';
import { AiLlmProvider } from './ai-llm.types';
import { AiLlmReliabilityService } from './ai-llm-reliability.service';
import { AiLlmObservabilityService } from '../observability/ai-llm-observability.service';

describe('AiLlmReliabilityService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('aborts and raises a timeout error when the request exceeds the configured timeout', async () => {
    const provider = mockProvider({
      generateReply: jest.fn((_input) => {
        return new Promise((_: never, reject) => {
          _input.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        });
      }),
    });
    const service = createService(provider, {
      timeoutMs: 50,
      maxRetries: 0,
    });

    const promise = service.generateReply(mockPrompt());
    const assertion = expect(promise).rejects.toBeInstanceOf(LLMTimeoutError);

    await jest.advanceTimersByTimeAsync(50);

    await assertion;
    expect(provider.generateReply).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures and succeeds on a later attempt', async () => {
    const provider = mockProvider({
      generateReply: jest
        .fn()
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce({
          content: 'Keep it light today.',
        }),
    });
    const observability = mockObservability();
    const service = createService(
      provider,
      {
        maxRetries: 2,
      },
      observability,
    );

    const promise = service.generateReply(mockPrompt());
    const assertion = expect(promise).resolves.toEqual({
      content: 'Keep it light today.',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });

    await jest.advanceTimersByTimeAsync(250);

    await assertion;
    expect(provider.generateReply).toHaveBeenCalledTimes(2);
    expect(observability.recordRetry).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries and raises an unavailable error for repeated transient failures', async () => {
    const provider = mockProvider({
      generateReply: jest.fn().mockRejectedValue(networkError()),
    });
    const service = createService(provider, {
      maxRetries: 1,
    });

    const promise = service.generateReply(mockPrompt());
    const assertion =
      expect(promise).rejects.toBeInstanceOf(LLMUnavailableError);

    await jest.advanceTimersByTimeAsync(250);

    await assertion;
    expect(provider.generateReply).toHaveBeenCalledTimes(2);
  });

  it('opens the circuit after repeated failures and skips OpenAI while open', async () => {
    const provider = mockProvider({
      generateReply: jest.fn().mockRejectedValue(networkError()),
    });
    const observability = mockObservability();
    const service = createService(
      provider,
      {
        maxRetries: 0,
        circuitThreshold: 2,
        circuitResetMs: 1000,
      },
      observability,
    );

    await expect(service.generateReply(mockPrompt())).rejects.toBeInstanceOf(
      LLMUnavailableError,
    );
    await expect(service.generateReply(mockPrompt())).rejects.toBeInstanceOf(
      LLMUnavailableError,
    );

    await expect(service.generateReply(mockPrompt())).resolves.toBeNull();
    expect(provider.generateReply).toHaveBeenCalledTimes(2);
    expect(observability.recordCircuitOpen).toHaveBeenCalled();
  });

  it('allows a half-open probe after the circuit reset window and closes on success', async () => {
    const provider = mockProvider({
      generateReply: jest
        .fn()
        .mockRejectedValueOnce(networkError())
        .mockRejectedValueOnce(networkError())
        .mockResolvedValue({
          content: 'Reset successful.',
        }),
    });
    const service = createService(provider, {
      maxRetries: 0,
      circuitThreshold: 2,
      circuitResetMs: 1000,
    });

    await expect(service.generateReply(mockPrompt())).rejects.toBeInstanceOf(
      LLMUnavailableError,
    );
    await expect(service.generateReply(mockPrompt())).rejects.toBeInstanceOf(
      LLMUnavailableError,
    );

    await jest.advanceTimersByTimeAsync(1000);

    await expect(service.generateReply(mockPrompt())).resolves.toEqual({
      content: 'Reset successful.',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });

    await expect(service.generateReply(mockPrompt())).resolves.toEqual({
      content: 'Reset successful.',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    expect(provider.generateReply).toHaveBeenCalledTimes(4);
  });

  it('maps authentication errors without retrying', async () => {
    const provider = mockProvider({
      generateReply: jest.fn().mockRejectedValue(apiError({ status: 401 })),
    });
    const service = createService(provider);

    await expect(service.generateReply(mockPrompt())).rejects.toBeInstanceOf(
      LLMAuthenticationError,
    );
    expect(provider.generateReply).toHaveBeenCalledTimes(1);
  });

  it('maps invalid request errors without retrying', async () => {
    const provider = mockProvider({
      generateReply: jest.fn().mockRejectedValue(apiError({ status: 400 })),
    });
    const service = createService(provider);

    await expect(service.generateReply(mockPrompt())).rejects.toBeInstanceOf(
      LLMConfigurationError,
    );
    expect(provider.generateReply).toHaveBeenCalledTimes(1);
  });

  it('streams a reply and forwards deltas before completion', async () => {
    const provider = mockProvider({
      streamReply: jest.fn().mockImplementation(async (input) => {
        input.onDelta?.('Keep it light today.');

        return {
          content: 'Keep it light today.',
        };
      }),
    });
    const observability = mockObservability();
    const service = createService(
      provider,
      {
        streamingEnabled: true,
      },
      observability,
    );
    const onDelta = jest.fn();

    const result = await service.streamReply(mockPrompt(), onDelta);

    expect(onDelta).toHaveBeenCalledWith('Keep it light today.');
    expect(result).toEqual({
      content: 'Keep it light today.',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });
    expect(observability.recordStreamOpened).toHaveBeenCalled();
    expect(observability.recordStreamCompleted).toHaveBeenCalled();
  });

  it('cancels a stream when the request signal is aborted', async () => {
    const provider = mockProvider({
      streamReply: jest.fn().mockImplementation(async (input) => {
        if (input.signal?.aborted) {
          throw new Error('aborted');
        }

        return {
          content: 'Should not complete.',
        };
      }),
    });
    const observability = mockObservability();
    const service = createService(
      provider,
      {
        streamingEnabled: true,
      },
      observability,
    );
    const controller = new AbortController();
    controller.abort();

    await expect(
      service.streamReply({
        ...mockPrompt(),
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      code: 'LLM_CANCELLED',
    });
    expect(observability.recordStreamCancelled).toHaveBeenCalled();
  });

  it('times out a streaming request when the configured timeout is exceeded', async () => {
    const provider = mockProvider({
      streamReply: jest.fn((_input) => {
        return new Promise((_: never, reject) => {
          _input.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        });
      }),
    });
    const service = createService(provider, {
      timeoutMs: 50,
      maxRetries: 0,
      streamingEnabled: true,
    });

    const promise = service.streamReply(mockPrompt());
    const assertion = expect(promise).rejects.toMatchObject({
      code: 'LLM_TIMEOUT',
    });

    await jest.advanceTimersByTimeAsync(50);

    await assertion;
    expect(provider.streamReply).toHaveBeenCalledTimes(1);
  });

  it('retries a transient streaming failure before succeeding', async () => {
    const provider = mockProvider({
      streamReply: jest
        .fn()
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce({
          content: 'Keep it light today.',
        }),
    });
    const observability = mockObservability();
    const service = createService(
      provider,
      {
        maxRetries: 2,
        streamingEnabled: true,
      },
      observability,
    );
    const onDelta = jest.fn();

    const promise = service.streamReply(mockPrompt(), onDelta);
    const assertion = expect(promise).resolves.toEqual({
      content: 'Keep it light today.',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    });

    await jest.advanceTimersByTimeAsync(250);

    await assertion;
    expect(provider.streamReply).toHaveBeenCalledTimes(2);
    expect(observability.recordRetry).toHaveBeenCalledTimes(1);
  });
});

describe('AiLlmConfigService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }

    Object.assign(process.env, originalEnv);
  });

  it('rejects invalid timeout configuration', () => {
    process.env.AI_LLM_TIMEOUT_MS = '-1';

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });

  it('rejects invalid retry configuration', () => {
    process.env.AI_LLM_MAX_RETRIES = '-1';

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });

  it('rejects invalid circuit breaker configuration', () => {
    process.env.AI_LLM_CIRCUIT_THRESHOLD = '0';

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });

  it('rejects unsupported model configuration', () => {
    process.env.OPENAI_MODEL = 'foo-model';

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });

  it('rejects invalid observability trace retention configuration', () => {
    process.env.AI_LLM_OBSERVABILITY_MAX_TRACES = '0';

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });

  it('rejects invalid observability report retention configuration', () => {
    process.env.AI_LLM_OBSERVABILITY_MAX_REPORTS = '-1';

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });

  it('rejects invalid observability ttl configuration', () => {
    process.env.AI_LLM_OBSERVABILITY_RETENTION_MS = '0';

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });

  it('rejects missing api key when enabled', () => {
    process.env.AI_LLM_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    expect(() => new AiLlmConfigService()).toThrow(LLMConfigurationError);
  });
});

function createService(
  provider: jest.Mocked<AiLlmProvider>,
  overrides: Partial<{
    enabled: boolean;
    providerName: string;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    circuitThreshold: number;
    circuitResetMs: number;
  }> = {},
  observability: jest.Mocked<AiLlmObservabilityService> = mockObservability(),
): AiLlmReliabilityService {
  return new AiLlmReliabilityService(
    provider,
    mockConfig(overrides),
    observability,
  );
}

function mockProvider(
  overrides: Partial<AiLlmProvider> = {},
): jest.Mocked<AiLlmProvider> {
  return {
    generateReply: jest.fn(),
    streamReply: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AiLlmProvider>;
}

function mockObservability(): jest.Mocked<AiLlmObservabilityService> {
  return {
    recordRequest: jest.fn(),
    observeAttempt: jest.fn((_, executor) => executor()),
    recordRetry: jest.fn(),
    recordFallback: jest.fn(),
    recordSafetyBlock: jest.fn(),
    recordCircuitOpen: jest.fn(),
    recordStreamOpened: jest.fn(),
    recordStreamCompleted: jest.fn(),
    recordStreamInterrupted: jest.fn(),
    recordStreamCancelled: jest.fn(),
    snapshotUsageReport: jest.fn(),
  } as unknown as jest.Mocked<AiLlmObservabilityService>;
}

function mockConfig(
  overrides: Partial<{
    enabled: boolean;
    providerName: string;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    circuitThreshold: number;
    circuitResetMs: number;
    streamingEnabled: boolean;
  }> = {},
): AiLlmConfigService {
  return {
    isEnabled: jest.fn().mockReturnValue(overrides.enabled ?? true),
    getProvider: jest.fn().mockReturnValue(overrides.providerName ?? 'openai'),
    getModel: jest.fn().mockReturnValue(overrides.model ?? 'gpt-4.1-mini'),
    getTimeoutMs: jest.fn().mockReturnValue(overrides.timeoutMs ?? 15000),
    getMaxRetries: jest.fn().mockReturnValue(overrides.maxRetries ?? 2),
    getCircuitThreshold: jest
      .fn()
      .mockReturnValue(overrides.circuitThreshold ?? 5),
    getCircuitResetMs: jest
      .fn()
      .mockReturnValue(overrides.circuitResetMs ?? 60000),
    getObservabilityMaxTraces: jest.fn().mockReturnValue(1000),
    getObservabilityMaxReports: jest.fn().mockReturnValue(32),
    getObservabilityRetentionMs: jest.fn().mockReturnValue(86400000),
    isStreamingEnabled: jest
      .fn()
      .mockReturnValue(overrides.streamingEnabled ?? false),
    getApiKey: jest.fn().mockReturnValue('test-openai-key'),
    getMaxResponseChars: jest.fn().mockReturnValue(4000),
    getInputCostPer1k: jest.fn().mockReturnValue(undefined),
    getOutputCostPer1k: jest.fn().mockReturnValue(undefined),
    getMaxPromptTokens: jest.fn().mockReturnValue(undefined),
    getMaxCompletionTokens: jest.fn().mockReturnValue(undefined),
    getMaxRequestCost: jest.fn().mockReturnValue(undefined),
  } as unknown as AiLlmConfigService;
}

function mockPrompt(): Parameters<AiLlmReliabilityService['generateReply']>[0] {
  return {
    promptVersion: 'coach-chat-prompt-v1',
    messages: [{ role: 'user', content: 'Should I train today?' }],
    trace: {
      requestId: 'request-1',
      conversationId: 'conversation-1',
      userIdHash: 'user-hash-1',
    },
    metadata: {
      safetyVersion: 'ai-safety-v1',
      contextVersion: 'user-health-context-v1',
      timestamp: '2026-04-30T10:00:00.000Z',
    },
  };
}

function networkError(): Error {
  return Object.assign(new Error('network down'), {
    code: 'ECONNRESET',
  });
}

function apiError(overrides: Record<string, unknown>): Error {
  return Object.assign(new Error('api error'), overrides);
}
