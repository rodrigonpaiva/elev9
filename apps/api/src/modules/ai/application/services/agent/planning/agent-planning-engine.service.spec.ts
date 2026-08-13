import { AgentRuntimeConfigService } from '../agent-runtime.config';
import type {
  AgentContext,
  AgentContextDomain,
  AgentRequest,
} from '../agent.types';
import { AgentPlanningEngineService } from './agent-planning-engine.service';
import { AgentPlanningPolicy } from './agent-planning.policy';
import { AgentPlanValidator } from './agent-plan-validator.service';
import type { AgentPlanningStepName } from './agent-planning.types';
import { AgentToolRegistryService } from '../tools/agent-tool-registry.service';
import { CoachExpertRegistry } from '../../experts/coach-expert.registry';
import { CoachExpertRoutingPolicy } from '../../experts/coach-expert-router';
import { CoachExpertRouterService } from '../../experts/coach-expert-router';

describe('AgentPlanningEngineService', () => {
  const config = {
    getMaxSteps: jest.fn().mockReturnValue(6),
  } as unknown as AgentRuntimeConfigService;

  const engine = new AgentPlanningEngineService(
    new AgentPlanningPolicy(),
    new AgentPlanValidator(),
    config,
  );

  it('builds a deterministic immutable plan for training intent', () => {
    const registry = new AgentToolRegistryService();
    const expertRegistry = new CoachExpertRegistry();
    const routingDecision = buildRoutingDecision(
      'TRAINING',
      buildContext().selectedDomains,
      expertRegistry,
    );
    const policyEvaluation = buildPolicyEvaluation('TRAINING');
    const plan = engine.buildPlan({
      intent: 'TRAINING',
      selectedDomains: buildContext().selectedDomains,
      candidateExperts: expertRegistry
        .getExpertsForIntent('TRAINING')
        .map((expert) => expert.metadata),
      selectedExperts: routingDecision.orderedExperts,
      expertRouting: routingDecision,
      candidateTools: registry.getToolsForIntent('TRAINING'),
      selectedTools: registry.getToolsForContextDomains(
        buildContext().selectedDomains,
      ),
      actions: buildContextActions(),
      responseMode: 'stream',
      policyEvaluation,
    });

    expect(plan.executionStrategy).toBe('MULTI_CONTEXT');
    expect(plan.maximumExecutionDepth).toBe(4);
    expect(plan.validation).toEqual({ status: 'valid', issues: [] });
    expect(plan.planningSteps.map((step) => step.step)).toEqual([
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
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.selectedTools)).toBe(true);
  });

  it('selects direct reply for general chat and fallback for unknown intent', () => {
    const registry = new AgentToolRegistryService();
    const expertRegistry = new CoachExpertRegistry();
    const generalRoutingDecision = buildRoutingDecision(
      'GENERAL_CHAT',
      [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
      ],
      expertRegistry,
    );
    const unknownRoutingDecision = buildRoutingDecision(
      'UNKNOWN',
      [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
      ],
      expertRegistry,
    );
    const generalPolicyEvaluation = buildPolicyEvaluation('GENERAL_CHAT');
    const unknownPolicyEvaluation = buildPolicyEvaluation('UNKNOWN');
    const general = engine.buildPlan({
      intent: 'GENERAL_CHAT',
      selectedDomains: [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
      ],
      candidateExperts: expertRegistry
        .getExpertsForIntent('GENERAL_CHAT')
        .map((expert) => expert.metadata),
      selectedExperts: generalRoutingDecision.orderedExperts,
      expertRouting: generalRoutingDecision,
      candidateTools: registry.getToolsForIntent('GENERAL_CHAT'),
      selectedTools: registry.getToolsForContextDomains([
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
      ]),
      actions: buildContextActions(),
      responseMode: 'standard',
      policyEvaluation: generalPolicyEvaluation,
    });
    const unknown = engine.buildPlan({
      intent: 'UNKNOWN',
      selectedDomains: [
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
      ],
      candidateExperts: expertRegistry
        .getExpertsForIntent('UNKNOWN')
        .map((expert) => expert.metadata),
      selectedExperts: unknownRoutingDecision.orderedExperts,
      expertRouting: unknownRoutingDecision,
      candidateTools: registry.getToolsForIntent('UNKNOWN'),
      selectedTools: registry.getToolsForContextDomains([
        'user_profile',
        'conversation_memory',
        'recent_messages',
        'coach_decision',
      ]),
      actions: buildContextActions(),
      responseMode: 'standard',
      policyEvaluation: unknownPolicyEvaluation,
    });

    expect(general.executionStrategy).toBe('DIRECT_REPLY');
    expect(unknown.executionStrategy).toBe('FALLBACK_ONLY');
  });

  it('removes duplicated domains, tools, actions, and planning steps during validation', () => {
    const registry = new AgentToolRegistryService();
    const expertRegistry = new CoachExpertRegistry();
    const routingDecision = buildRoutingDecision(
      'TRAINING',
      ['user_profile', 'conversation_memory', 'training', 'training', 'goals'],
      expertRegistry,
    );
    const duplicateTool = registry.getTool('TrainingTool');
    const policyEvaluation = buildPolicyEvaluation('TRAINING');
    const plan = new AgentPlanningEngineService(
      new AgentPlanningPolicy(),
      new AgentPlanValidator(),
      config,
    ).buildPlan({
      intent: 'TRAINING',
      selectedDomains: [
        'user_profile',
        'conversation_memory',
        'training',
        'training',
        'goals',
      ],
      candidateExperts: expertRegistry
        .getExpertsForIntent('TRAINING')
        .map((expert) => expert.metadata),
      selectedExperts: routingDecision.orderedExperts,
      expertRouting: routingDecision,
      candidateTools: [
        duplicateTool!,
        duplicateTool!,
        ...registry.getToolsForIntent('TRAINING'),
      ],
      selectedTools: [
        duplicateTool!,
        duplicateTool!,
        ...registry.getToolsForContextDomains(['training', 'goals']),
      ],
      actions: [...buildContextActions(), ...buildContextActions()],
      responseMode: 'standard',
      policyEvaluation,
    });

    expect(plan.requiredContextDomains).toEqual([
      'user_profile',
      'conversation_memory',
      'recent_messages',
      'coach_decision',
      'training',
      'recovery',
      'goals',
      'progress',
    ]);
    expect(
      plan.candidateTools.filter((tool) => tool.id === 'TrainingTool'),
    ).toHaveLength(1);
    expect(
      plan.selectedTools.filter((tool) => tool.id === 'TrainingTool'),
    ).toHaveLength(1);
    expect(
      plan.actions.filter((action) => action.type === 'READ_TRAINING_CONTEXT'),
    ).toHaveLength(1);
  });

  it('rejects plans that exceed the configured maximum execution depth', () => {
    const validator = new AgentPlanValidator();
    const expertRegistry = new CoachExpertRegistry();
    const routingDecision = buildRoutingDecision(
      'TRAINING',
      ['training'],
      expertRegistry,
    );
    const selectedExperts = routingDecision.orderedExperts;

    expect(() =>
      validator.validate({
        intent: 'TRAINING',
        requiredContextDomains: ['training'],
        responseMode: 'standard',
        safetyConstraints: ['deterministic_first'],
        maxSteps: 2,
        candidateExperts: expertRegistry
          .getExpertsForIntent('TRAINING')
          .map((expert) => expert.metadata),
        selectedExperts,
        expertRouting: routingDecision,
        expertPriorities: selectedExperts.map((expert) => ({
          expertId: expert.id,
          priority: expert.priority,
        })),
        expertCapabilities: [
          ...new Set(selectedExperts.flatMap((expert) => expert.capabilities)),
        ],
        actions: buildContextActions(),
        candidateTools: [],
        selectedTools: [],
        executionStrategy: 'MULTI_CONTEXT',
        planningSteps: [
          {
            step: 'CLASSIFY_INTENT',
            summary: 'Classify',
          },
        ] as unknown as AgentPlanningStepName[],
        maximumExecutionDepth: 3,
        expectedCost: 0,
        expectedLatencyMs: 0,
        validation: {
          status: 'valid',
          issues: [],
        },
        summary: 'invalid',
      }),
    ).toThrow('Invalid agent plan');
  });
});

function buildRoutingDecision(
  intent: 'TRAINING' | 'GENERAL_CHAT' | 'UNKNOWN',
  selectedDomains: readonly string[],
  expertRegistry: CoachExpertRegistry,
) {
  const router = new CoachExpertRouterService(new CoachExpertRoutingPolicy());
  return router.route({
    requestId: `request-${intent.toLowerCase()}`,
    intent,
    selectedDomains: selectedDomains as readonly AgentContextDomain[],
    candidateExperts: expertRegistry
      .getExpertsForIntent(intent)
      .map((expert) => expert.metadata),
    policyEvaluation: buildPolicyEvaluation(intent),
    maxExperts: 4,
  });
}

function buildContext(): Pick<AgentContext, 'selectedDomains'> {
  return {
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
  };
}

function buildContextActions() {
  return [
    {
      type: 'READ_USER_PROFILE' as const,
      domain: 'user_profile' as const,
      summary: 'Inspect the user profile context selected by the policy.',
    },
    {
      type: 'READ_TRAINING_CONTEXT' as const,
      domain: 'training' as const,
      summary: 'Inspect the training context selected by the policy.',
    },
    {
      type: 'READ_RECOVERY_CONTEXT' as const,
      domain: 'recovery' as const,
      summary: 'Inspect the recovery context selected by the policy.',
    },
    {
      type: 'READ_GOALS_CONTEXT' as const,
      domain: 'goals' as const,
      summary: 'Inspect the goals context selected by the policy.',
    },
    {
      type: 'READ_PROGRESS_CONTEXT' as const,
      domain: 'progress' as const,
      summary: 'Inspect the progress context selected by the policy.',
    },
    {
      type: 'READ_COACH_DECISION' as const,
      domain: 'coach_decision' as const,
      summary: 'Inspect the coach decision selected by the policy.',
    },
    {
      type: 'READ_MEMORY' as const,
      domain: 'conversation_memory' as const,
      summary: 'Inspect the conversation memory selected by the policy.',
    },
    {
      type: 'READ_RECENT_MESSAGES' as const,
      domain: 'recent_messages' as const,
      summary: 'Inspect the recent messages selected by the policy.',
    },
    {
      type: 'GENERATE_REPLY' as const,
      domain: 'coach_decision' as const,
      summary: 'Generate the final coaching reply after contextual inspection.',
    },
  ];
}

function buildPolicyEvaluation(
  intent: 'TRAINING' | 'GENERAL_CHAT' | 'UNKNOWN',
) {
  const registry = new AgentToolRegistryService();
  const expertRegistry = new CoachExpertRegistry();
  const selectedDomains =
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
  const allowedTools = registry.getToolsForContextDomains(selectedDomains);
  const candidateExperts = expertRegistry
    .getExpertsForIntent(intent)
    .map((expert) => expert.metadata);
  const selectedExperts = expertRegistry
    .getExpertsForDomains(selectedDomains)
    .map((expert) => expert.metadata);

  return {
    decision: {
      approved: true,
      blocked: false,
      fallbackRequired: intent === 'UNKNOWN',
      allowedTools,
      allowedExperts: selectedExperts,
      allowedDomains: selectedDomains,
      allowedLLM: intent !== 'UNKNOWN',
      metadata: {
        stage: 'PLANNING',
        evaluatedPolicyIds: [],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: intent === 'UNKNOWN' ? 1 : 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedExpertIds: [],
        blockedLlmUsage: intent === 'UNKNOWN',
        allowedDomainCount: selectedDomains.length,
        allowedToolCount: allowedTools.length,
        allowedExpertCount: selectedExperts.length,
        candidateExpertCount: candidateExperts.length,
        selectedExpertCount: selectedExperts.length,
        estimatedCost: 14,
        estimatedLatencyMs: 127,
        maximumExecutionDepth: intent === 'UNKNOWN' ? 1 : 4,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      },
    },
    violations: [],
    reason:
      intent === 'UNKNOWN'
        ? 'Policy requires deterministic fallback.'
        : 'Policy approved the request.',
    actions: ['continue_execution'],
  } as const;
}
