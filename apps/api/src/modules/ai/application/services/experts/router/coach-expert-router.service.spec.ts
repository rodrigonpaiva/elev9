import { AgentToolRegistryService } from '../../agent/tools/agent-tool-registry.service';
import type { AgentContextDomain } from '../../agent.types';
import { CoachExpertRegistry } from '../coach-expert.registry';
import { CoachExpertRoutingPolicy } from './coach-expert-routing.policy';
import { CoachExpertRouterService } from './coach-expert-router.service';
import type { CoachExpertMetadata } from '../coach-expert.types';
import type { AgentPolicyEvaluation } from '../../agent/policies/agent-policy.types';

const registry = new CoachExpertRegistry();
const toolRegistry = new AgentToolRegistryService();

describe('CoachExpertRouterService', () => {
  const policy = new CoachExpertRoutingPolicy();
  const router = new CoachExpertRouterService(policy);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('selects the workout expert as primary for training and orders dependencies deterministically', () => {
    const route = router.route(
      buildContext({
        intent: 'TRAINING',
        selectedDomains: ['training', 'recovery', 'goals', 'progress'],
      }),
    );

    expect(route.primaryExpert?.id).toBe('WorkoutExpert');
    expect(route.complementaryExperts.map((expert) => expert.id)).toEqual([
      'RecoveryExpert',
      'GoalExpert',
    ]);
    expect(route.orderedExperts.map((expert) => expert.id)).toEqual([
      'WorkoutExpert',
      'RecoveryExpert',
      'GoalExpert',
    ]);
    expect(route.metadata.primaryExpertId).toBe('WorkoutExpert');
    expect(route.metadata.complementaryExpertIds).toEqual([
      'RecoveryExpert',
      'GoalExpert',
    ]);
    expect(route.metadata.routeValid).toBe(true);
    expect(route.confidence).toBe('HIGH');
    expect(route.blockedExperts).toHaveLength(0);
    expect(route.skippedExperts.map((expert) => expert.id)).toEqual(
      expect.arrayContaining([
        'HabitExpert',
        'ProgressExpert',
        'MotivationExpert',
      ]),
    );
    expect(Object.isFrozen(route)).toBe(true);
    expect(Object.isFrozen(route.route)).toBe(true);
  });

  it('selects complementary nutrition support and preserves dependency ordering', () => {
    const nutritionCandidates = registry
      .getExpertsForDomains(['nutrition', 'goals', 'recovery'])
      .map((expert) => expert.metadata);
    const route = router.route(
      buildContext({
        intent: 'NUTRITION',
        selectedDomains: ['nutrition', 'goals', 'recovery'],
        candidateExperts: nutritionCandidates,
        policyEvaluation: buildPolicyEvaluation({
          intent: 'NUTRITION',
          selectedDomains: ['nutrition', 'goals', 'recovery'],
          allowedExperts: nutritionCandidates,
          blockedExpertIds: [],
        }),
      }),
    );

    expect(route.primaryExpert?.id).toBe('NutritionExpert');
    expect(route.complementaryExperts.map((expert) => expert.id)).toEqual([
      'RecoveryExpert',
      'GoalExpert',
    ]);
    expect(route.orderedExperts.map((expert) => expert.id)).toEqual([
      'NutritionExpert',
      'RecoveryExpert',
      'WorkoutExpert',
      'GoalExpert',
    ]);
  });

  it('returns no primary expert when there is no matching candidate', () => {
    const route = router.route(
      buildContext({
        intent: 'UNKNOWN',
        selectedDomains: ['user_profile'],
        candidateExperts: [],
        policyEvaluation: buildPolicyEvaluation({
          intent: 'UNKNOWN',
          selectedDomains: ['user_profile'],
          allowedExperts: [],
          blockedExpertIds: [],
        }),
      }),
    );

    expect(route.primaryExpert).toBeNull();
    expect(route.orderedExperts).toHaveLength(0);
    expect(route.confidence).toBe('LOW');
  });

  it('blocks policy denied experts', () => {
    const trainingCandidates = registry
      .getExpertsForIntent('TRAINING')
      .map((expert) => expert.metadata);
    const route = router.route(
      buildContext({
        intent: 'TRAINING',
        selectedDomains: ['training'],
        candidateExperts: trainingCandidates,
        policyEvaluation: buildPolicyEvaluation({
          intent: 'TRAINING',
          selectedDomains: ['training'],
          allowedExperts: [],
          blockedExpertIds: trainingCandidates.map((expert) => expert.id),
          approved: false,
          blocked: true,
        }),
      }),
    );

    expect(route.primaryExpert).toBeNull();
    expect(route.blockedExperts.map((expert) => expert.id)).toEqual(
      expect.arrayContaining(trainingCandidates.map((expert) => expert.id)),
    );
    expect(route.orderedExperts).toHaveLength(0);
  });

  it('blocks disabled experts even when policy would otherwise allow them', () => {
    const disabledCandidate = {
      ...registry.getExpert('WorkoutExpert')!.metadata,
      enabled: false,
    };
    const route = router.route(
      buildContext({
        intent: 'TRAINING',
        selectedDomains: ['training'],
        candidateExperts: [disabledCandidate],
        policyEvaluation: buildPolicyEvaluation({
          intent: 'TRAINING',
          selectedDomains: ['training'],
          allowedExperts: [disabledCandidate],
          blockedExpertIds: [],
        }),
      }),
    );

    expect(route.orderedExperts).toHaveLength(0);
    expect(route.blockedExperts.map((expert) => expert.id)).toEqual([
      'WorkoutExpert',
    ]);
  });

  it('removes duplicated candidate experts before selection', () => {
    const trainingCandidates = registry
      .getExpertsForIntent('TRAINING')
      .map((expert) => expert.metadata);
    const duplicatedCandidates = [
      trainingCandidates[0]!,
      trainingCandidates[0]!,
      ...trainingCandidates.slice(1),
    ];

    const route = router.route(
      buildContext({
        intent: 'TRAINING',
        selectedDomains: ['training', 'recovery', 'goals'],
        candidateExperts: duplicatedCandidates,
        policyEvaluation: buildPolicyEvaluation({
          intent: 'TRAINING',
          selectedDomains: ['training', 'recovery', 'goals'],
          allowedExperts: trainingCandidates,
          blockedExpertIds: [],
        }),
      }),
    );

    expect(new Set(route.orderedExperts.map((expert) => expert.id)).size).toBe(
      route.orderedExperts.length,
    );
    expect(route.orderedExperts[0]?.id).toBe('WorkoutExpert');
  });

  it('enforces the configured maximum number of experts', () => {
    const route = router.route(
      buildContext({
        intent: 'GOALS',
        selectedDomains: ['training', 'nutrition', 'recovery', 'goals'],
        maxExperts: 2,
      }),
    );

    expect(route.orderedExperts).toHaveLength(2);
    expect(route.metadata.selectedExpertCount).toBe(2);
    expect(route.skippedExperts.length).toBeGreaterThan(0);
  });

  it('rejects an incompatible pair when the routing policy says the combination is invalid', () => {
    jest
      .spyOn(policy, 'isCombinationAllowed')
      .mockImplementation((leftExpertId, rightExpertId) => {
        if (
          (leftExpertId === 'RecoveryExpert' &&
            rightExpertId === 'WorkoutExpert') ||
          (leftExpertId === 'WorkoutExpert' &&
            rightExpertId === 'RecoveryExpert')
        ) {
          return false;
        }

        return true;
      });

    const route = router.route(
      buildContext({
        intent: 'TRAINING',
        selectedDomains: ['training', 'recovery', 'goals'],
      }),
    );

    expect(route.orderedExperts.map((expert) => expert.id)).toEqual([
      'WorkoutExpert',
      'GoalExpert',
    ]);
    expect(route.skippedExperts.map((expert) => expert.id)).toEqual(
      expect.arrayContaining(['RecoveryExpert']),
    );
  });

  it('falls back to the primary expert when a dependency cycle is detected', () => {
    jest
      .spyOn(policy, 'getDependencyExpertIds')
      .mockImplementation((expertId) => {
        if (expertId === 'GoalExpert') {
          return ['ProgressExpert'];
        }

        if (expertId === 'ProgressExpert') {
          return ['GoalExpert'];
        }

        return [];
      });

    const route = router.route(
      buildContext({
        intent: 'GOALS',
        selectedDomains: ['goals', 'progress'],
        maxExperts: 6,
        candidateExperts: registry
          .getExpertsForDomains(['goals', 'progress'])
          .map((expert) => expert.metadata),
        policyEvaluation: buildPolicyEvaluation({
          intent: 'GOALS',
          selectedDomains: ['goals', 'progress'],
          allowedExperts: registry
            .getExpertsForDomains(['goals', 'progress'])
            .map((expert) => expert.metadata),
          blockedExpertIds: [],
        }),
      }),
    );

    expect(route.route.blockedExperts).toBeDefined();
    expect(route.metadata.routeValid).toBe(false);
    expect(route.orderedExperts).toHaveLength(0);
    expect(route.routingReasons.map((reason) => reason.code)).toContain(
      'ROUTE_INVALID',
    );
  });
});

function buildContext(input: {
  intent: 'TRAINING' | 'NUTRITION' | 'GOALS' | 'UNKNOWN';
  selectedDomains: readonly AgentContextDomain[];
  maxExperts?: number;
  candidateExperts?: readonly CoachExpertMetadata[];
  policyEvaluation?: AgentPolicyEvaluation;
}) {
  const candidateExperts =
    input.candidateExperts ??
    registry.getExpertsForIntent(input.intent).map((expert) => expert.metadata);
  const selectedDomains = input.selectedDomains;
  const policyEvaluation =
    input.policyEvaluation ??
    buildPolicyEvaluation({
      intent: input.intent,
      selectedDomains: input.selectedDomains,
      allowedExperts: registry
        .getExpertsForDomains(input.selectedDomains)
        .map((expert) => expert.metadata),
      blockedExpertIds: candidateExperts
        .filter(
          (expert) =>
            !registry
              .getExpertsForDomains(input.selectedDomains)
              .some((allowed) => allowed.metadata.id === expert.id),
        )
        .map((expert) => expert.id),
      approved: true,
      blocked: false,
    });

  return {
    requestId: `request-${input.intent.toLowerCase()}`,
    intent: input.intent,
    selectedDomains,
    candidateExperts,
    policyEvaluation,
    maxExperts: input.maxExperts ?? 4,
  };
}

function buildPolicyEvaluation(input: {
  intent: 'TRAINING' | 'NUTRITION' | 'GOALS' | 'UNKNOWN';
  selectedDomains: readonly AgentContextDomain[];
  allowedExperts: readonly CoachExpertMetadata[];
  blockedExpertIds: readonly string[];
  approved?: boolean;
  blocked?: boolean;
}): AgentPolicyEvaluation {
  const allowedTools = toolRegistry.getToolsForContextDomains(
    input.selectedDomains,
  );

  return {
    decision: {
      approved: input.approved ?? true,
      blocked: input.blocked ?? false,
      fallbackRequired: false,
      allowedTools,
      allowedExperts: input.allowedExperts,
      allowedDomains: input.selectedDomains,
      allowedLLM: true,
      metadata: {
        stage: 'PLANNING',
        evaluatedPolicyIds: [],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedExpertIds: input.blockedExpertIds,
        blockedLlmUsage: false,
        allowedDomainCount: input.selectedDomains.length,
        allowedToolCount: allowedTools.length,
        allowedExpertCount: input.allowedExperts.length,
        candidateExpertCount: input.allowedExperts.length,
        selectedExpertCount: input.allowedExperts.length,
        estimatedCost: 0,
        estimatedLatencyMs: 0,
        maximumExecutionDepth: 4,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      },
    },
    violations: [],
    reason: 'Policy approved.',
    actions: [],
  } as AgentPolicyEvaluation;
}
