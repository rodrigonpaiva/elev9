import { AgentExecutionEngineService } from './agent-execution.engine.service';
import { AgentExecutionPolicy } from './agent-execution.policy';
import { AgentExecutionValidator } from './agent-execution.validator';
import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentMemoryService } from '../memory/agent-memory.service';
import { AgentPolicyEngineService } from '../policies/agent-policy.engine.service';
import { AgentToolExecutorService } from '../tools/agent-tool-executor.service';
import { AiPromptBuilder } from '../../llm/ai-prompt-builder.service';
import { CoachChatMemoryUpdaterService } from '../../chat/coach-chat-memory-updater.service';
import { CoachChatPersistenceService } from '../../chat/coach-chat-persistence.service';
import { CoachChatReplyGenerator } from '../../chat/coach-chat-reply-generator.service';
import { CoachChatReplyOrchestratorService } from '../../chat/coach-chat-reply-orchestrator.service';
import { AgentToolRegistryService } from '../tools/agent-tool-registry.service';
import { CoachExpertRegistry } from '../../experts/coach-expert.registry';
import { CoachExpertRoutingPolicy } from '../../experts/coach-expert-router';
import { CoachExpertRouterService } from '../../experts/coach-expert-router';

describe('AgentExecutionEngineService', () => {
  let aiPromptBuilder: jest.Mocked<Pick<AiPromptBuilder, 'build'>>;
  let coachChatReplyOrchestratorService: jest.Mocked<
    Pick<CoachChatReplyOrchestratorService, 'execute'>
  >;
  let coachChatPersistenceService: jest.Mocked<
    Pick<CoachChatPersistenceService, 'persistAssistantMessage'>
  >;
  let coachChatMemoryUpdaterService: jest.Mocked<
    Pick<CoachChatMemoryUpdaterService, 'update'>
  >;
  let coachChatReplyGenerator: jest.Mocked<
    Pick<CoachChatReplyGenerator, 'generate'>
  >;
  let agentMemoryService: jest.Mocked<
    Pick<
      AgentMemoryService,
      | 'updateWorkingMemory'
      | 'updateSessionMemory'
      | 'loadConversationMemory'
      | 'createSnapshot'
    >
  >;
  let agentToolExecutorService: jest.Mocked<
    Pick<AgentToolExecutorService, 'execute'>
  >;
  let engine: AgentExecutionEngineService;

  beforeEach(() => {
    aiPromptBuilder = {
      build: jest.fn().mockReturnValue({
        promptVersion: 'coach-chat-prompt-v1',
        messages: [{ role: 'system', content: 'prompt' }],
      }),
    } as unknown as jest.Mocked<Pick<AiPromptBuilder, 'build'>>;
    coachChatReplyOrchestratorService = {
      execute: jest.fn().mockResolvedValue({
        content: 'Generated reply',
        source: 'llm',
        provider: 'openai',
        model: 'gpt-4.1-mini',
        promptVersion: 'coach-chat-prompt-v1',
      }),
    } as unknown as jest.Mocked<
      Pick<CoachChatReplyOrchestratorService, 'execute'>
    >;
    coachChatPersistenceService = {
      persistAssistantMessage: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<
      Pick<CoachChatPersistenceService, 'persistAssistantMessage'>
    >;
    coachChatMemoryUpdaterService = {
      update: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Pick<CoachChatMemoryUpdaterService, 'update'>>;
    coachChatReplyGenerator = {
      generate: jest.fn().mockReturnValue('Generated fallback reply'),
    } as unknown as jest.Mocked<Pick<CoachChatReplyGenerator, 'generate'>>;
    agentMemoryService = {
      updateWorkingMemory: jest.fn().mockReturnValue(undefined),
      updateSessionMemory: jest.fn().mockReturnValue(undefined),
      loadConversationMemory: jest.fn().mockResolvedValue({
        summary: 'Conversation memory summary',
        metadata: {
          generatedFromMessageCount: 12,
          version: 'memory-v1',
        },
      }),
      createSnapshot: jest.fn().mockReturnValue(buildMemorySnapshot()),
    } as unknown as jest.Mocked<
      Pick<
        AgentMemoryService,
        | 'updateWorkingMemory'
        | 'updateSessionMemory'
        | 'loadConversationMemory'
        | 'createSnapshot'
      >
    >;
    agentToolExecutorService = {
      execute: jest.fn().mockResolvedValue(buildToolExecutionOutcome()),
    } as unknown as jest.Mocked<Pick<AgentToolExecutorService, 'execute'>>;

    engine = new AgentExecutionEngineService(
      aiPromptBuilder as unknown as AiPromptBuilder,
      coachChatReplyOrchestratorService as unknown as CoachChatReplyOrchestratorService,
      coachChatPersistenceService as unknown as CoachChatPersistenceService,
      coachChatMemoryUpdaterService as unknown as CoachChatMemoryUpdaterService,
      coachChatReplyGenerator as unknown as CoachChatReplyGenerator,
      agentMemoryService as unknown as AgentMemoryService,
      agentToolExecutorService as unknown as AgentToolExecutorService,
      new AgentExecutionPolicy(),
      new AgentExecutionValidator(new AgentExecutionPolicy()),
      {
        isEnabled: jest.fn().mockReturnValue(true),
        isToolsEnabled: jest.fn().mockReturnValue(true),
        getMaxToolCalls: jest.fn().mockReturnValue(4),
        getToolTimeoutMs: jest.fn().mockReturnValue(3000),
      } as unknown as AgentRuntimeConfigService,
    );
  });

  it('executes sequential steps and refreshes working memory after each step', async () => {
    const result = await engine.execute(buildExecutionContext());

    expect(result.executedSteps.map((step) => step.step)).toEqual([
      'LOAD_CONTEXT',
      'EXECUTE_TOOL',
      'BUILD_PROMPT',
      'CALL_LLM',
      'PERSIST_MESSAGES',
      'UPDATE_MEMORY',
    ]);
    expect(agentMemoryService.updateWorkingMemory).toHaveBeenCalledTimes(6);
    expect(agentMemoryService.updateSessionMemory).toHaveBeenCalledTimes(1);
    expect(agentMemoryService.createSnapshot).toHaveBeenCalledTimes(1);
    expect(
      coachChatPersistenceService.persistAssistantMessage,
    ).toHaveBeenCalledTimes(1);
    expect(coachChatMemoryUpdaterService.update).toHaveBeenCalledTimes(1);
    expect(aiPromptBuilder.build).toHaveBeenCalledWith(
      expect.objectContaining({
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
    expect(result.fallbackUsed).toBe(false);
    expect(result.state.executionDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('selects the fallback step for fallback-only plans', async () => {
    const fallbackEngine = new AgentExecutionEngineService(
      aiPromptBuilder as unknown as AiPromptBuilder,
      {
        execute: jest.fn().mockResolvedValue({
          content: 'Fallback reply',
          source: 'heuristic',
        }),
      } as unknown as CoachChatReplyOrchestratorService,
      coachChatPersistenceService as unknown as CoachChatPersistenceService,
      coachChatMemoryUpdaterService as unknown as CoachChatMemoryUpdaterService,
      coachChatReplyGenerator as unknown as CoachChatReplyGenerator,
      agentMemoryService as unknown as AgentMemoryService,
      agentToolExecutorService as unknown as AgentToolExecutorService,
      new AgentExecutionPolicy(),
      new AgentExecutionValidator(new AgentExecutionPolicy()),
      {
        isEnabled: jest.fn().mockReturnValue(true),
        isToolsEnabled: jest.fn().mockReturnValue(true),
        getMaxToolCalls: jest.fn().mockReturnValue(4),
        getToolTimeoutMs: jest.fn().mockReturnValue(3000),
      } as unknown as AgentRuntimeConfigService,
    );

    const result = await fallbackEngine.execute({
      ...buildExecutionContext(),
      plan: {
        ...buildPlan(),
        executionStrategy: 'FALLBACK_ONLY',
      },
    });

    expect(result.executedSteps.map((step) => step.step)).toContain(
      'GENERATE_FALLBACK',
    );
    expect(result.fallbackUsed).toBe(true);
  });

  it('aborts when a critical step fails', async () => {
    coachChatReplyOrchestratorService.execute.mockRejectedValue(
      new Error('boom'),
    );

    await expect(engine.execute(buildExecutionContext())).rejects.toThrow(
      'boom',
    );
    expect(
      coachChatPersistenceService.persistAssistantMessage,
    ).not.toHaveBeenCalled();
    expect(coachChatMemoryUpdaterService.update).not.toHaveBeenCalled();
  });

  it('rejects invalid execution plans before the first step runs', async () => {
    await expect(
      engine.execute({
        ...buildExecutionContext(),
        plan: {
          ...buildPlan(),
          selectedTools: [],
        },
      }),
    ).rejects.toThrow('Invalid agent execution');
    expect(agentToolExecutorService.execute).not.toHaveBeenCalled();
  });
});

function buildExecutionContext() {
  return {
    request: buildRequest(),
    context: buildContext(),
    plan: buildPlan(),
    policyEvaluation: buildPolicyEvaluation(),
    conversationState: buildConversationState(),
    streaming: true,
    planningDurationMs: 2,
    orchestrationDurationMs: 4,
    composition: buildComposition(),
    personaGuidance: buildPersonaGuidance(),
    explanation: buildExplanation(),
  } as unknown as Parameters<AgentExecutionEngineService['execute']>[0];
}

function buildRequest() {
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
    streamingPreference: true,
    experimentMetadata: buildRolloutAssignment(),
  } as const;
}

function buildContext() {
  return {
    intent: 'TRAINING' as const,
    selectedDomains: [
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
      'training',
      'recovery',
      'goals',
      'progress',
    ] as const,
    healthContext: {
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      adherenceScore: 82,
      currentStreak: 5,
      averageWorkoutDuration: 54,
      fatigueLevel: 'LOW',
      availableEquipment: ['barbell', 'dumbbells'],
      limitations: [],
      todayWorkout: null,
      recentWorkoutLogs: [],
      generatedAt: new Date('2026-05-04T10:00:00.000Z'),
      goal: 'gain_muscle',
    },
    conversationMemory: {
      summary: 'Conversation memory summary',
      metadata: {
        generatedFromMessageCount: 12,
        version: 'memory-v1',
      },
    },
    recentMessages: [
      {
        role: 'user' as const,
        content: 'Last message from user',
        createdAt: '2026-05-04T09:55:00.000Z',
      },
    ],
    coachDecision: {
      priority: 'training',
      headline: 'Train today',
      summary: 'You are ready.',
      actionItems: ['Train'],
      influences: [],
    },
    safetyMetadata: {
      deterministicFirst: true,
      toolCallingEnabled: false,
      fallbackAllowed: true,
      promptVersion: 'coach-chat-prompt-v1',
    },
    rolloutMetadata: buildRolloutAssignment(),
  } as const;
}

function buildPlan() {
  const registry = new AgentToolRegistryService();
  const expertRegistry = new CoachExpertRegistry();
  const router = new CoachExpertRouterService(new CoachExpertRoutingPolicy());
  const trainingTool = registry.getTool('TrainingTool');
  const recoveryTool = registry.getTool('RecoveryTool');
  const goalTool = registry.getTool('GoalTool');
  const progressTool = registry.getTool('ProgressTool');
  const userProfileTool = registry.getTool('UserProfileTool');
  const conversationMemoryTool = registry.getTool('ConversationMemoryTool');
  const coachDecisionTool = registry.getTool('CoachDecisionTool');
  const healthContextTool = registry.getTool('HealthContextTool');
  const candidateExperts = expertRegistry
    .getExpertsForIntent('TRAINING')
    .map((expert) => expert.metadata);
  const routingDecision = router.route({
    requestId: 'request_123',
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
    candidateExperts,
    policyEvaluation: buildPolicyEvaluation(),
    maxExperts: 4,
  });

  return {
    intent: 'TRAINING' as const,
    requiredContextDomains: [
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
      'training',
      'recovery',
      'goals',
      'progress',
    ] as const,
    responseMode: 'stream' as const,
    safetyConstraints: [
      'deterministic_first',
      'no_tool_execution',
      'public_api_unchanged',
      'fallback_required',
    ] as const,
    maxSteps: 6,
    actions: [],
    candidateTools: [
      userProfileTool!,
      conversationMemoryTool!,
      coachDecisionTool!,
      healthContextTool!,
      trainingTool!,
      recoveryTool!,
      goalTool!,
      progressTool!,
    ],
    candidateExperts,
    selectedExperts: routingDecision.orderedExperts,
    expertRouting: routingDecision,
    selectedTools: [
      trainingTool!,
      recoveryTool!,
      goalTool!,
      progressTool!,
      healthContextTool!,
      coachDecisionTool!,
      conversationMemoryTool!,
      userProfileTool!,
    ],
    executionStrategy: 'MULTI_CONTEXT' as const,
    planningSteps: [
      { step: 'CLASSIFY_INTENT' as const, summary: 'Classify intent.' },
      { step: 'SELECT_CONTEXT' as const, summary: 'Select context.' },
    ],
    maximumExecutionDepth: 4,
    expectedCost: 14,
    expectedLatencyMs: 127,
    validation: { status: 'valid' as const, issues: [] },
    summary: 'intent=TRAINING; strategy=MULTI_CONTEXT',
  } as const;
}

function buildComposition() {
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
    participatingExperts: [],
    assessment: {
      summary:
        'primary=WorkoutExpert; findings=WORKOUT_CONSISTENCY; risk=LOW; confidence=HIGH; recommendations=MAINTAIN_TODAY; conflicts=0',
      keyFindings: ['WORKOUT_CONSISTENCY'],
      metadata: {},
    },
    summary:
      'primary=WorkoutExpert; findings=WORKOUT_CONSISTENCY; risk=LOW; confidence=HIGH; recommendations=MAINTAIN_TODAY; conflicts=0',
    keyFindings: ['WORKOUT_CONSISTENCY'],
    recommendations: [],
    risks: [],
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
      participatingExpertIds: [],
      supportingExpertIds: [],
      blockedExpertIds: [],
      skippedExpertIds: [],
      routeValid: true,
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      candidateExpertCount: 1,
      participatingExpertCount: 0,
      recommendationCount: 0,
      riskCount: 0,
      conflictCount: 0,
      expertResultCount: 0,
      expertContributionCount: 0,
      compositionDurationMs: 1,
      planningDurationMs: 2,
      orchestrationDurationMs: 4,
      expertExecutionDurationMs: 5,
      executionDurationMs: undefined,
      runtimeCompleteness: 'FULL',
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
  const allowedTools = [
    registry.getTool('TrainingTool'),
    registry.getTool('RecoveryTool'),
    registry.getTool('GoalTool'),
    registry.getTool('ProgressTool'),
    registry.getTool('HealthContextTool'),
    registry.getTool('CoachDecisionTool'),
    registry.getTool('ConversationMemoryTool'),
    registry.getTool('UserProfileTool'),
  ].filter(Boolean) as NonNullable<
    ReturnType<AgentToolRegistryService['getTool']>
  >[];
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
        stage: 'EXECUTION',
        evaluatedPolicyIds: [],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedLlmUsage: false,
        allowedDomainCount: allowedDomains.length,
        allowedToolCount: allowedTools.length,
        allowedExpertCount: allowedExperts.length,
        candidateExpertCount: allowedExperts.length,
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
    evidence: [],
    decisionReasons: [],
    recommendationReasons: [],
    riskExplanations: [],
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
      explanationCount: 0,
      recommendationCount: 0,
      riskCount: 0,
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
      metadata: {
        generatedFromMessageCount: 12,
        version: 'memory-v1',
      },
    },
  };
}

function buildMemorySnapshot() {
  return {
    workingMemory: {
      request: buildRequest(),
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
        generatedFromMessageCount: 12,
        version: 'memory-v1',
      },
    },
    metadata: {
      workingMemorySize: 7,
      sessionMemorySize: 11,
      conversationMemorySize: 12,
      snapshotCreated: true,
      expired: false,
      lifecycleEvents: [],
    },
  } as const;
}

function buildToolExecutionOutcome(): AgentToolExecutionOutcome {
  return {
    metrics: {
      enabled: true,
      maxToolCalls: 4,
      timeoutMs: 3000,
      selectedToolCount: 1,
      executedToolCount: 1,
      skippedToolCount: 0,
      failedToolCount: 0,
      timeoutCount: 0,
      totalDurationMs: 9,
      selectedToolIds: ['TrainingTool'],
      executedToolIds: ['TrainingTool'],
      skippedToolIds: [],
      failedToolIds: [],
      timeoutToolIds: [],
      perToolDurationMs: [{ toolId: 'TrainingTool', durationMs: 9 }],
    },
    results: [
      {
        toolId: 'TrainingTool',
        status: 'SUCCESS',
        summary: 'Loaded training context.',
        data: { training: true },
        durationMs: 9,
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
