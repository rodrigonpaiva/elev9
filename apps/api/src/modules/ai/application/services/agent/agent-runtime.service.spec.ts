import { AgentContextOrchestratorService } from './agent-context-orchestrator.service';
import { AgentRuntimeConfigService } from './agent-runtime.config';
import { AgentRuntimeService } from './agent-runtime.service';
import { AgentExecutionEngineService } from './execution/agent-execution.engine.service';
import { AgentMemoryService } from './memory/agent-memory.service';
import { AgentPlanningEngineService } from './planning/agent-planning-engine.service';
import { AgentPlanningPolicy } from './planning/agent-planning.policy';
import { AgentPlanValidator } from './planning/agent-plan-validator.service';
import { AgentPolicyEngineService } from './policies/agent-policy.engine.service';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { AgentToolExecutorService } from './tools/agent-tool-executor.service';
import { CoachExpertRegistry } from '../experts/coach-expert.registry';
import { CoachExpertCompositionService } from '../experts/composition/coach-expert-composition';
import { CoachExplainabilityService } from '../explainability/coach-explainability';
import { CoachPersonaEngineService } from '../persona/coach-persona-engine';
import type { AgentToolExecutionOutcome } from './tools/agent-tool-execution.types';
import type { AgentContext, AgentRequest } from './agent.types';
import type { AgentContextOrchestrationResult } from './agent-context-orchestrator.service';
import { CoachChatContextLoaderService } from '../chat/coach-chat-context-loader.service';
import { CoachChatMemoryUpdaterService } from '../chat/coach-chat-memory-updater.service';
import { CoachChatPersistenceService } from '../chat/coach-chat-persistence.service';
import { CoachChatReplyOrchestratorService } from '../chat/coach-chat-reply-orchestrator.service';
import { AiPromptBuilder } from '../llm/ai-prompt-builder.service';
import { AiRolloutService } from '../governance/ai-rollout.service';
import { AiLlmConfigService } from '../llm/ai-llm-config.service';
import type { CoachChatLoadedContext } from '../../use-cases/create-coach-chat/create-coach-chat.types';

describe('AgentRuntimeConfigService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('AI_AGENT_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('defaults to the disabled runtime and six max steps', () => {
    const config = new AgentRuntimeConfigService();

    expect(config.isEnabled()).toBe(false);
    expect(config.getMaxSteps()).toBe(6);
    expect(config.isToolsEnabled()).toBe(false);
    expect(config.getMaxToolCalls()).toBe(4);
    expect(config.getMaxExperts()).toBe(4);
    expect(config.getToolTimeoutMs()).toBe(3000);
    expect(config.getSessionMemoryMaxItems()).toBe(20);
    expect(config.getSessionMemoryTtlMs()).toBe(1800000);
    expect(config.getTraceMaxItems()).toBe(1000);
    expect(config.getTraceRetentionMs()).toBe(86400000);
  });

  it('rejects invalid max step values', () => {
    process.env.AI_AGENT_MAX_STEPS = '0';

    expect(() => new AgentRuntimeConfigService()).toThrow();
  });

  it('rejects invalid boolean flag values', () => {
    process.env.AI_AGENT_RUNTIME_ENABLED = 'maybe';

    expect(() => new AgentRuntimeConfigService()).toThrow();
  });

  it('rejects invalid session memory configuration values', () => {
    process.env.AI_AGENT_SESSION_MEMORY_MAX_ITEMS = '0';

    expect(() => new AgentRuntimeConfigService()).toThrow();

    delete process.env.AI_AGENT_SESSION_MEMORY_MAX_ITEMS;
    process.env.AI_AGENT_SESSION_MEMORY_TTL_MS = '0';

    expect(() => new AgentRuntimeConfigService()).toThrow();

    delete process.env.AI_AGENT_SESSION_MEMORY_TTL_MS;
    process.env.AI_AGENT_TRACE_MAX_ITEMS = '0';

    expect(() => new AgentRuntimeConfigService()).toThrow();

    delete process.env.AI_AGENT_TRACE_MAX_ITEMS;
    process.env.AI_AGENT_TRACE_RETENTION_MS = '0';

    expect(() => new AgentRuntimeConfigService()).toThrow();

    delete process.env.AI_AGENT_TRACE_RETENTION_MS;
    process.env.AI_COACH_MAX_EXPERTS = '0';

    expect(() => new AgentRuntimeConfigService()).toThrow();
  });
});

describe('AgentRuntimeService', () => {
  let coachChatContextLoaderService: jest.Mocked<
    Pick<CoachChatContextLoaderService, 'resolveUserProfileId'>
  >;
  let coachChatPersistenceService: jest.Mocked<
    Pick<
      CoachChatPersistenceService,
      | 'resolveConversationState'
      | 'persistUserMessage'
      | 'persistAssistantMessage'
    >
  >;
  let coachChatReplyOrchestratorService: jest.Mocked<
    Pick<CoachChatReplyOrchestratorService, 'execute'>
  >;
  let coachChatMemoryUpdaterService: jest.Mocked<
    Pick<CoachChatMemoryUpdaterService, 'update'>
  >;
  let aiPromptBuilder: jest.Mocked<Pick<AiPromptBuilder, 'build'>>;
  let aiRolloutService: jest.Mocked<
    Pick<AiRolloutService, 'resolveCoachChatAssignment'>
  >;
  let aiLlmConfigService: jest.Mocked<Pick<AiLlmConfigService, 'isEnabled'>>;
  let agentContextOrchestratorService: jest.Mocked<
    Pick<AgentContextOrchestratorService, 'orchestrate'>
  >;
  let agentPolicyEngineService: jest.Mocked<
    Pick<AgentPolicyEngineService, 'evaluate'>
  >;
  let agentPlanningEngineService: AgentPlanningEngineService;
  let agentToolRegistryService: AgentToolRegistryService;
  let agentMemoryService: jest.Mocked<
    Pick<
      AgentMemoryService,
      | 'createWorkingMemory'
      | 'loadSessionMemory'
      | 'loadConversationMemory'
      | 'updateWorkingMemory'
      | 'updateSessionMemory'
      | 'createSnapshot'
      | 'clearWorkingMemory'
    >
  >;
  let agentToolExecutorService: jest.Mocked<
    Pick<AgentToolExecutorService, 'execute'>
  >;
  let agentExecutionEngineService: jest.Mocked<
    Pick<AgentExecutionEngineService, 'execute'>
  >;
  let coachExpertCompositionService: jest.Mocked<
    Pick<CoachExpertCompositionService, 'compose'>
  >;
  let coachPersonaEngineService: jest.Mocked<
    Pick<CoachPersonaEngineService, 'build'>
  >;
  let coachExplainabilityService: jest.Mocked<
    Pick<CoachExplainabilityService, 'build'>
  >;
  let runtime: AgentRuntimeService;

  beforeEach(() => {
    coachChatContextLoaderService = {
      resolveUserProfileId: jest.fn().mockResolvedValue('profile_123'),
    } as unknown as jest.Mocked<
      Pick<CoachChatContextLoaderService, 'resolveUserProfileId'>
    >;
    coachChatPersistenceService = {
      resolveConversationState: jest
        .fn()
        .mockResolvedValue(buildConversationState()),
      persistUserMessage: jest.fn().mockResolvedValue(undefined),
      persistAssistantMessage: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<
      Pick<
        CoachChatPersistenceService,
        | 'resolveConversationState'
        | 'persistUserMessage'
        | 'persistAssistantMessage'
      >
    >;
    coachChatReplyOrchestratorService = {
      execute: jest.fn().mockResolvedValue({
        content: 'Agent runtime reply',
        source: 'llm',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        promptVersion: 'coach-chat-prompt-v1',
      }),
    } as unknown as jest.Mocked<
      Pick<CoachChatReplyOrchestratorService, 'execute'>
    >;
    coachChatMemoryUpdaterService = {
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Pick<CoachChatMemoryUpdaterService, 'update'>>;
    aiPromptBuilder = {
      build: jest.fn().mockReturnValue({
        promptVersion: 'coach-chat-prompt-v1',
        messages: [{ role: 'system', content: 'prompt' }],
      }),
    } as unknown as jest.Mocked<Pick<AiPromptBuilder, 'build'>>;
    aiRolloutService = {
      resolveCoachChatAssignment: jest
        .fn()
        .mockReturnValue(buildRolloutAssignment()),
    } as unknown as jest.Mocked<
      Pick<AiRolloutService, 'resolveCoachChatAssignment'>
    >;
    aiLlmConfigService = {
      isEnabled: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<Pick<AiLlmConfigService, 'isEnabled'>>;
    agentContextOrchestratorService = {
      orchestrate: jest.fn().mockResolvedValue(buildOrchestrationResult()),
    } as unknown as jest.Mocked<
      Pick<AgentContextOrchestratorService, 'orchestrate'>
    >;
    agentPolicyEngineService = {
      evaluate: jest.fn().mockReturnValue(buildPolicyEvaluation()),
    } as unknown as jest.Mocked<Pick<AgentPolicyEngineService, 'evaluate'>>;
    agentPlanningEngineService = new AgentPlanningEngineService(
      new AgentPlanningPolicy(),
      new AgentPlanValidator(),
      {
        getMaxSteps: jest.fn().mockReturnValue(6),
      } as unknown as AgentRuntimeConfigService,
    );
    agentToolRegistryService = new AgentToolRegistryService();
    agentMemoryService = {
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
      createSnapshot: jest.fn().mockReturnValue({
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
          createdAt: '2026-05-04T10:00:00.000Z',
          updatedAt: '2026-05-04T10:00:00.000Z',
        },
        sessionMemory: {
          conversationId: 'conversation_123',
          entries: [],
          recentGoals: [],
          recentCoachDecisions: [],
          recentToolResults: [],
          temporaryPreferences: {},
          recentExecutionSummaries: [],
          createdAt: '2026-05-04T10:00:00.000Z',
          updatedAt: '2026-05-04T10:00:00.000Z',
          expiresAt: '2026-05-04T10:30:00.000Z',
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
      }),
      clearWorkingMemory: jest.fn().mockReturnValue(undefined),
    } as unknown as jest.Mocked<
      Pick<
        AgentMemoryService,
        | 'createWorkingMemory'
        | 'loadSessionMemory'
        | 'loadConversationMemory'
        | 'updateWorkingMemory'
        | 'updateSessionMemory'
        | 'createSnapshot'
        | 'clearWorkingMemory'
      >
    >;
    agentToolExecutorService = {
      execute: jest.fn().mockResolvedValue(buildToolExecutionOutcome()),
    } as unknown as jest.Mocked<Pick<AgentToolExecutorService, 'execute'>>;
    agentExecutionEngineService = {
      execute: jest.fn().mockResolvedValue(buildExecutionResult()),
    } as unknown as jest.Mocked<Pick<AgentExecutionEngineService, 'execute'>>;
    coachExpertCompositionService = {
      compose: jest.fn().mockReturnValue(buildCompositionResult()),
    } as unknown as jest.Mocked<Pick<CoachExpertCompositionService, 'compose'>>;
    coachPersonaEngineService = {
      build: jest.fn().mockReturnValue(buildPersonaGuidance()),
    } as unknown as jest.Mocked<Pick<CoachPersonaEngineService, 'build'>>;
    coachExplainabilityService = {
      build: jest.fn().mockReturnValue(buildExplanation()),
    } as unknown as jest.Mocked<Pick<CoachExplainabilityService, 'build'>>;

    runtime = new AgentRuntimeService(
      coachChatContextLoaderService as unknown as CoachChatContextLoaderService,
      coachChatPersistenceService as unknown as CoachChatPersistenceService,
      coachChatReplyOrchestratorService as unknown as CoachChatReplyOrchestratorService,
      coachChatMemoryUpdaterService as unknown as CoachChatMemoryUpdaterService,
      aiPromptBuilder as unknown as AiPromptBuilder,
      aiRolloutService as unknown as AiRolloutService,
      aiLlmConfigService as unknown as AiLlmConfigService,
      agentContextOrchestratorService as unknown as AgentContextOrchestratorService,
      agentPolicyEngineService as unknown as AgentPolicyEngineService,
      agentPlanningEngineService,
      agentToolRegistryService,
      agentMemoryService as unknown as AgentMemoryService,
      agentToolExecutorService as unknown as AgentToolExecutorService,
      agentExecutionEngineService as unknown as AgentExecutionEngineService,
      {
        isEnabled: jest.fn().mockReturnValue(true),
        getMaxSteps: jest.fn().mockReturnValue(6),
        isToolsEnabled: jest.fn().mockReturnValue(true),
        getMaxToolCalls: jest.fn().mockReturnValue(4),
        getMaxExperts: jest.fn().mockReturnValue(4),
        getToolTimeoutMs: jest.fn().mockReturnValue(3000),
      } as unknown as AgentRuntimeConfigService,
      undefined,
      undefined,
      undefined,
      coachExpertCompositionService as unknown as CoachExpertCompositionService,
      coachPersonaEngineService as unknown as CoachPersonaEngineService,
      coachExplainabilityService as unknown as CoachExplainabilityService,
    );
  });

  it('creates an agent request with session and rollout metadata', () => {
    const request = runtime.buildRequest({
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      conversationId: 'conversation_123',
      userIdHash: 'user-hash-123',
      userMessage: 'Should I train today?',
      promptVersion: 'coach-chat-prompt-v1',
      streamingPreference: true,
      experimentMetadata: buildRolloutAssignment(),
      signal: new AbortController().signal,
      onDelta: jest.fn(),
    });

    expect(request).toMatchObject({
      userId: 'profile_123',
      conversationId: 'conversation_123',
      userMessage: 'Should I train today?',
      promptVersion: 'coach-chat-prompt-v1',
      streamingPreference: true,
      experimentMetadata: expect.objectContaining({
        experimentId: 'coach-chat-evaluation-rollout',
      }),
      sessionMetadata: expect.objectContaining({
        authUserId: 'auth_user_123',
        userProfileId: 'profile_123',
        conversationId: 'conversation_123',
        userIdHash: 'user-hash-123',
      }),
    });
    expect(request.sessionMetadata.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('builds a deterministic plan from the orchestrated context', () => {
    const request = buildAgentRequest({ streamingPreference: true });
    const context = buildAgentContext();

    const policyEvaluation = buildPolicyEvaluation();
    const planA = runtime.buildPlan(request, context, policyEvaluation);
    const planB = runtime.buildPlan(request, context, policyEvaluation);

    expect(planA).toEqual(planB);
    expect(planA).toMatchObject({
      intent: 'TRAINING',
      responseMode: 'stream',
      maxSteps: 6,
      executionStrategy: 'MULTI_CONTEXT',
      requiredContextDomains: [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
        'training',
        'recovery',
        'goals',
        'progress',
      ],
    });
    expect(planA.candidateTools.map((tool) => tool.id)).toEqual([
      'UserProfileTool',
      'ConversationMemoryTool',
      'CoachDecisionTool',
      'HealthContextTool',
      'TrainingTool',
      'RecoveryTool',
      'GoalTool',
      'ProgressTool',
    ]);
    expect(planA.selectedTools.map((tool) => tool.id)).toEqual([
      'TrainingTool',
      'RecoveryTool',
      'GoalTool',
      'ProgressTool',
      'HealthContextTool',
      'CoachDecisionTool',
      'ConversationMemoryTool',
      'UserProfileTool',
      'NutritionTool',
      'HabitTool',
      'DashboardTool',
      'PersonalizationTool',
      'NotificationTool',
    ]);
    expect(planA.actions.map((action) => action.type)).toEqual([
      'READ_USER_PROFILE',
      'READ_TRAINING_CONTEXT',
      'READ_RECOVERY_CONTEXT',
      'READ_GOALS_CONTEXT',
      'READ_PROGRESS_CONTEXT',
      'READ_COACH_DECISION',
      'READ_MEMORY',
      'READ_RECENT_MESSAGES',
      'GENERATE_REPLY',
    ]);
    expect(planA.planningSteps.map((step) => step.step)).toEqual([
      'CLASSIFY_INTENT',
      'SELECT_CONTEXT',
      'SELECT_TOOLS',
      'VALIDATE_PLAN',
      'LOAD_CONTEXT',
      'BUILD_PROMPT',
      'CALL_LLM',
      'PERSIST_MESSAGES',
      'UPDATE_MEMORY',
      'COMPLETE',
    ]);
    expect(planA.expertRouting.metadata.primaryExpertId).toBe('WorkoutExpert');
    expect(planA.expertRouting.metadata.routeValid).toBe(true);
  });

  it('tracks steps and generates runtime metadata while preserving the reply shape', async () => {
    const result = await runtime.execute(
      {
        authUserId: 'auth_user_123',
        message: 'Should I train today?',
      },
      {
        streaming: true,
        onDelta: jest.fn(),
      },
    );

    expect(
      coachChatContextLoaderService.resolveUserProfileId,
    ).toHaveBeenCalledWith('auth_user_123');
    expect(agentPolicyEngineService.evaluate).toHaveBeenCalled();
    expect(agentContextOrchestratorService.orchestrate).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: 'Should I train today?',
      }),
      expect.objectContaining({
        conversationState: expect.objectContaining({
          conversationId: 'conversation_123',
        }),
      }),
    );
    expect(agentExecutionEngineService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          userMessage: 'Should I train today?',
        }),
        plan: expect.objectContaining({
          intent: 'TRAINING',
        }),
        streaming: true,
        composition: expect.objectContaining({
          primaryExpert: expect.objectContaining({
            id: 'WorkoutExpert',
          }),
        }),
        personaGuidance: expect.objectContaining({
          focus: 'WORKOUT',
          tone: 'SUPPORTIVE',
        }),
        explanation: expect.objectContaining({
          primaryExpertId: 'WorkoutExpert',
        }),
      }),
    );
    expect(coachExpertCompositionService.compose).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'TRAINING',
        selectedDomains: expect.arrayContaining(['training']),
      }),
    );
    expect(coachPersonaEngineService.build).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'TRAINING',
        selectedDomains: expect.arrayContaining(['training']),
      }),
    );
    expect(coachExplainabilityService.build).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'TRAINING',
        selectedDomains: expect.arrayContaining(['training']),
        coachPersonaGuidance: expect.objectContaining({
          focus: 'WORKOUT',
        }),
      }),
    );
    expect(result).toMatchObject({
      conversationId: 'conversation_123',
      assistantText: 'Agent runtime reply',
      fallbackUsed: false,
      metadata: expect.objectContaining({
        enabled: true,
        detectedIntent: 'TRAINING',
        planIntent: 'TRAINING',
        responseMode: 'stream',
        executionStrategy: 'MULTI_CONTEXT',
        stepCount: 6,
        fallbackUsed: false,
        selectedDomainCount: 8,
        candidateToolIds: [
          'UserProfileTool',
          'ConversationMemoryTool',
          'CoachDecisionTool',
          'HealthContextTool',
          'TrainingTool',
          'RecoveryTool',
          'GoalTool',
          'ProgressTool',
        ],
        selectedToolIds: [
          'TrainingTool',
          'RecoveryTool',
          'GoalTool',
          'ProgressTool',
          'HealthContextTool',
          'CoachDecisionTool',
          'ConversationMemoryTool',
          'UserProfileTool',
          'NutritionTool',
          'HabitTool',
          'DashboardTool',
          'PersonalizationTool',
          'NotificationTool',
        ],
        candidateToolCount: 8,
        selectedToolCount: 13,
        estimatedToolCost: 24,
        estimatedToolLatencyMs: 208,
        planningStepCount: 10,
        planningValidationPassed: true,
        toolExecutionEnabled: true,
        toolExecutionMetrics: expect.objectContaining({
          enabled: true,
          selectedToolCount: 13,
          executedToolCount: 3,
          skippedToolCount: 10,
          failedToolCount: 0,
          timeoutCount: 0,
        }),
        toolExecutionResults: expect.arrayContaining([
          expect.objectContaining({
            toolId: 'TrainingTool',
            status: 'SUCCESS',
          }),
        ]),
        planningDurationMs: expect.any(Number),
        executionDurationMs: expect.any(Number),
        expertExecutionDurationMs: expect.any(Number),
        expertResults: expect.arrayContaining([
          expect.objectContaining({
            expertId: 'WorkoutExpert',
            summary: expect.stringContaining('status=unavailable'),
          }),
        ]),
        expertContributions: expect.arrayContaining([
          expect.objectContaining({
            expertId: 'WorkoutExpert',
            type: 'CONTRIBUTION',
          }),
        ]),
        expertRoutingPrimaryExpertId: 'WorkoutExpert',
        expertRoutingOrderedExpertIds: expect.arrayContaining([
          'WorkoutExpert',
        ]),
        promptVersion: 'coach-chat-prompt-v1',
        memory: expect.objectContaining({
          workingMemorySize: 7,
          sessionMemorySize: 11,
          conversationMemorySize: 1,
          snapshotCreated: true,
          expired: false,
        }),
        plan: expect.objectContaining({
          executionStrategy: 'MULTI_CONTEXT',
          maximumExecutionDepth: 4,
        }),
      }),
      observabilityTraceReference: expect.objectContaining({
        requestId: expect.any(String),
        conversationId: 'conversation_123',
        userIdHash: expect.any(String),
      }),
    });
    expect(result.executedSteps.map((step) => step.step)).toEqual([
      'LOAD_CONTEXT',
      'EXECUTE_TOOL',
      'BUILD_PROMPT',
      'CALL_LLM',
      'PERSIST_MESSAGES',
      'UPDATE_MEMORY',
    ]);
    expect(agentMemoryService.createWorkingMemory).toHaveBeenCalled();
    expect(agentMemoryService.loadSessionMemory).toHaveBeenCalled();
    expect(agentMemoryService.updateWorkingMemory).not.toHaveBeenCalled();
    expect(agentMemoryService.updateSessionMemory).not.toHaveBeenCalled();
    expect(agentMemoryService.createSnapshot).not.toHaveBeenCalled();
    expect(agentMemoryService.clearWorkingMemory).toHaveBeenCalled();
    expect(coachChatMemoryUpdaterService.update).not.toHaveBeenCalled();
    expect(coachChatReplyOrchestratorService.execute).not.toHaveBeenCalled();
    expect(agentToolExecutorService.execute).not.toHaveBeenCalled();
  });

  it('capped tracked steps at the configured max step count', async () => {
    const cappedPlanningEngineService = new AgentPlanningEngineService(
      new AgentPlanningPolicy(),
      new AgentPlanValidator(),
      {
        getMaxSteps: jest.fn().mockReturnValue(4),
      } as unknown as AgentRuntimeConfigService,
    );
    const cappedRuntime = new AgentRuntimeService(
      coachChatContextLoaderService as unknown as CoachChatContextLoaderService,
      coachChatPersistenceService as unknown as CoachChatPersistenceService,
      coachChatReplyOrchestratorService as unknown as CoachChatReplyOrchestratorService,
      coachChatMemoryUpdaterService as unknown as CoachChatMemoryUpdaterService,
      aiPromptBuilder as unknown as AiPromptBuilder,
      aiRolloutService as unknown as AiRolloutService,
      aiLlmConfigService as unknown as AiLlmConfigService,
      agentContextOrchestratorService as unknown as AgentContextOrchestratorService,
      agentPolicyEngineService as unknown as AgentPolicyEngineService,
      cappedPlanningEngineService,
      agentToolRegistryService,
      agentMemoryService as unknown as AgentMemoryService,
      agentToolExecutorService as unknown as AgentToolExecutorService,
      agentExecutionEngineService as unknown as AgentExecutionEngineService,
      {
        isEnabled: jest.fn().mockReturnValue(true),
        getMaxSteps: jest.fn().mockReturnValue(4),
        isToolsEnabled: jest.fn().mockReturnValue(true),
        getMaxToolCalls: jest.fn().mockReturnValue(4),
        getMaxExperts: jest.fn().mockReturnValue(4),
        getToolTimeoutMs: jest.fn().mockReturnValue(3000),
      } as unknown as AgentRuntimeConfigService,
    );

    const result = await cappedRuntime.execute({
      authUserId: 'auth_user_123',
      message: 'Should I train today?',
    });

    expect(result.executedSteps.length).toBe(4);
    expect(result.metadata.stepCount).toBe(4);
    expect(result.metadata.stepLimitReached).toBe(true);
    expect(agentMemoryService.clearWorkingMemory).toHaveBeenCalled();
  });
});

function buildAgentRequest(input: {
  streamingPreference: boolean;
}): AgentRequest {
  const agentToolRegistryService = new AgentToolRegistryService();
  const runtime = new AgentRuntimeService(
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
        content: 'Agent runtime reply',
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
    } as unknown as AiLlmConfigService,
    {
      orchestrate: jest.fn().mockResolvedValue(buildOrchestrationResult()),
    } as unknown as AgentContextOrchestratorService,
    {
      evaluate: jest.fn().mockReturnValue(buildPolicyEvaluation()),
    } as unknown as AgentPolicyEngineService,
    new AgentPlanningEngineService(
      new AgentPlanningPolicy(),
      new AgentPlanValidator(),
      {
        getMaxSteps: jest.fn().mockReturnValue(6),
      } as unknown as AgentRuntimeConfigService,
    ),
    agentToolRegistryService,
    {
      createWorkingMemory: jest.fn(),
      loadSessionMemory: jest.fn(),
      loadConversationMemory: jest.fn(),
      updateWorkingMemory: jest.fn(),
      updateSessionMemory: jest.fn(),
      createSnapshot: jest.fn(),
      clearWorkingMemory: jest.fn(),
    } as unknown as AgentMemoryService,
    {
      execute: jest.fn().mockResolvedValue(buildToolExecutionOutcome()),
    } as unknown as AgentToolExecutorService,
    {
      execute: jest.fn().mockResolvedValue(buildExecutionResult()),
    } as unknown as AgentExecutionEngineService,
    {
      isEnabled: jest.fn().mockReturnValue(true),
      getMaxSteps: jest.fn().mockReturnValue(6),
      isToolsEnabled: jest.fn().mockReturnValue(true),
      getMaxToolCalls: jest.fn().mockReturnValue(4),
      getMaxExperts: jest.fn().mockReturnValue(4),
      getToolTimeoutMs: jest.fn().mockReturnValue(3000),
    } as unknown as AgentRuntimeConfigService,
  );

  return runtime.buildRequest({
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    conversationId: 'conversation_123',
    userIdHash: 'user-hash-123',
    userMessage: 'Should I train today?',
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: input.streamingPreference,
    experimentMetadata: buildRolloutAssignment(),
  });
}

function buildAgentContext(): AgentContext {
  return {
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
    healthContext: buildLoadedContext().healthContext,
    conversationMemory: buildConversationState().conversationMemory,
    recentMessages: buildConversationState().conversationHistory,
    coachDecision: buildLoadedContext().coachDecision,
    notification: undefined,
    habit: undefined,
    personalization: undefined,
    notificationMemory: undefined,
    habitMemory: undefined,
    personalizationMemory: undefined,
    safetyMetadata: {
      deterministicFirst: true,
      toolCallingEnabled: false,
      fallbackAllowed: true,
      promptVersion: 'coach-chat-prompt-v1',
    },
    rolloutMetadata: buildRolloutAssignment(),
  };
}

function buildOrchestrationResult(): AgentContextOrchestrationResult {
  const conversationState = buildConversationState();
  const loadedContext = buildLoadedContext();

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
    } as AgentRequest,
    context: {
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
      healthContext: loadedContext.healthContext,
      conversationMemory: conversationState.conversationMemory,
      recentMessages: conversationState.conversationHistory,
      coachDecision: loadedContext.coachDecision,
      notification: undefined,
      habit: undefined,
      personalization: undefined,
      notificationMemory: undefined,
      habitMemory: undefined,
      personalizationMemory: undefined,
      safetyMetadata: {
        deterministicFirst: true,
        toolCallingEnabled: false,
        fallbackAllowed: true,
        promptVersion: 'coach-chat-prompt-v1',
      },
      rolloutMetadata: buildRolloutAssignment(),
    },
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
    metadata: {
      detectedIntent: 'TRAINING',
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
      selectedDomainCount: 8,
      orchestrationDurationMs: 1,
      rationale: 'Matched training pattern "train".',
      policyDecision: {
        approved: true,
        blocked: false,
        fallbackRequired: false,
        allowedDomainCount: 8,
        blockedDomainIds: [],
      },
    },
  };
}

function buildPolicyEvaluation() {
  const allowedDomains = [
    'user_profile',
    'conversation_memory',
    'recent_messages',
    'coach_decision',
    'training',
    'recovery',
    'goals',
    'progress',
  ] as const;
  const registry = new AgentToolRegistryService();
  const expertRegistry = new CoachExpertRegistry();
  const allowedTools = registry.getToolsForContextDomains(allowedDomains);
  const candidateExperts = expertRegistry
    .getExpertsForIntent('TRAINING')
    .map((expert) => expert.metadata);
  const allowedExperts = expertRegistry
    .getExpertsForDomains(allowedDomains)
    .map((expert) => expert.metadata);

  return {
    decision: {
      approved: true,
      blocked: false,
      fallbackRequired: false,
      allowedTools,
      allowedExperts,
      allowedDomains,
      allowedLLM: true,
      metadata: {
        stage: 'PLANNING',
        evaluatedPolicyIds: [
          'context-authorization',
          'tool-authorization',
          'llm-authorization',
          'safety-enforcement',
          'cost-limits',
          'memory-governance',
        ],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedExpertIds: [],
        blockedLlmUsage: false,
        allowedDomainCount: allowedDomains.length,
        allowedToolCount: allowedTools.length,
        allowedExpertCount: allowedExperts.length,
        candidateExpertCount: candidateExperts.length,
        selectedExpertCount: allowedExperts.length,
        estimatedCost: 14,
        estimatedLatencyMs: 127,
        maximumExecutionDepth: 4,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      },
    },
    violations: [],
    reason: 'Policy approved the request.',
    actions: ['continue_execution'],
  } as const;
}

function buildLoadedContext(): CoachChatLoadedContext {
  return {
    userProfileId: 'profile_123',
    healthContext: {
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      goal: 'gain_muscle',
      adherenceScore: 82,
      currentStreak: 5,
      averageWorkoutDuration: 54,
      fatigueLevel: 'LOW',
      availableEquipment: ['barbell', 'dumbbells'],
      limitations: [],
      nutritionProfile: {
        goal: 'muscle_gain',
        mealsPerDay: 4,
        dietaryRestrictions: [],
        allergies: [],
        dislikedFoods: [],
        preferredFoods: [],
      },
      latestCheckIn: {
        energyLevel: 4,
        sleepQuality: 4,
        muscleSoreness: 2,
        motivationLevel: 5,
        createdAt: new Date('2026-05-04T09:00:00.000Z'),
      },
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-05-04T10:00:00.000Z'),
    },
    coachDecision: {
      priority: 'training',
      headline: 'Train today',
      summary: 'You are ready.',
      actionItems: ['Train'],
      influences: [],
    },
  } as CoachChatLoadedContext;
}

function buildConversationState() {
  return {
    conversationId: 'conversation_123',
    conversationHistory: [
      {
        role: 'user' as const,
        content: 'Last message from user',
        createdAt: '2026-05-04T09:55:00.000Z',
      },
    ],
    conversationMemory: {
      summary: 'Conversation memory summary',
      metadata: {},
    },
  };
}

function buildCompositionResult() {
  return {
    primaryExpert: {
      id: 'WorkoutExpert',
      displayName: 'Workout Expert',
      version: '1.0.0',
      category: 'TRAINING',
      supportedIntents: ['TRAINING'],
      supportedDomains: ['training'],
      estimatedCost: 4,
      estimatedLatencyMs: 18,
      priority: 100,
      capabilities: ['TRAINING_SPECIALIST'],
      enabled: true,
    },
    participatingExperts: [
      {
        expertId: 'WorkoutExpert',
        expertName: 'Workout Expert',
        role: 'PRIMARY',
        sequence: 0,
        summary: 'Workout summary.',
        recommendationCodes: ['MAINTAIN_TODAY'],
        riskLevels: ['LOW'],
        confidence: 'HIGH',
        keyFindings: ['WORKOUT_CONSISTENCY'],
        metadata: {
          goalAlignment: 'strength',
        },
      },
    ],
    assessment: {
      summary:
        'primary=WorkoutExpert; findings=WORKOUT_CONSISTENCY; risk=LOW; confidence=HIGH; recommendations=MAINTAIN_TODAY; conflicts=0',
      keyFindings: ['WORKOUT_CONSISTENCY'],
      metadata: {},
    },
    summary:
      'primary=WorkoutExpert; findings=WORKOUT_CONSISTENCY; risk=LOW; confidence=HIGH; recommendations=MAINTAIN_TODAY; conflicts=0',
    keyFindings: ['WORKOUT_CONSISTENCY'],
    recommendations: [
      {
        code: 'MAINTAIN_TODAY',
        summary: 'Maintain today.',
        reason: 'Maintain today.',
        priority: 'LOW',
        category: 'PRIMARY',
        sourceExperts: ['WorkoutExpert'],
        metadata: {
          sourceOrder: 0,
        },
      },
    ],
    risks: [
      {
        level: 'LOW',
        summary: 'risk=LOW; sources=WorkoutExpert',
        factors: ['stable'],
        sources: ['WorkoutExpert'],
        metadata: {},
      },
    ],
    confidence: {
      level: 'HIGH',
      summary: 'confidence=HIGH; score=2.40',
      factors: ['PRIMARY_EXPERT_PRESENT'],
      metadata: {
        score: 2.4,
      },
    },
    conflicts: [],
    supportingExperts: [],
    metadata: {
      requestId: 'request_123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: 'WorkoutExpert',
      participatingExpertIds: ['WorkoutExpert'],
      supportingExpertIds: [],
      blockedExpertIds: [],
      skippedExpertIds: [],
      routeValid: true,
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      candidateExpertCount: 1,
      participatingExpertCount: 1,
      recommendationCount: 1,
      riskCount: 1,
      conflictCount: 0,
      expertResultCount: 1,
      expertContributionCount: 1,
      compositionDurationMs: 1,
      planningDurationMs: 2,
      orchestrationDurationMs: 4,
      expertExecutionDurationMs: 5,
      executionDurationMs: undefined,
      runtimeCompleteness: 'FULL',
    },
  };
}

function buildPersonaGuidance() {
  return {
    tone: 'SUPPORTIVE',
    verbosity: 'SHORT',
    focus: 'WORKOUT',
    directiveLevel: 'MEDIUM',
    empathyLevel: 'MEDIUM',
    encouragementLevel: 'MEDIUM',
    technicalDepth: 'INTERMEDIATE',
    urgency: 'LOW',
    celebrationLevel: 'LOW',
    safetyLevel: 'NORMAL',
    communicationStyle: {
      tone: 'SUPPORTIVE',
      directiveLevel: 'MEDIUM',
      empathyLevel: 'MEDIUM',
      encouragementLevel: 'MEDIUM',
      technicalDepth: 'INTERMEDIATE',
      urgency: 'LOW',
      celebrationLevel: 'LOW',
      safetyLevel: 'NORMAL',
    },
    communicationRules: ['PRIORITIZE_WORKOUT', 'KEEP_SHORT'],
    metadata: {
      requestId: 'request_123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: 'WorkoutExpert',
      participatingExpertIds: ['WorkoutExpert'],
      supportingExpertIds: [],
      blockedExpertIds: [],
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      riskLevel: 'LOW',
      conflictCount: 0,
      recommendationCount: 1,
      communicationRuleCount: 2,
      runtimeCompleteness: 'FULL',
      userProfileId: 'profile_123',
      activityLevel: 'medium',
      technicalDepthSource: 'INTERMEDIATE',
      toneSource: 'SUPPORTIVE',
      safetySource: 'NORMAL',
      focusSource: 'WorkoutExpert',
    },
  } as const;
}

function buildExplanation() {
  return {
    primaryExpertId: 'WorkoutExpert',
    participatingExperts: ['WorkoutExpert'],
    supportingExperts: ['RecoveryExpert'],
    evidence: [
      {
        type: 'WORKOUT_HISTORY',
        source: 'HEALTH_CONTEXT',
        importance: 'HIGH',
        confidence: 'HIGH',
        availability: 'AVAILABLE',
        metadata: {
          workoutLogCount: 1,
        },
      },
    ],
    decisionReasons: [
      {
        code: 'FOCUS_WORKOUT',
        decisionType: 'FOCUS',
        supportingEvidence: [],
        supportingExperts: ['WorkoutExpert'],
        priority: 'MEDIUM',
        reasonCategory: 'WORKOUT',
        metadata: {},
      },
    ],
    recommendationReasons: [
      {
        recommendationCode: 'MAINTAIN_TODAY',
        supportingEvidence: [],
        supportingExperts: ['WorkoutExpert'],
        priority: 'LOW',
        reasonCategory: 'WORKOUT',
        metadata: {},
      },
    ],
    riskExplanations: [
      {
        riskLevel: 'LOW',
        supportingEvidence: [],
        supportingExperts: ['WorkoutExpert'],
        severity: 'LOW',
        metadata: {},
      },
    ],
    confidenceExplanation: {
      confidence: 'HIGH',
      supportingEvidenceCount: 1,
      supportingExpertCount: 1,
      missingEvidenceCount: 0,
      policyRestrictions: [],
      metadata: {},
    },
    conflictExplanations: [],
    missingEvidence: [],
    metadata: {
      requestId: 'request_123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: 'WorkoutExpert',
      participatingExpertIds: ['WorkoutExpert'],
      supportingExpertIds: ['RecoveryExpert'],
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      runtimeCompleteness: 'FULL',
      evidenceCount: 1,
      explanationCount: 2,
      recommendationCount: 1,
      riskCount: 1,
      conflictCount: 0,
      missingEvidenceCount: 0,
      blockedExpertCount: 0,
      blockedRecommendationCount: 0,
      personaTone: 'SUPPORTIVE',
      personaFocus: 'WORKOUT',
      personaSafetyLevel: 'NORMAL',
      personaUrgency: 'LOW',
      explanationVersion: 'coach-explainability-v1',
    },
  } as const;
}

function buildExecutionResult() {
  const toolExecutionOutcome = buildToolExecutionOutcome();

  return {
    assistantText: 'Agent runtime reply',
    fallbackUsed: false,
    executedSteps: [
      {
        step: 'LOAD_CONTEXT',
        status: 'completed',
        startedAt: '2026-05-04T10:00:00.000Z',
        completedAt: '2026-05-04T10:00:00.000Z',
        summary: 'Loaded context and prepared execution state.',
        metadata: {
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
          selectedDomainCount: 8,
        },
      },
      {
        step: 'EXECUTE_TOOL',
        status: 'completed',
        startedAt: '2026-05-04T10:00:00.000Z',
        completedAt: '2026-05-04T10:00:00.000Z',
        summary: 'Executed selected read-only tools.',
        metadata: {
          selectedToolIds: toolExecutionOutcome.metrics.selectedToolIds,
          executedToolCount: toolExecutionOutcome.metrics.executedToolCount,
          skippedToolCount: toolExecutionOutcome.metrics.skippedToolCount,
        },
      },
      {
        step: 'BUILD_PROMPT',
        status: 'completed',
        startedAt: '2026-05-04T10:00:00.000Z',
        completedAt: '2026-05-04T10:00:00.000Z',
        summary: 'Built the deterministic prompt.',
        metadata: {
          promptVersion: 'coach-chat-prompt-v1',
        },
      },
      {
        step: 'CALL_LLM',
        status: 'completed',
        startedAt: '2026-05-04T10:00:00.000Z',
        completedAt: '2026-05-04T10:00:00.000Z',
        summary: 'Generated the provider-backed reply.',
        metadata: {
          source: 'llm',
          provider: 'openai',
          model: 'gpt-4.1-mini',
        },
      },
      {
        step: 'PERSIST_MESSAGES',
        status: 'completed',
        startedAt: '2026-05-04T10:00:00.000Z',
        completedAt: '2026-05-04T10:00:00.000Z',
        summary: 'Persisted the assistant message.',
        metadata: {
          source: 'llm',
        },
      },
      {
        step: 'UPDATE_MEMORY',
        status: 'completed',
        startedAt: '2026-05-04T10:00:00.000Z',
        completedAt: '2026-05-04T10:00:00.000Z',
        summary: 'Updated session and conversation memory.',
        metadata: {
          conversationMemorySize: 1,
          sessionMemorySize: 11,
        },
      },
    ],
    actionResults: [
      {
        action: {
          type: 'READ_USER_PROFILE',
          domain: 'user_profile',
          summary: 'Inspect the user profile context selected by the policy.',
        },
        status: 'skipped',
        summary: 'No matching tool execution was available for the action.',
        metadata: {
          reason: 'no-matching-tool-result',
        },
      },
      {
        action: {
          type: 'READ_TRAINING_CONTEXT',
          domain: 'training',
          summary: 'Inspect the training context selected by the policy.',
        },
        status: 'success',
        summary: 'Loaded training context.',
        metadata: {
          readOnly: true,
        },
      },
      {
        action: {
          type: 'READ_RECOVERY_CONTEXT',
          domain: 'recovery',
          summary: 'Inspect the recovery context selected by the policy.',
        },
        status: 'success',
        summary: 'Loaded recovery context.',
        metadata: {
          readOnly: true,
        },
      },
      {
        action: {
          type: 'READ_GOALS_CONTEXT',
          domain: 'goals',
          summary: 'Inspect the goals context selected by the policy.',
        },
        status: 'success',
        summary: 'Loaded goal context.',
        metadata: {
          readOnly: true,
        },
      },
      {
        action: {
          type: 'READ_PROGRESS_CONTEXT',
          domain: 'progress',
          summary: 'Inspect the progress context selected by the policy.',
        },
        status: 'skipped',
        summary: 'No matching tool execution was available for the action.',
        metadata: {
          reason: 'no-matching-tool-result',
        },
      },
      {
        action: {
          type: 'READ_COACH_DECISION',
          domain: 'coach_decision',
          summary: 'Inspect the coach decision selected by the policy.',
        },
        status: 'skipped',
        summary: 'No matching tool execution was available for the action.',
        metadata: {
          reason: 'no-matching-tool-result',
        },
      },
      {
        action: {
          type: 'READ_MEMORY',
          domain: 'conversation_memory',
          summary: 'Inspect the conversation memory selected by the policy.',
        },
        status: 'success',
        summary: 'Loaded conversation memory.',
        metadata: {
          source: 'coach-conversation-memory-repository',
          emptyResult: false,
        },
      },
      {
        action: {
          type: 'READ_RECENT_MESSAGES',
          domain: 'recent_messages',
          summary: 'Inspect the recent messages selected by the policy.',
        },
        status: 'success',
        summary: 'Loaded conversation memory.',
        metadata: {
          source: 'coach-conversation-memory-repository',
          emptyResult: false,
        },
      },
      {
        action: {
          type: 'GENERATE_REPLY',
          domain: 'coach_decision',
          summary:
            'Generate the final coaching reply after contextual inspection.',
        },
        status: 'success',
        summary: 'Generated the final reply step.',
        metadata: {
          source: 'reply-orchestrator',
        },
      },
    ],
    prompt: {
      promptVersion: 'coach-chat-prompt-v1',
      messages: [{ role: 'system', content: 'prompt' }],
    },
    reply: {
      content: 'Agent runtime reply',
      source: 'llm',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      promptVersion: 'coach-chat-prompt-v1',
    },
    toolExecutionOutcome,
    memorySnapshot: {
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
        createdAt: '2026-05-04T10:00:00.000Z',
        updatedAt: '2026-05-04T10:00:00.000Z',
      },
      sessionMemory: {
        conversationId: 'conversation_123',
        entries: [],
        recentGoals: [],
        recentCoachDecisions: [],
        recentToolResults: [],
        temporaryPreferences: {},
        recentExecutionSummaries: [],
        createdAt: '2026-05-04T10:00:00.000Z',
        updatedAt: '2026-05-04T10:00:00.000Z',
        expiresAt: '2026-05-04T10:30:00.000Z',
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
    },
    state: {
      requestId: 'request_123',
      conversationId: 'conversation_123',
      currentStep: 'UPDATE_MEMORY',
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      executionDurationMs: 10,
      toolResults: toolExecutionOutcome.results,
      memorySnapshot: {
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
          createdAt: '2026-05-04T10:00:00.000Z',
          updatedAt: '2026-05-04T10:00:00.000Z',
        },
        sessionMemory: {
          conversationId: 'conversation_123',
          entries: [],
          recentGoals: [],
          recentCoachDecisions: [],
          recentToolResults: [],
          temporaryPreferences: {},
          recentExecutionSummaries: [],
          createdAt: '2026-05-04T10:00:00.000Z',
          updatedAt: '2026-05-04T10:00:00.000Z',
          expiresAt: '2026-05-04T10:30:00.000Z',
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
      },
      planningMetadata: {
        plan: {
          intent: 'TRAINING',
          requiredContextDomains: ['training'],
          responseMode: 'stream',
          safetyConstraints: [
            'deterministic_first',
            'no_tool_execution',
            'public_api_unchanged',
            'fallback_required',
          ],
          maxSteps: 6,
          actions: [],
          candidateTools: [],
          selectedTools: [],
          executionStrategy: 'MULTI_CONTEXT',
          planningSteps: [],
          maximumExecutionDepth: 4,
          expectedCost: 14,
          expectedLatencyMs: 127,
          validation: { status: 'valid', issues: [] },
          summary: 'intent=TRAINING; strategy=MULTI_CONTEXT',
        },
        validation: { status: 'valid', issues: [] },
        selectedDomainCount: 8,
        selectedToolCount: 13,
        candidateToolCount: 8,
      },
      runtimeMetadata: {
        enabled: true,
        detectedIntent: 'TRAINING',
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
        toolExecutionEnabled: true,
        fallbackUsed: false,
      },
      lifecycleEvents: [],
    },
    lifecycleEvents: [],
  };
}

function buildToolExecutionOutcome(): AgentToolExecutionOutcome {
  return {
    metrics: {
      enabled: true,
      maxToolCalls: 4,
      timeoutMs: 3000,
      selectedToolCount: 13,
      executedToolCount: 3,
      skippedToolCount: 10,
      failedToolCount: 0,
      timeoutCount: 0,
      totalDurationMs: 9,
      selectedToolIds: [
        'TrainingTool',
        'RecoveryTool',
        'GoalTool',
        'ProgressTool',
        'HealthContextTool',
        'CoachDecisionTool',
        'ConversationMemoryTool',
        'UserProfileTool',
        'NutritionTool',
        'HabitTool',
        'DashboardTool',
        'PersonalizationTool',
        'NotificationTool',
      ],
      executedToolIds: ['TrainingTool', 'RecoveryTool', 'GoalTool'],
      skippedToolIds: [
        'ProgressTool',
        'HealthContextTool',
        'CoachDecisionTool',
        'ConversationMemoryTool',
        'UserProfileTool',
        'NutritionTool',
        'HabitTool',
        'DashboardTool',
        'PersonalizationTool',
        'NotificationTool',
      ],
      failedToolIds: [],
      timeoutToolIds: [],
      perToolDurationMs: [
        { toolId: 'TrainingTool', durationMs: 2 },
        { toolId: 'RecoveryTool', durationMs: 3 },
        { toolId: 'GoalTool', durationMs: 4 },
        { toolId: 'ProgressTool', durationMs: 0 },
        { toolId: 'HealthContextTool', durationMs: 0 },
        { toolId: 'CoachDecisionTool', durationMs: 0 },
        { toolId: 'ConversationMemoryTool', durationMs: 0 },
        { toolId: 'UserProfileTool', durationMs: 0 },
        { toolId: 'NutritionTool', durationMs: 0 },
        { toolId: 'HabitTool', durationMs: 0 },
        { toolId: 'DashboardTool', durationMs: 0 },
        { toolId: 'PersonalizationTool', durationMs: 0 },
        { toolId: 'NotificationTool', durationMs: 0 },
      ],
    },
    results: [
      {
        toolId: 'TrainingTool',
        status: 'SUCCESS',
        summary: 'Loaded training context.',
        data: { training: true },
        durationMs: 2,
        metadata: { readOnly: true },
      },
      {
        toolId: 'RecoveryTool',
        status: 'SUCCESS',
        summary: 'Loaded recovery context.',
        data: { recovery: true },
        durationMs: 3,
        metadata: { readOnly: true },
      },
      {
        toolId: 'GoalTool',
        status: 'SUCCESS',
        summary: 'Loaded goal context.',
        data: { goal: true },
        durationMs: 4,
        metadata: { readOnly: true },
      },
      {
        toolId: 'ProgressTool',
        status: 'SKIPPED',
        summary: 'Tool is not supported by the execution pipeline.',
        data: null,
        durationMs: 0,
        errorCode: 'TOOL_NOT_SUPPORTED',
        metadata: { readOnly: true },
      },
      {
        toolId: 'HealthContextTool',
        status: 'SKIPPED',
        summary: 'Tool is not supported by the execution pipeline.',
        data: null,
        durationMs: 0,
        errorCode: 'TOOL_NOT_SUPPORTED',
        metadata: { readOnly: true },
      },
      {
        toolId: 'CoachDecisionTool',
        status: 'SKIPPED',
        summary: 'Tool is not supported by the execution pipeline.',
        data: null,
        durationMs: 0,
        errorCode: 'TOOL_NOT_SUPPORTED',
        metadata: { readOnly: true },
      },
      {
        toolId: 'ConversationMemoryTool',
        status: 'SKIPPED',
        summary: 'Tool is not supported by the execution pipeline.',
        data: null,
        durationMs: 0,
        errorCode: 'TOOL_NOT_SUPPORTED',
        metadata: { readOnly: true },
      },
      {
        toolId: 'UserProfileTool',
        status: 'SKIPPED',
        summary: 'Tool is not supported by the execution pipeline.',
        data: null,
        durationMs: 0,
        errorCode: 'TOOL_NOT_SUPPORTED',
        metadata: { readOnly: true },
      },
    ],
  };
}

function buildRolloutAssignment() {
  return {
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
  } as const;
}
