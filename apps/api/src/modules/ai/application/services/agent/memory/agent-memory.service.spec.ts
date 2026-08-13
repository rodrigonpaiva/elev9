import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentMemoryPolicy } from './agent-memory.policy';
import { AgentMemoryService } from './agent-memory.service';
import type {
  AgentConversationMemory,
  AgentMemoryExecutionInput,
  WorkingMemory,
} from './agent-memory.types';
import type { CoachConversationMemoryRepository } from '../../../../../domain/repositories/coach-conversation-memory.repository';
import type { AgentPlan } from '../agent.types';
import type { AgentToolDescriptor } from '../tools/agent-tool.types';
import type { AgentToolExecutionMetrics } from '../tools/agent-tool-execution.types';
import { CoachExpertRegistry } from '../../experts/coach-expert.registry';
import { CoachExpertRoutingPolicy } from '../../experts/coach-expert-router';
import { CoachExpertRouterService } from '../../experts/coach-expert-router';

describe('AgentMemoryService', () => {
  let config: jest.Mocked<
    Pick<
      AgentRuntimeConfigService,
      'getSessionMemoryMaxItems' | 'getSessionMemoryTtlMs'
    >
  >;
  let repository: jest.Mocked<CoachConversationMemoryRepository>;
  let service: AgentMemoryService;

  beforeEach(() => {
    config = {
      getSessionMemoryMaxItems: jest.fn().mockReturnValue(3),
      getSessionMemoryTtlMs: jest.fn().mockReturnValue(1000),
    };
    repository = {
      findByConversationId: jest.fn(),
      upsertByConversationId: jest.fn(),
    } as unknown as jest.Mocked<CoachConversationMemoryRepository>;
    service = new AgentMemoryService(
      new AgentMemoryPolicy(config as unknown as AgentRuntimeConfigService),
      repository,
    );
  });

  it('creates immutable working memory and clears it after completion', async () => {
    const request = buildAgentRequest();
    const now = new Date('2026-05-18T10:00:00.000Z');

    service.loadSessionMemory(request.conversationId, now);
    const workingMemory = service.createWorkingMemory(
      {
        request,
        intent: 'TRAINING',
        selectedDomains: ['training'],
        selectedTools: [],
        toolResults: [],
      } satisfies AgentMemoryExecutionInput,
      now,
    );

    expect(Object.isFrozen(workingMemory)).toBe(true);
    expect(Object.isFrozen(workingMemory.request)).toBe(true);
    expect(workingMemory.request).not.toHaveProperty('signal');
    expect(workingMemory.request).not.toHaveProperty('onDelta');

    service.clearWorkingMemory(request.sessionMetadata.requestId, now);

    expect(() =>
      service.createSnapshot(
        {
          requestId: request.sessionMetadata.requestId,
          conversationId: request.conversationId,
        },
        now,
      ),
    ).toThrow('Working memory not found.');
  });

  it('enforces session TTL and max-item bounds', () => {
    const conversationId = 'conversation_123';
    const firstLoadAt = new Date('2026-05-18T10:00:00.000Z');
    const refreshedAt = new Date('2026-05-18T10:00:01.500Z');

    const sessionMemory = service.loadSessionMemory(
      conversationId,
      firstLoadAt,
    );
    expect(sessionMemory.entries).toHaveLength(0);
    expect(sessionMemory.expiresAt).toBe(
      new Date(firstLoadAt.getTime() + 1000).toISOString(),
    );

    const updatedSession = service.updateSessionMemory(
      {
        conversationId,
        goal: 'gain_muscle',
        coachDecision: {
          priority: 'training',
          headline: 'Train today',
          summary: 'You are ready.',
        },
        toolResults: [
          {
            toolId: 'TrainingTool',
            status: 'SUCCESS',
            summary: 'Loaded training context.',
            durationMs: 2,
          },
          {
            toolId: 'RecoveryTool',
            status: 'SUCCESS',
            summary: 'Loaded recovery context.',
            durationMs: 3,
          },
        ],
        executionSummary: 'intent=TRAINING; strategy=MULTI_CONTEXT',
        temporaryPreferences: {
          cadence: 'daily',
        },
      },
      firstLoadAt,
    );

    expect(updatedSession.entries).toHaveLength(3);
    expect(updatedSession.entries.map((entry) => entry.type)).toEqual([
      'recent_tool_result',
      'temporary_preference',
      'recent_execution_summary',
    ]);
    expect(updatedSession.recentExecutionSummaries).toEqual([
      'intent=TRAINING; strategy=MULTI_CONTEXT',
    ]);
    expect(updatedSession.temporaryPreferences).toEqual({ cadence: 'daily' });

    const expiredSession = service.loadSessionMemory(
      conversationId,
      refreshedAt,
    );
    expect(expiredSession.createdAt).not.toBe(sessionMemory.createdAt);
    expect(expiredSession.entries).toHaveLength(0);
  });

  it('wraps persisted conversation memory as a frozen snapshot', async () => {
    repository.findByConversationId.mockResolvedValue(
      buildConversationMemory(),
    );

    const memory = await service.loadConversationMemory({
      conversationId: 'conversation_123',
    });

    expect(repository.findByConversationId).toHaveBeenCalledWith(
      'conversation_123',
    );
    expect(memory).toEqual({
      summary: 'goal=gain_muscle; fatigue=LOW; recovery=improving',
      metadata: {
        generatedFromMessageCount: 12,
        version: 'memory-v1',
      },
    });
    expect(Object.isFrozen(memory)).toBe(true);
  });

  it('creates an immutable snapshot with lifecycle metadata', async () => {
    const request = buildAgentRequest();
    const conversationId = request.conversationId;
    const now = new Date('2026-05-18T10:00:00.000Z');

    service.createWorkingMemory(
      {
        request,
        intent: 'TRAINING',
        selectedDomains: ['training'],
        selectedTools: [buildToolDescriptor('TrainingTool')],
        executionPlan: buildPlan(),
        toolResults: [
          {
            toolId: 'TrainingTool',
            status: 'SUCCESS',
            summary: 'Loaded training context.',
            data: { training: true },
            durationMs: 2,
            metadata: { readOnly: true },
          },
        ],
        runtimeMetadata: {
          enabled: true,
          detectedIntent: 'TRAINING',
          selectedDomains: ['training'],
          selectedToolIds: ['TrainingTool'],
          toolExecutionEnabled: true,
          toolExecutionMetrics: buildToolExecutionMetrics(),
        },
      },
      now,
    );
    service.loadSessionMemory(conversationId, now);
    service.updateSessionMemory(
      {
        conversationId,
        goal: 'gain_muscle',
        coachDecision: {
          priority: 'training',
          headline: 'Train today',
          summary: 'You are ready.',
        },
        toolResults: [
          {
            toolId: 'TrainingTool',
            status: 'SUCCESS',
            summary: 'Loaded training context.',
            durationMs: 2,
          },
        ],
        executionSummary: 'intent=TRAINING; strategy=MULTI_CONTEXT',
      },
      now,
    );
    const conversationMemory: AgentConversationMemory = {
      summary: 'goal=gain_muscle; fatigue=LOW; recovery=improving',
      metadata: {
        generatedFromMessageCount: 12,
        version: 'memory-v1',
      },
    };

    const snapshot = service.createSnapshot(
      {
        requestId: request.sessionMetadata.requestId,
        conversationId,
        conversationMemory,
      },
      now,
    );

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.workingMemory)).toBe(true);
    expect(Object.isFrozen(snapshot.sessionMemory)).toBe(true);
    expect(Object.isFrozen(snapshot.metadata)).toBe(true);
    expect(snapshot.metadata.snapshotCreated).toBe(true);
    expect(snapshot.metadata.expired).toBe(false);
    expect(snapshot.metadata.lifecycleEvents.length).toBeGreaterThan(0);
    expect(snapshot.conversationMemory).toEqual(conversationMemory);

    expect(() => {
      (snapshot.workingMemory as WorkingMemory).intent = 'NUTRITION';
    }).toThrow();
  });
});

function buildAgentRequest() {
  return {
    userId: 'profile_123',
    conversationId: 'conversation_123',
    userMessage: 'Should I train today?',
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
    signal: new AbortController().signal,
    onDelta: jest.fn(),
  } as unknown as AgentMemoryExecutionInput['request'];
}

function buildConversationMemory(): NonNullable<AgentConversationMemory> {
  return {
    summary: 'goal=gain_muscle; fatigue=LOW; recovery=improving',
    metadata: {
      generatedFromMessageCount: 12,
      version: 'memory-v1',
    },
  };
}

function buildToolDescriptor(id: string): AgentToolDescriptor {
  return {
    id,
    displayName: id,
    description: `${id} description`,
    category: 'READ_CONTEXT',
    supportedIntents: ['TRAINING'],
    supportedContextDomains: ['training'],
    estimatedCost: 1,
    estimatedLatencyMs: 5,
    enabled: true,
    version: 'v1',
    metadata: {
      capabilities: ['READ_TRAINING_CONTEXT'],
    },
  };
}

function buildPlan(): AgentPlan {
  const expertRegistry = new CoachExpertRegistry();
  const router = new CoachExpertRouterService(new CoachExpertRoutingPolicy());
  const candidateExperts = expertRegistry
    .getExpertsForIntent('TRAINING')
    .map((expert) => expert.metadata);
  const routingDecision = router.route({
    requestId: 'request_123',
    intent: 'TRAINING',
    selectedDomains: ['training'],
    candidateExperts,
    policyEvaluation: buildPolicyEvaluation(),
    maxExperts: 4,
  });
  const selectedExperts = routingDecision.orderedExperts;

  return {
    intent: 'TRAINING',
    requiredContextDomains: ['training'],
    candidateExperts,
    selectedExperts,
    expertRouting: routingDecision,
    expertPriorities: selectedExperts.map((expert) => ({
      expertId: expert.id,
      priority: expert.priority,
    })),
    expertCapabilities: [
      ...new Set(selectedExperts.flatMap((expert) => expert.capabilities)),
    ],
    responseMode: 'standard',
    safetyConstraints: ['deterministic_first'],
    maxSteps: 6,
    actions: [],
    candidateTools: [buildToolDescriptor('TrainingTool')],
    selectedTools: [buildToolDescriptor('TrainingTool')],
    executionStrategy: 'MULTI_CONTEXT',
    planningSteps: [],
    maximumExecutionDepth: 4,
    expectedCost: 1,
    expectedLatencyMs: 5,
    validation: {
      status: 'valid',
      issues: [],
    },
    summary: 'intent=TRAINING; strategy=MULTI_CONTEXT',
  };
}

function buildPolicyEvaluation() {
  const expertRegistry = new CoachExpertRegistry();
  const allowedExperts = expertRegistry
    .getExpertsForDomains(['training'])
    .map((expert) => expert.metadata);

  return {
    decision: {
      approved: true,
      blocked: false,
      fallbackRequired: false,
      allowedTools: [],
      allowedExperts,
      allowedDomains: ['training'],
      allowedLLM: true,
      metadata: {
        stage: 'PLANNING',
        evaluatedPolicyIds: [],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedExpertIds: [],
        blockedLlmUsage: false,
        allowedDomainCount: 1,
        allowedToolCount: 0,
        allowedExpertCount: allowedExperts.length,
        candidateExpertCount: allowedExperts.length,
        selectedExpertCount: allowedExperts.length,
        estimatedCost: 0,
        estimatedLatencyMs: 0,
        maximumExecutionDepth: 4,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      },
    },
    violations: [],
    reason: 'Approved.',
    actions: [],
  } as const;
}

function buildToolExecutionMetrics(): AgentToolExecutionMetrics {
  return {
    enabled: true,
    maxToolCalls: 4,
    timeoutMs: 3000,
    selectedToolCount: 1,
    executedToolCount: 1,
    skippedToolCount: 0,
    failedToolCount: 0,
    timeoutCount: 0,
    totalDurationMs: 2,
    selectedToolIds: ['TrainingTool'],
    executedToolIds: ['TrainingTool'],
    skippedToolIds: [],
    failedToolIds: [],
    timeoutToolIds: [],
    perToolDurationMs: [{ toolId: 'TrainingTool', durationMs: 2 }],
  };
}
