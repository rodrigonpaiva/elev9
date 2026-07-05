import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { AiPromptRegistryService } from './ai-prompt-registry.service';
import { AiRolloutService } from './ai-rollout.service';

describe('AiRolloutService', () => {
  it('assigns the current version when the user bucket is inside the canary percentage', () => {
    const service = new AiRolloutService(
      mockConfig({
        canaryPercentage: 100,
      }),
      mockPromptRegistry(),
    );

    const assignment = service.resolveCoachChatAssignment({
      userIdHash: 'user-hash-1',
    });

    expect(assignment.rolloutVariant).toBe('current');
    expect(assignment.selectedProvider).toBe('openai');
    expect(assignment.selectedModel).toBe('gpt-5.5');
    expect(assignment.selectedPromptVersion).toBe('coach-chat-prompt-v1');
    expect(assignment.canaryBucket).toBeGreaterThanOrEqual(0);
    expect(assignment.canaryBucket).toBeLessThan(100);
  });

  it('routes to the previous version when the canary percentage is zero', () => {
    const service = new AiRolloutService(
      mockConfig({
        canaryPercentage: 0,
        previousProvider: 'openai',
        previousModel: 'gpt-4.1-mini',
      }),
      mockPromptRegistry(),
    );

    const assignment = service.resolveCoachChatAssignment({
      userIdHash: 'user-hash-1',
    });

    expect(assignment.rolloutVariant).toBe('previous');
    expect(assignment.selectedProvider).toBe('openai');
    expect(assignment.selectedModel).toBe('gpt-4.1-mini');
    expect(assignment.selectedPromptVersion).toBe('coach-chat-prompt-v0');
  });

  it('assigns the same rollout bucket for the same user hash', () => {
    const service = new AiRolloutService(mockConfig(), mockPromptRegistry());

    const first = service.resolveCoachChatAssignment({
      userIdHash: 'stable-user-hash',
    });
    const second = service.resolveCoachChatAssignment({
      userIdHash: 'stable-user-hash',
    });

    expect(first.canaryBucket).toBe(second.canaryBucket);
  });
});

function mockConfig(
  overrides: Partial<{
    canaryPercentage: number;
    previousProvider: string;
    previousModel: string;
  }> = {},
): AiLlmConfigService {
  return {
    getExperimentId: jest.fn().mockReturnValue('coach-chat-evaluation-rollout'),
    getPromptVersion: jest.fn().mockReturnValue('coach-chat-prompt-v1'),
    getPreviousPromptVersion: jest.fn().mockReturnValue('coach-chat-prompt-v0'),
    getProvider: jest.fn().mockReturnValue('openai'),
    getPreviousProvider: jest
      .fn()
      .mockReturnValue(overrides.previousProvider ?? 'openai'),
    getModel: jest.fn().mockReturnValue('gpt-5.5'),
    getPreviousModel: jest
      .fn()
      .mockReturnValue(overrides.previousModel ?? 'gpt-4.1-mini'),
    getCanaryPercentage: jest
      .fn()
      .mockReturnValue(overrides.canaryPercentage ?? 100),
    isStreamingEnabled: jest.fn().mockReturnValue(false),
    isStructuredOutputsEnabled: jest.fn().mockReturnValue(true),
    isToolCallingEnabled: jest.fn().mockReturnValue(false),
    isFutureMemoryEnabled: jest.fn().mockReturnValue(false),
  } as unknown as AiLlmConfigService;
}

function mockPromptRegistry(): AiPromptRegistryService {
  return {
    getCurrentVersion: jest.fn().mockReturnValue('coach-chat-prompt-v1'),
    getPreviousVersion: jest.fn().mockReturnValue('coach-chat-prompt-v0'),
    getVersionMetadata: jest.fn().mockImplementation((_promptId, version) => ({
      promptId: 'coach-chat',
      version: version ?? 'coach-chat-prompt-v1',
      releaseDate: '2026-06-29T00:00:00.000Z',
      status: version === 'coach-chat-prompt-v0' ? 'previous' : 'active',
      author: 'Elev9 Platform',
      description: 'Adaptive coach chat prompt.',
    })),
  } as unknown as AiPromptRegistryService;
}
