import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentToolRegistryService } from '../tools/agent-tool-registry.service';
import { AiLlmConfigService } from '../../llm/ai-llm-config.service';
import { AgentPolicyEngineService } from './agent-policy.engine.service';
import { AgentPolicyRegistry } from './agent-policy.registry';
import { CoachExpertRegistry } from '../../experts/coach-expert.registry';

describe('AgentPolicyEngineService', () => {
  let service: AgentPolicyEngineService;

  beforeEach(() => {
    service = new AgentPolicyEngineService(
      new AgentPolicyRegistry(),
      {
        getMaxSteps: jest.fn().mockReturnValue(6),
        getMaxToolCalls: jest.fn().mockReturnValue(4),
        getToolTimeoutMs: jest.fn().mockReturnValue(3000),
      } as unknown as AgentRuntimeConfigService,
      {
        isEnabled: jest.fn().mockReturnValue(true),
        getProvider: jest.fn().mockReturnValue('openai'),
        getApiKey: jest.fn().mockReturnValue('test-api-key'),
      } as unknown as AiLlmConfigService,
      new AgentToolRegistryService(),
    );
  });

  it('authorizes context domains for training and filters nutrition unless explicitly requested', () => {
    const expertRegistry = new CoachExpertRegistry();
    const evaluation = service.evaluate({
      stage: 'CONTEXT',
      request: buildRequest('Should I train today?'),
      intent: 'TRAINING',
      selectedDomains: [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
        'training',
        'recovery',
        'goals',
        'progress',
        'nutrition',
      ],
      candidateExperts: expertRegistry
        .getExpertsForIntent('TRAINING')
        .map((expert) => expert.metadata),
      selectedExperts: expertRegistry
        .getExpertsForDomains([
          'user_profile',
          'conversation_memory',
          'recent_messages',
          'coach_decision',
          'training',
          'recovery',
          'goals',
          'progress',
        ])
        .map((expert) => expert.metadata),
      responseMode: 'standard',
      runtimeEnabled: true,
      toolsEnabled: true,
      llmEnabled: true,
    });

    expect(evaluation.decision.allowedDomains).toEqual([
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
      'training',
      'recovery',
      'goals',
      'progress',
    ]);
    expect(evaluation.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          policyId: 'context-authorization',
          category: 'CONTEXT',
          severity: 'WARN',
        }),
      ]),
    );
    expect(evaluation.decision.fallbackRequired).toBe(false);
    expect(
      evaluation.decision.allowedExperts.map((expert) => expert.id),
    ).toContain('WorkoutExpert');
  });

  it('authorizes only read-only tools and blocks unsupported write tools', () => {
    const registry = new AgentToolRegistryService();
    const trainingTool = registry.getTool('TrainingTool');
    const futureWriteTool = {
      id: 'FutureWriteTool',
      displayName: 'Future Write Tool',
      description: 'Write tool placeholder',
      category: 'SYSTEM',
      supportedIntents: ['TRAINING' as const],
      supportedContextDomains: ['training' as const],
      estimatedCost: 1,
      estimatedLatencyMs: 1,
      enabled: true,
      version: '1.0.0',
      metadata: {
        capabilities: ['SYSTEM_GUARDRAILS' as const],
      },
    } as const;

    const evaluation = service.evaluate({
      stage: 'PLANNING',
      request: buildRequest('Should I train today?'),
      intent: 'TRAINING',
      selectedDomains: [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
        'training',
        'recovery',
        'goals',
        'progress',
      ],
      candidateTools: [trainingTool!, futureWriteTool as any],
      selectedTools: [trainingTool!, futureWriteTool as any],
      responseMode: 'standard',
      runtimeEnabled: true,
      toolsEnabled: true,
      llmEnabled: true,
      plan: {
        maximumExecutionDepth: 4,
      } as any,
    });

    expect(evaluation.decision.allowedTools.map((tool) => tool.id)).toEqual([
      'TrainingTool',
    ]);
    expect(evaluation.decision.metadata.blockedToolIds).toContain(
      'FutureWriteTool',
    );
  });

  it('requires deterministic fallback when llm is disabled or safety forbids fallback', () => {
    const llmDisabled = service.evaluate({
      stage: 'EXECUTION',
      request: buildRequest('Should I train today?'),
      intent: 'TRAINING',
      selectedDomains: ['user_profile', 'training'],
      responseMode: 'standard',
      runtimeEnabled: true,
      toolsEnabled: true,
      llmEnabled: false,
    });

    const safetyBlocked = service.evaluate({
      stage: 'EXECUTION',
      request: buildRequest('Should I train today?'),
      intent: 'TRAINING',
      selectedDomains: ['user_profile', 'training'],
      responseMode: 'standard',
      runtimeEnabled: true,
      toolsEnabled: true,
      llmEnabled: true,
      safetyMetadata: {
        deterministicFirst: false,
        toolCallingEnabled: false,
        fallbackAllowed: false,
        promptVersion: 'coach-chat-prompt-v1',
      },
    });

    expect(llmDisabled.decision.allowedLLM).toBe(false);
    expect(llmDisabled.decision.fallbackRequired).toBe(true);
    expect(safetyBlocked.decision.fallbackRequired).toBe(true);
    expect(safetyBlocked.violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          policyId: 'llm-authorization',
          category: 'LLM',
        }),
      ]),
    );
  });

  it('approves a normal request with allowed llm and non-empty authorized domains', () => {
    const evaluation = service.evaluate({
      stage: 'PLANNING',
      request: buildRequest('Hey coach'),
      intent: 'GENERAL_CHAT',
      selectedDomains: [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
      ],
      responseMode: 'standard',
      runtimeEnabled: true,
      toolsEnabled: true,
      llmEnabled: true,
    });

    expect(evaluation.decision.approved).toBe(true);
    expect(evaluation.decision.blocked).toBe(false);
    expect(evaluation.decision.allowedLLM).toBe(true);
    expect(evaluation.reason).toContain('Policy approved the request');
  });
});

function buildRequest(message: string) {
  return {
    userId: 'profile_123',
    conversationId: 'conversation_123',
    userMessage: message,
    sessionMetadata: {
      requestId: 'request_123',
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      conversationId: 'conversation_123',
      userIdHash: 'user-hash-123',
    },
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: false,
    experimentMetadata: {
      experimentId: 'coach-chat-evaluation-rollout',
      promptId: 'coach-chat',
      currentPromptVersion: 'coach-chat-prompt-v1',
      previousPromptVersion: 'coach-chat-prompt-v0',
      selectedPromptVersion: 'coach-chat-prompt-v1',
      currentProvider: 'openai',
      previousProvider: 'openai',
      selectedProvider: 'openai',
      currentModel: 'gpt-4.1-mini',
      previousModel: 'gpt-4.1-mini',
      selectedModel: 'gpt-4.1-mini',
      canaryBucket: 12,
      canaryPercentage: 100,
      streamingEnabled: false,
      structuredOutputsEnabled: true,
      toolCallingEnabled: false,
      futureMemoryEnabled: false,
      rolloutVariant: 'current',
    },
  } as const;
}
