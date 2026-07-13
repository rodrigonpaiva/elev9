import { AgentContextOrchestratorService } from './agent-context-orchestrator.service';
import { AgentContextSelectionPolicy } from './agent-context-selection.policy';
import { AgentIntentClassifierService } from './agent-intent-classifier.service';
import { AgentPolicyEngineService } from './policies/agent-policy.engine.service';
import { AgentPolicyRegistry } from './policies/agent-policy.registry';
import { CoachChatContextLoaderService } from '../chat/coach-chat-context-loader.service';

describe('AgentContextOrchestratorService', () => {
  let coachChatContextLoaderService: {
    load: jest.MockedFunction<CoachChatContextLoaderService['load']>;
  };
  let service: AgentContextOrchestratorService;

  beforeEach(() => {
    coachChatContextLoaderService = {
      load: jest.fn().mockResolvedValue(buildLoadedContext()),
    };

    service = new AgentContextOrchestratorService(
      new AgentIntentClassifierService(),
      new AgentContextSelectionPolicy(new AgentPolicyRegistry()),
      {
        evaluate: jest
          .fn()
          .mockImplementation(({ intent }) => buildPolicyEvaluation(intent)),
      } as unknown as AgentPolicyEngineService,
      coachChatContextLoaderService as unknown as CoachChatContextLoaderService,
    );
  });

  it('selects domains and builds normalized context for training intent', async () => {
    const result = await service.orchestrate(buildRequest(), {
      conversationState: buildConversationState(),
    });

    expect(result.intent).toBe('TRAINING');
    expect(result.selectedDomains).toEqual([
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
      'training',
      'recovery',
      'goals',
      'progress',
    ]);
    expect(coachChatContextLoaderService.load).toHaveBeenCalledWith(
      'auth_user_123',
      expect.objectContaining({
        userProfileId: 'profile_123',
        domains: result.selectedDomains,
      }),
    );
    expect(result.context).toMatchObject({
      intent: 'TRAINING',
      selectedDomains: result.selectedDomains,
      coachDecision: expect.objectContaining({
        priority: 'training',
      }),
      conversationMemory: expect.objectContaining({
        summary: 'Conversation memory summary',
      }),
    });
    expect(result.metadata).toMatchObject({
      detectedIntent: 'TRAINING',
      selectedDomainCount: 8,
      policyDecision: expect.objectContaining({
        approved: true,
        blocked: false,
      }),
    });
  });

  it('defaults to general chat when intent is not specific', async () => {
    const result = await service.orchestrate(
      {
        ...buildRequest(),
        userMessage: 'Hey coach, what do you think?',
      },
      {
        conversationState: buildConversationState(),
      },
    );

    expect(result.intent).toBe('GENERAL_CHAT');
    expect(result.selectedDomains).toEqual([
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
    ]);
  });
});

function buildPolicyEvaluation(intent: 'TRAINING' | 'GENERAL_CHAT') {
  const allowedDomains =
    intent === 'TRAINING'
      ? [
          'user_profile',
          'conversation_memory',
          'recent_messages',
          'coach_decision',
          'training',
          'recovery',
          'goals',
          'progress',
        ]
      : [
          'user_profile',
          'conversation_memory',
          'recent_messages',
          'coach_decision',
        ];

  return {
    decision: {
      approved: true,
      blocked: false,
      fallbackRequired: false,
      allowedTools: [],
      allowedDomains,
      allowedLLM: true,
      metadata: {
        stage: 'CONTEXT',
        evaluatedPolicyIds: [],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedLlmUsage: false,
        allowedDomainCount: allowedDomains.length,
        allowedToolCount: 0,
        estimatedCost: 0,
        estimatedLatencyMs: 0,
        maximumExecutionDepth: 0,
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
    } as const,
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
      metadata: {},
    },
  };
}

function buildLoadedContext() {
  return {
    userProfileId: 'profile_123',
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
    },
    coachDecision: {
      priority: 'training',
      headline: 'Train today',
      summary: 'You are ready.',
      actionItems: ['Train'],
      influences: [],
    },
    notification: undefined,
    notificationMemory: undefined,
    habit: undefined,
    habitMemory: undefined,
    personalization: undefined,
    personalizationMemory: undefined,
  };
}
