import { AgentRuntimeConfigService } from '../agent-runtime.config';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import { AgentToolExecutionPolicy } from './agent-tool-execution.policy';
import { AgentToolExecutorService } from './agent-tool-executor.service';
import type { AgentPlan, AgentRequest } from '../agent.types';
import type { AgentToolDescriptor } from './agent-tool.types';
import type { UserProfileRepository } from '../../../../../users/domain/repositories/user-profile.repository';
import type { AdaptiveTrainingRecommendationRepository } from '../../../../../training/domain/repositories/adaptive-training-recommendation.repository';
import type { NutritionPlanRepository } from '../../../../../nutrition/domain/repositories/nutrition-plan.repository';
import type { RecoverySnapshotRepository } from '../../../../../recovery/domain/repositories/recovery-snapshot.repository';
import type { GoalRepository } from '../../../../../goals/domain/repositories/goal.repository';
import type { GoalProgressSnapshotRepository } from '../../../../../goals/domain/repositories/goal-progress-snapshot.repository';
import type { GoalForecastRepository } from '../../../../../goals/domain/repositories/goal-forecast.repository';
import type { CoachConversationMemoryRepository } from '../../../../domain/repositories/coach-conversation-memory.repository';
import { CoachExpertRegistry } from '../../experts/coach-expert.registry';

describe('AgentToolExecutorService', () => {
  const userProfileRepository = {
    findByAuthUserId: jest.fn(),
  } as unknown as jest.Mocked<Pick<UserProfileRepository, 'findByAuthUserId'>>;
  const adaptiveTrainingRecommendationRepository = {
    findLatestByUserProfileId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<AdaptiveTrainingRecommendationRepository, 'findLatestByUserProfileId'>
  >;
  const nutritionPlanRepository = {
    findActiveByUserProfileId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<NutritionPlanRepository, 'findActiveByUserProfileId'>
  >;
  const recoverySnapshotRepository = {
    findLatestByUserProfileId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<RecoverySnapshotRepository, 'findLatestByUserProfileId'>
  >;
  const goalRepository = {
    findActiveByUserProfileId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<GoalRepository, 'findActiveByUserProfileId'>
  >;
  const goalProgressSnapshotRepository = {
    findLatestByGoalId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<GoalProgressSnapshotRepository, 'findLatestByGoalId'>
  >;
  const goalForecastRepository = {
    findByGoalId: jest.fn(),
  } as unknown as jest.Mocked<Pick<GoalForecastRepository, 'findByGoalId'>>;
  const coachConversationMemoryRepository = {
    findByConversationId: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<CoachConversationMemoryRepository, 'findByConversationId'>
  >;

  let registry: AgentToolRegistryService;
  let config: jest.Mocked<
    Pick<
      AgentRuntimeConfigService,
      'isToolsEnabled' | 'getMaxToolCalls' | 'getToolTimeoutMs'
    >
  >;
  let executor: AgentToolExecutorService;

  beforeEach(() => {
    jest.clearAllMocks();

    registry = new AgentToolRegistryService();
    config = {
      isToolsEnabled: jest.fn().mockReturnValue(true),
      getMaxToolCalls: jest.fn().mockReturnValue(4),
      getToolTimeoutMs: jest.fn().mockReturnValue(3000),
    };
    executor = new AgentToolExecutorService(
      config as unknown as AgentRuntimeConfigService,
      new AgentToolExecutionPolicy(),
      registry,
      userProfileRepository as unknown as UserProfileRepository,
      adaptiveTrainingRecommendationRepository as unknown as AdaptiveTrainingRecommendationRepository,
      nutritionPlanRepository as unknown as NutritionPlanRepository,
      recoverySnapshotRepository as unknown as RecoverySnapshotRepository,
      goalRepository as unknown as GoalRepository,
      goalProgressSnapshotRepository as unknown as GoalProgressSnapshotRepository,
      goalForecastRepository as unknown as GoalForecastRepository,
      coachConversationMemoryRepository as unknown as CoachConversationMemoryRepository,
    );
  });

  it('skips execution when tools are disabled', async () => {
    config.isToolsEnabled.mockReturnValue(false);
    const plan = buildPlan(registry, ['ConversationMemoryTool']);

    const outcome = await executor.execute({
      request: buildRequest(),
      plan,
      conversationState: buildConversationState(),
    });

    expect(outcome.metrics.enabled).toBe(false);
    expect(outcome.metrics.selectedToolCount).toBe(1);
    expect(outcome.metrics.executedToolCount).toBe(0);
    expect(outcome.metrics.skippedToolCount).toBe(1);
    expect(outcome.results).toEqual([
      expect.objectContaining({
        toolId: 'ConversationMemoryTool',
        status: 'SKIPPED',
        errorCode: 'TOOLS_DISABLED',
      }),
    ]);
    expect(
      coachConversationMemoryRepository.findByConversationId,
    ).not.toHaveBeenCalled();
  });

  it('enforces the read-only policy for supported tools', async () => {
    registry = new AgentToolRegistryService([
      {
        id: 'TrainingTool',
        displayName: 'Training Tool',
        description: 'Mutation-capable training tool placeholder.',
        category: 'READ_CONTEXT',
        supportedIntents: ['TRAINING'],
        supportedContextDomains: ['training'],
        estimatedCost: 1,
        estimatedLatencyMs: 1,
        enabled: true,
        version: '1.0.0',
        metadata: {
          capabilities: ['GENERATE_REPLY'],
        },
      },
    ]);
    executor = buildExecutor({
      config,
      registry,
      userProfileRepository,
      adaptiveTrainingRecommendationRepository,
      nutritionPlanRepository,
      recoverySnapshotRepository,
      goalRepository,
      goalProgressSnapshotRepository,
      goalForecastRepository,
      coachConversationMemoryRepository,
    });

    const outcome = await executor.execute({
      request: buildRequest(),
      plan: buildPlan(registry, ['TrainingTool']),
      conversationState: buildConversationState(),
    });

    expect(outcome.results[0]).toEqual(
      expect.objectContaining({
        toolId: 'TrainingTool',
        status: 'SKIPPED',
        errorCode: 'TOOL_NOT_READ_ONLY',
      }),
    );
  });

  it('enforces max tool calls', async () => {
    config.getMaxToolCalls.mockReturnValue(1);
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      buildConversationMemory(),
    );
    const plan = buildPlan(registry, [
      'UserProfileTool',
      'ConversationMemoryTool',
    ]);

    const outcome = await executor.execute({
      request: buildRequest(),
      plan,
      conversationState: buildConversationState(),
    });

    expect(outcome.results[0]).toEqual(
      expect.objectContaining({
        toolId: 'UserProfileTool',
        status: 'SUCCESS',
      }),
    );
    expect(outcome.results[1]).toEqual(
      expect.objectContaining({
        toolId: 'ConversationMemoryTool',
        status: 'SKIPPED',
        errorCode: 'MAX_TOOL_CALLS_REACHED',
      }),
    );
    expect(outcome.metrics.executedToolCount).toBe(1);
    expect(outcome.metrics.skippedToolCount).toBe(1);
  });

  it('handles tool timeout deterministically', async () => {
    config.getToolTimeoutMs.mockReturnValue(1);
    coachConversationMemoryRepository.findByConversationId.mockReturnValue(
      new Promise(() => undefined),
    );

    const outcome = await executor.execute({
      request: buildRequest(),
      plan: buildPlan(registry, ['ConversationMemoryTool']),
      conversationState: buildConversationState(),
    });

    expect(outcome.results[0]).toEqual(
      expect.objectContaining({
        toolId: 'ConversationMemoryTool',
        status: 'TIMEOUT',
        errorCode: 'TIMEOUT',
      }),
    );
    expect(outcome.metrics.timeoutCount).toBe(1);
  });

  it('skips unsupported tools safely', async () => {
    const outcome = await executor.execute({
      request: buildRequest(),
      plan: buildPlan(registry, ['ProgressTool']),
      conversationState: buildConversationState(),
    });

    expect(outcome.results[0]).toEqual(
      expect.objectContaining({
        toolId: 'ProgressTool',
        status: 'SKIPPED',
        errorCode: 'TOOL_NOT_SUPPORTED',
      }),
    );
    expect(outcome.metrics.skippedToolCount).toBe(1);
  });

  it('normalizes failed tool execution', async () => {
    coachConversationMemoryRepository.findByConversationId.mockRejectedValue(
      new Error('boom'),
    );

    const outcome = await executor.execute({
      request: buildRequest(),
      plan: buildPlan(registry, ['ConversationMemoryTool']),
      conversationState: buildConversationState(),
    });

    expect(outcome.results[0]).toEqual(
      expect.objectContaining({
        toolId: 'ConversationMemoryTool',
        status: 'FAILED',
        errorCode: 'EXECUTION_FAILED',
        summary: 'Tool execution failed.',
      }),
    );
    expect(outcome.metrics.failedToolCount).toBe(1);
  });

  it('executes supported read-only tools successfully', async () => {
    coachConversationMemoryRepository.findByConversationId.mockResolvedValue(
      buildConversationMemory(),
    );

    const outcome = await executor.execute({
      request: buildRequest(),
      plan: buildPlan(registry, ['ConversationMemoryTool']),
      conversationState: buildConversationState(),
    });

    expect(outcome.results[0]).toEqual(
      expect.objectContaining({
        toolId: 'ConversationMemoryTool',
        status: 'SUCCESS',
        summary: 'Loaded conversation memory.',
        data: expect.objectContaining({
          conversationMemory: expect.objectContaining({
            conversationId: 'conversation_123',
            summary: 'Conversation memory summary',
          }),
        }),
      }),
    );
    expect(outcome.metrics.executedToolCount).toBe(1);
    expect(
      coachConversationMemoryRepository.findByConversationId,
    ).toHaveBeenCalledWith('conversation_123');
  });
});

function buildExecutor(input: {
  config: jest.Mocked<
    Pick<
      AgentRuntimeConfigService,
      'isToolsEnabled' | 'getMaxToolCalls' | 'getToolTimeoutMs'
    >
  >;
  registry: AgentToolRegistryService;
  userProfileRepository: jest.Mocked<
    Pick<UserProfileRepository, 'findByAuthUserId'>
  >;
  adaptiveTrainingRecommendationRepository: jest.Mocked<
    Pick<AdaptiveTrainingRecommendationRepository, 'findLatestByUserProfileId'>
  >;
  nutritionPlanRepository: jest.Mocked<
    Pick<NutritionPlanRepository, 'findActiveByUserProfileId'>
  >;
  recoverySnapshotRepository: jest.Mocked<
    Pick<RecoverySnapshotRepository, 'findLatestByUserProfileId'>
  >;
  goalRepository: jest.Mocked<
    Pick<GoalRepository, 'findActiveByUserProfileId'>
  >;
  goalProgressSnapshotRepository: jest.Mocked<
    Pick<GoalProgressSnapshotRepository, 'findLatestByGoalId'>
  >;
  goalForecastRepository: jest.Mocked<
    Pick<GoalForecastRepository, 'findByGoalId'>
  >;
  coachConversationMemoryRepository: jest.Mocked<
    Pick<CoachConversationMemoryRepository, 'findByConversationId'>
  >;
}): AgentToolExecutorService {
  return new AgentToolExecutorService(
    input.config as unknown as AgentRuntimeConfigService,
    new AgentToolExecutionPolicy(),
    input.registry,
    input.userProfileRepository as unknown as UserProfileRepository,
    input.adaptiveTrainingRecommendationRepository as unknown as AdaptiveTrainingRecommendationRepository,
    input.nutritionPlanRepository as unknown as NutritionPlanRepository,
    input.recoverySnapshotRepository as unknown as RecoverySnapshotRepository,
    input.goalRepository as unknown as GoalRepository,
    input.goalProgressSnapshotRepository as unknown as GoalProgressSnapshotRepository,
    input.goalForecastRepository as unknown as GoalForecastRepository,
    input.coachConversationMemoryRepository as unknown as CoachConversationMemoryRepository,
  );
}

function buildPlan(
  registry: AgentToolRegistryService,
  toolIds: string[],
): AgentPlan {
  const selectedTools = toolIds
    .map((toolId) => registry.getTool(toolId))
    .filter((tool): tool is AgentToolDescriptor => Boolean(tool));
  const expertRegistry = new CoachExpertRegistry();
  const candidateExperts = expertRegistry
    .getExpertsForIntent('TRAINING')
    .map((expert) => expert.metadata);
  const selectedExperts = expertRegistry
    .getExpertsForDomains(['training'])
    .map((expert) => expert.metadata);

  return {
    intent: 'TRAINING',
    requiredContextDomains: ['training'],
    candidateExperts,
    selectedExperts,
    expertPriorities: selectedExperts.map((expert) => ({
      expertId: expert.id,
      priority: expert.priority,
    })),
    expertCapabilities: [
      ...new Set(selectedExperts.flatMap((expert) => expert.capabilities)),
    ],
    responseMode: 'standard',
    safetyConstraints: [
      'deterministic_first',
      'no_tool_execution',
      'public_api_unchanged',
      'fallback_required',
    ],
    maxSteps: 6,
    actions: [],
    candidateTools: selectedTools,
    selectedTools,
    executionStrategy: 'MULTI_CONTEXT',
    planningSteps: [
      {
        step: 'CLASSIFY_INTENT',
        summary: 'Classify the agent intent.',
      },
    ],
    maximumExecutionDepth: 4,
    expectedCost: 1,
    expectedLatencyMs: 10,
    validation: {
      status: 'valid',
      issues: [],
    },
    summary: 'test-plan',
  };
}

function buildRequest(): AgentRequest {
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
    } as never,
  };
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
        generatedFromMessageCount: 2,
        version: 'memory-v1',
      },
    },
  };
}

function buildUserProfile() {
  return {
    id: 'profile_123',
    authUserId: 'auth_user_123',
    name: 'Elev9 User',
    language: 'en-US' as const,
    timezone: 'UTC' as const,
    status: 'active' as const,
    createdAt: new Date('2026-05-01T10:00:00.000Z'),
    updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    toJSON() {
      return this;
    },
  };
}

function buildConversationMemory() {
  return {
    conversationId: 'conversation_123',
    summary: 'Conversation memory summary',
    metadata: {
      generatedFromMessageCount: 2,
      version: 'memory-v1',
    },
  };
}
