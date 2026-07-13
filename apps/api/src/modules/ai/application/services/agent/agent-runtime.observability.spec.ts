import { AgentRuntimeConfigService } from './agent-runtime.config';
import { AgentRuntimeService } from './agent-runtime.service';
import type { AgentTraceService } from './observability/agent-trace.service';
import type { AgentContextOrchestratorService } from './agent-context-orchestrator.service';
import type { AgentExecutionEngineService } from './execution/agent-execution.engine.service';
import type { AgentMemoryService } from './memory/agent-memory.service';
import type { AgentPlanningEngineService } from './planning/agent-planning-engine.service';
import type { AgentPolicyEngineService } from './policies/agent-policy.engine.service';
import type { AgentToolExecutorService } from './tools/agent-tool-executor.service';
import type { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import type { CoachChatContextLoaderService } from '../chat/coach-chat-context-loader.service';
import type { CoachChatMemoryUpdaterService } from '../chat/coach-chat-memory-updater.service';
import type { CoachChatPersistenceService } from '../chat/coach-chat-persistence.service';
import type { CoachChatReplyOrchestratorService } from '../chat/coach-chat-reply-orchestrator.service';
import type { AiPromptBuilder } from '../llm/ai-prompt-builder.service';
import type { AiRolloutService } from '../governance/ai-rollout.service';
import type { AiLlmConfigService } from '../llm/ai-llm-config.service';
import { CoachExpertRegistry } from '../experts/coach-expert.registry';
import { CoachExpertRoutingPolicy } from '../experts/coach-expert-router';
import { CoachExpertRouterService } from '../experts/coach-expert-router';
import type { CoachExpertObservabilityService } from '../experts/observability/coach-expert-observability';

describe('AgentRuntimeService observability integration', () => {
  const originalEnv = { ...process.env };
  let traceService: jest.Mocked<
    Pick<
      AgentTraceService,
      'startTrace' | 'completeTrace' | 'abortTrace' | 'recordEvent'
    >
  >;
  let expertObservabilityService: jest.Mocked<
    Pick<CoachExpertObservabilityService, 'startTrace' | 'completeTrace'>
  >;
  let runtime: AgentRuntimeService;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('AI_AGENT_')) {
        delete process.env[key];
      }
    }

    traceService = {
      startTrace: jest.fn().mockReturnValue(undefined),
      completeTrace: jest.fn().mockReturnValue(undefined),
      abortTrace: jest.fn().mockReturnValue(undefined),
      recordEvent: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<
      Pick<
        AgentTraceService,
        'startTrace' | 'completeTrace' | 'abortTrace' | 'recordEvent'
      >
    >;
    expertObservabilityService = {
      startTrace: jest.fn().mockReturnValue(undefined),
      completeTrace: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<
      Pick<CoachExpertObservabilityService, 'startTrace' | 'completeTrace'>
    >;

    runtime = new AgentRuntimeService(
      {
        resolveUserProfileId: jest.fn().mockResolvedValue('profile_123'),
      } as unknown as CoachChatContextLoaderService,
      {
        resolveConversationState: jest
          .fn()
          .mockResolvedValue(buildConversationState()),
        persistUserMessage: jest.fn().mockResolvedValue(undefined),
        persistAssistantMessage: jest.fn().mockResolvedValue(undefined),
      } as unknown as CoachChatPersistenceService,
      {
        execute: jest.fn().mockResolvedValue({
          content: 'Generated reply',
          source: 'llm',
          provider: 'openai',
          model: 'gpt-4.1-mini',
          promptVersion: 'coach-chat-prompt-v1',
        }),
      } as unknown as CoachChatReplyOrchestratorService,
      {
        update: jest.fn().mockResolvedValue(undefined),
      } as unknown as CoachChatMemoryUpdaterService,
      {
        build: jest.fn().mockReturnValue({
          promptVersion: 'coach-chat-prompt-v1',
          messages: [{ role: 'system', content: 'prompt' }],
        }),
      } as unknown as AiPromptBuilder,
      {
        resolveCoachChatAssignment: jest
          .fn()
          .mockReturnValue(buildRolloutAssignment()),
      } as unknown as AiRolloutService,
      {
        isEnabled: jest.fn().mockReturnValue(true),
        getMaxExperts: jest.fn().mockReturnValue(4),
      } as unknown as AiLlmConfigService,
      {
        orchestrate: jest.fn().mockResolvedValue(buildOrchestrationResult()),
      } as unknown as AgentContextOrchestratorService,
      {
        evaluate: jest.fn().mockReturnValue(buildPolicyEvaluation()),
      } as unknown as AgentPolicyEngineService,
      {
        buildPlan: jest.fn().mockReturnValue(buildPlan()),
        buildActions: jest.fn().mockReturnValue([]),
      } as unknown as AgentPlanningEngineService,
      {
        getTool: jest.fn(),
        getToolsForIntent: jest.fn().mockReturnValue([]),
        getToolsForContextDomains: jest.fn().mockReturnValue([]),
        getEnabledTools: jest.fn().mockReturnValue([]),
        listTools: jest.fn(),
      } as unknown as AgentToolRegistryService,
      {
        createWorkingMemory: jest.fn().mockReturnValue(undefined),
        loadSessionMemory: jest.fn().mockReturnValue(undefined),
        loadConversationMemory: jest.fn().mockResolvedValue({
          summary: 'Conversation memory summary',
          metadata: {
            generatedFromMessageCount: 1,
            version: 'memory-v1',
          },
        }),
        updateWorkingMemory: jest.fn().mockReturnValue(undefined),
        updateSessionMemory: jest.fn().mockReturnValue(undefined),
        createSnapshot: jest.fn().mockReturnValue(buildMemorySnapshot()),
        clearWorkingMemory: jest.fn().mockReturnValue(undefined),
      } as unknown as AgentMemoryService,
      {
        execute: jest.fn().mockResolvedValue(buildExecutionResult()),
      } as unknown as AgentToolExecutorService,
      {
        execute: jest.fn().mockResolvedValue(buildExecutionResult()),
      } as unknown as AgentExecutionEngineService,
      new AgentRuntimeConfigService(),
      traceService as unknown as AgentTraceService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      expertObservabilityService as unknown as CoachExpertObservabilityService,
    );
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('starts and completes the internal trace without changing the response shape', async () => {
    const response = await runtime.execute(
      {
        authUserId: 'auth_user_123',
        message: 'Should I train today?',
      },
      {
        streaming: true,
      },
    );

    expect(traceService.startTrace).toHaveBeenCalledTimes(1);
    expect(traceService.completeTrace).toHaveBeenCalledTimes(1);
    expect(traceService.abortTrace).not.toHaveBeenCalled();
    expect(expertObservabilityService.startTrace).toHaveBeenCalledTimes(1);
    expect(expertObservabilityService.completeTrace).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({
      conversationId: 'conversation_123',
      assistantText: 'Generated reply',
      fallbackUsed: false,
    });
    expect(response.observabilityTraceReference).toEqual(
      expect.objectContaining({
        conversationId: 'conversation_123',
        promptVersion: 'coach-chat-prompt-v1',
        requestId: expect.any(String),
      }),
    );
  });

  it('continues chat generation when expert observability fails internally', async () => {
    expertObservabilityService.startTrace.mockImplementation(() => {
      throw new Error('observability failed');
    });
    expertObservabilityService.completeTrace.mockImplementation(() => {
      throw new Error('observability failed');
    });

    const response = await runtime.execute(
      {
        authUserId: 'auth_user_123',
        message: 'Should I train today?',
      },
      {
        streaming: true,
      },
    );

    expect(response).toMatchObject({
      conversationId: 'conversation_123',
      assistantText: 'Generated reply',
      fallbackUsed: false,
    });
  });
});

function buildConversationState() {
  return {
    conversationId: 'conversation_123',
    conversationHistory: [],
    conversationMemory: {
      summary: 'Conversation memory summary',
      metadata: {
        generatedFromMessageCount: 1,
        version: 'memory-v1',
      },
    },
  };
}

function buildRolloutAssignment() {
  return {
    experimentId: 'exp-1',
    selectedPromptVersion: 'coach-chat-prompt-v1',
    rolloutVariant: 'control',
    canaryBucket: 1,
    canaryPercentage: 0,
    toolCallingEnabled: false,
  };
}

function buildOrchestrationResult() {
  return {
    request: {
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
      streamingPreference: true,
      experimentMetadata: buildRolloutAssignment(),
    },
    context: {
      intent: 'TRAINING',
      selectedDomains: ['training'],
      healthContext: {
        goal: 'Build strength',
      },
      recentMessages: [],
      safetyMetadata: {
        deterministicFirst: true,
        toolCallingEnabled: false,
        fallbackAllowed: true,
        promptVersion: 'coach-chat-prompt-v1',
      },
      rolloutMetadata: buildRolloutAssignment(),
    },
    intent: 'TRAINING',
    selectedDomains: ['training'],
    metadata: {
      detectedIntent: 'TRAINING',
      selectedDomains: ['training'],
      selectedDomainCount: 1,
      orchestrationDurationMs: 1,
      rationale: 'keyword match',
      policyDecision: {
        approved: true,
        blocked: false,
        fallbackRequired: false,
        allowedDomainCount: 1,
        blockedDomainIds: [],
      },
    },
  } as const;
}

function buildPolicyEvaluation() {
  const expertRegistry = new CoachExpertRegistry();
  const candidateExperts = expertRegistry
    .getExpertsForIntent('TRAINING')
    .map((expert) => expert.metadata);
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
        evaluatedPolicyIds: ['context-authorization'],
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
        candidateExpertCount: candidateExperts.length,
        selectedExpertCount: allowedExperts.length,
        estimatedCost: 0,
        estimatedLatencyMs: 0,
        maximumExecutionDepth: 6,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      },
    },
    violations: [],
    reason: 'Approved.',
    actions: [],
  };
}

function buildPlan() {
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
    responseMode: 'stream',
    safetyConstraints: ['deterministic_first'],
    maxSteps: 6,
    actions: [],
    candidateTools: [],
    selectedTools: [],
    executionStrategy: 'DIRECT_REPLY',
    planningSteps: [],
    maximumExecutionDepth: 6,
    expectedCost: 0,
    expectedLatencyMs: 0,
    validation: {
      status: 'valid',
      issues: [],
    },
    summary: 'Plan summary',
  } as const;
}

function buildMemorySnapshot() {
  return {
    workingMemory: {
      request: {
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
        streamingPreference: true,
        experimentMetadata: buildRolloutAssignment(),
      },
      intent: 'TRAINING',
      selectedDomains: ['training'],
      selectedTools: [],
      toolResults: [],
      createdAt: '2026-07-05T10:00:00.000Z',
      updatedAt: '2026-07-05T10:00:00.000Z',
    },
    sessionMemory: {
      conversationId: 'conversation_123',
      entries: [],
      recentGoals: [],
      recentCoachDecisions: [],
      recentToolResults: [],
      temporaryPreferences: {},
      recentExecutionSummaries: [],
      createdAt: '2026-07-05T10:00:00.000Z',
      updatedAt: '2026-07-05T10:00:00.000Z',
      expiresAt: '2026-07-05T10:30:00.000Z',
    },
    conversationMemory: {
      summary: 'Conversation memory summary',
      metadata: {
        generatedFromMessageCount: 1,
        version: 'memory-v1',
      },
    },
    metadata: {
      workingMemorySize: 7,
      sessionMemorySize: 11,
      conversationMemorySize: 1,
      snapshotCreated: true,
      expired: false,
      lifecycleEvents: [],
    },
  } as const;
}

function buildExecutionResult() {
  return {
    assistantText: 'Generated reply',
    fallbackUsed: false,
    executedSteps: [],
    actionResults: [],
    prompt: {
      promptVersion: 'coach-chat-prompt-v1',
      messages: [],
    },
    reply: {
      content: 'Generated reply',
      source: 'llm',
    },
    toolExecutionOutcome: {
      results: [],
      metrics: {
        enabled: false,
        maxToolCalls: 4,
        timeoutMs: 3000,
        selectedToolCount: 0,
        executedToolCount: 0,
        skippedToolCount: 0,
        failedToolCount: 0,
        timeoutCount: 0,
        totalDurationMs: 0,
        selectedToolIds: [],
        executedToolIds: [],
        skippedToolIds: [],
        failedToolIds: [],
        timeoutToolIds: [],
        perToolDurationMs: [],
      },
    },
    memorySnapshot: buildMemorySnapshot(),
    state: {
      requestId: 'request_123',
      conversationId: 'conversation_123',
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      executionDurationMs: 0,
      toolResults: [],
      planningMetadata: {
        plan: buildPlan(),
        validation: {
          status: 'valid',
          issues: [],
        },
        selectedDomainCount: 1,
        selectedToolCount: 0,
        candidateToolCount: 0,
      },
      runtimeMetadata: {
        enabled: true,
        detectedIntent: 'TRAINING',
        selectedDomains: ['training'],
        toolExecutionEnabled: false,
        fallbackUsed: false,
      },
      lifecycleEvents: [],
    },
    lifecycleEvents: [],
  } as const;
}
