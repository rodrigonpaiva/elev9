import { CoachExpertRegistry } from '../coach-expert.registry';
import type { CoachExpertMetadata } from '../coach-expert.types';
import type { CoachExpertRoutingDecision } from '../router/coach-expert-router.types';
import type { AgentPolicyEvaluation } from '../../policies/agent-policy.types';
import type { CoachExpertCompositionResult } from '../composition/coach-expert-composition.types';
import type { CoachExplanation } from '../../explainability/coach-explainability.types';
import { CoachExpertObservabilityService } from './coach-expert-observability.service';
import { CoachExpertRetentionPolicy } from './coach-expert-observability.policy';

describe('CoachExpertObservabilityService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('AI_EXPERT_TRACE_')) {
        delete process.env[key];
      }
    }
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it('captures deterministic expert observability for mixed expert outcomes', () => {
    const service = new CoachExpertObservabilityService();
    const inputs = buildObservabilityInputs();

    const started = service.startTrace(inputs.start);
    const completed = service.completeTrace(inputs.complete);

    expect(started.traceId).toBe('request-123');
    expect(Object.isFrozen(started)).toBe(true);
    expect(completed).toBeDefined();
    expect(completed).toMatchObject({
      traceId: 'request-123',
      status: 'COMPLETED',
      primaryExpert: 'WorkoutExpert',
      participatingExperts: ['WorkoutExpert', 'RecoveryExpert', 'GoalExpert'],
      supportingExperts: ['RecoveryExpert', 'GoalExpert'],
      candidateExpertIds: expect.arrayContaining([
        'WorkoutExpert',
        'RecoveryExpert',
        'GoalExpert',
        expect.any(String),
      ]),
      blockedExpertIds: [
        inputs.start.routingDecision.metadata.blockedExpertIds[0],
      ],
      skippedExpertIds: [
        inputs.start.routingDecision.metadata.skippedExpertIds[0],
      ],
      failedExpertIds: ['RecoveryExpert'],
      metrics: expect.objectContaining({
        totalExperts: inputs.start.candidateExperts.length,
        selectedExperts: 3,
        executedExperts: 2,
        skippedExperts: 1,
        blockedExperts: 1,
        failedExperts: 1,
        highestRiskExpert: 'RecoveryExpert',
        highestConfidenceExpert: 'WorkoutExpert',
        primaryExpert: 'WorkoutExpert',
      }),
      contributionSummary: expect.objectContaining({
        recommendations: 3,
        risks: 3,
        findings: 3,
        alerts: 1,
        strengths: 1,
        weaknesses: 1,
        confidence: 'HIGH',
      }),
      latencySummary: expect.objectContaining({
        routing: 7,
        execution: 47,
        composition: 13,
        persona: 11,
        explainability: 9,
        promptAssembly: 5,
        total: 92,
      }),
    });

    const recovery = completed.executionSummaries.find(
      (summary) => summary.expertId === 'RecoveryExpert',
    );
    const blockedExpertId =
      inputs.start.routingDecision.metadata.blockedExpertIds[0];
    const skippedExpertId =
      inputs.start.routingDecision.metadata.skippedExpertIds[0];
    const blocked = completed.executionSummaries.find(
      (summary) => summary.expertId === blockedExpertId,
    );
    const skipped = completed.executionSummaries.find(
      (summary) => summary.expertId === skippedExpertId,
    );

    expect(recovery).toMatchObject({
      executionStatus: 'FAILED',
      selected: true,
      executed: false,
    });
    expect(recovery?.health).toMatchObject({
      failing: true,
      healthy: false,
    });
    expect(blocked).toMatchObject({
      executionStatus: 'BLOCKED',
      selected: false,
      executed: false,
    });
    expect(blocked?.health).toMatchObject({
      disabled: true,
      healthy: false,
    });
    expect(skipped).toMatchObject({
      executionStatus: 'SKIPPED',
      selected: false,
      executed: false,
    });
    expect(skipped?.health).toMatchObject({
      degraded: true,
      healthy: false,
    });
    expect(completed?.conflicts).toHaveLength(1);
    expect(completed?.metadata).toMatchObject({
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      routingDurationMs: 7,
      executionDurationMs: 47,
      compositionDurationMs: 13,
      personaDurationMs: 11,
      explainabilityDurationMs: 9,
      promptAssemblyDurationMs: 5,
    });
  });

  it('prunes traces by retention and max count deterministically', () => {
    process.env.AI_EXPERT_TRACE_MAX_ITEMS = '1';
    process.env.AI_EXPERT_TRACE_RETENTION_MS = '1';

    const service = new CoachExpertObservabilityService(
      new CoachExpertRetentionPolicy(),
    );
    const first = buildObservabilityInputs('request-1');
    const second = buildObservabilityInputs('request-2');

    service.startTrace(first.start);
    expect(service.getTrace('request-1')).toBeDefined();

    service.startTrace(second.start);
    expect(service.listTraces()).toHaveLength(1);
    expect(service.getTrace('request-1')).toBeUndefined();
  });

  it('prunes traces by ttl deterministically', () => {
    process.env.AI_EXPERT_TRACE_MAX_ITEMS = '10';
    process.env.AI_EXPERT_TRACE_RETENTION_MS = '1';

    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 0);

    const service = new CoachExpertObservabilityService(
      new CoachExpertRetentionPolicy(),
    );
    service.startTrace(buildObservabilityInputs('request-ttl').start);

    nowSpy.mockImplementation(() => 5);
    expect(service.getTrace('request-ttl')).toBeUndefined();

    nowSpy.mockRestore();
  });
});

function buildObservabilityInputs(requestId = 'request-123') {
  const registry = new CoachExpertRegistry();
  const candidateExperts = registry
    .getExpertsForIntent('TRAINING')
    .map((expert) => expert.metadata);

  const workout = findExpert(candidateExperts, 'WorkoutExpert');
  const recovery = findExpert(candidateExperts, 'RecoveryExpert');
  const goal = findExpert(candidateExperts, 'GoalExpert');
  const selectedIds = new Set([workout.id, recovery.id, goal.id]);
  const blocked =
    candidateExperts.find((expert) => !selectedIds.has(expert.id)) ??
    candidateExperts[candidateExperts.length - 1];
  const skipped =
    candidateExperts.find(
      (expert) => !selectedIds.has(expert.id) && expert.id !== blocked.id,
    ) ?? blocked;

  const start = {
    requestId,
    conversationId: 'conversation-123',
    intent: 'TRAINING' as const,
    selectedDomains: ['training'] as const,
    candidateExperts,
    routingDecision: buildRoutingDecision({
      candidateExperts,
      workout,
      recovery,
      goal,
      blocked,
      skipped,
    }),
    policyEvaluation: buildPolicyEvaluation(candidateExperts, blocked),
    runtimeMetadata: {
      routingDurationMs: 7,
    },
  };

  const complete = {
    requestId,
    expertResults: [
      buildExpertResult(workout.id, 'HIGH', 12, false),
      buildExpertResult(recovery.id, 'MEDIUM', 23, true),
      buildExpertResult(goal.id, 'MEDIUM', 17, false),
    ],
    expertContributions: [
      { expertId: workout.id, type: 'ANALYSIS', summary: 'Workout analyzed.' },
      {
        expertId: workout.id,
        type: 'CONTRIBUTION',
        summary: 'Workout contribution.',
      },
      {
        expertId: recovery.id,
        type: 'ANALYSIS',
        summary: 'Recovery analyzed.',
      },
      {
        expertId: goal.id,
        type: 'CONTRIBUTION',
        summary: 'Goal contribution.',
      },
    ],
    composition: buildCompositionResult({ workout, recovery, goal, blocked }),
    personaGuidance: buildPersonaGuidance(),
    explanation: buildExplanation({ workout, recovery, goal }),
    runtimeMetadata: {
      routingDurationMs: 7,
      executionDurationMs: 47,
      compositionDurationMs: 13,
      personaDurationMs: 11,
      explainabilityDurationMs: 9,
      promptAssemblyDurationMs: 5,
      totalDurationMs: 92,
    },
  };

  return { start, complete };
}

function buildRoutingDecision(input: {
  candidateExperts: readonly CoachExpertMetadata[];
  workout: CoachExpertMetadata;
  recovery: CoachExpertMetadata;
  goal: CoachExpertMetadata;
  blocked: CoachExpertMetadata;
  skipped: CoachExpertMetadata;
}): CoachExpertRoutingDecision {
  const primary = buildSelection(input.workout, 'PRIMARY', 0);
  const complementaryRecovery = buildSelection(
    input.recovery,
    'COMPLEMENTARY',
    1,
  );
  const complementaryGoal = buildSelection(input.goal, 'COMPLEMENTARY', 2);
  const blockedExpert = buildSelection(input.blocked, 'COMPLEMENTARY', 3);
  const skippedExpert = buildSelection(input.skipped, 'COMPLEMENTARY', 4);

  return {
    primaryExpert: input.workout,
    complementaryExperts: [input.recovery, input.goal],
    orderedExperts: [input.workout, input.recovery, input.goal],
    blockedExperts: [input.blocked],
    skippedExperts: [input.skipped],
    routingReasons: [],
    estimatedCost: 12,
    estimatedLatencyMs: 25,
    confidence: 'HIGH',
    route: {
      primaryExpert: primary,
      complementaryExperts: [complementaryRecovery, complementaryGoal],
      orderedExperts: [primary, complementaryRecovery, complementaryGoal],
      blockedExperts: [blockedExpert],
      skippedExperts: [skippedExpert],
    },
    metadata: {
      requestId: 'request-123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      candidateExpertIds: input.candidateExperts.map((expert) => expert.id),
      allowedExpertIds: input.candidateExperts.map((expert) => expert.id),
      blockedExpertIds: [input.blocked.id],
      skippedExpertIds: [input.skipped.id],
      primaryExpertId: input.workout.id,
      complementaryExpertIds: [input.recovery.id, input.goal.id],
      orderedExpertIds: [input.workout.id, input.recovery.id, input.goal.id],
      routeValid: true,
      validationIssues: [],
      selectedExpertCount: 3,
      candidateExpertCount: input.candidateExperts.length,
      blockedExpertCount: 1,
      skippedExpertCount: 1,
      estimatedCost: 12,
      estimatedLatencyMs: 25,
      confidence: 'HIGH',
      maxExperts: 4,
      route: {
        primaryExpert: primary,
        complementaryExperts: [complementaryRecovery, complementaryGoal],
        orderedExperts: [primary, complementaryRecovery, complementaryGoal],
        blockedExperts: [blockedExpert],
        skippedExperts: [skippedExpert],
      },
    },
  } as unknown as CoachExpertRoutingDecision;
}

function buildPolicyEvaluation(
  candidateExperts: readonly CoachExpertMetadata[],
  blocked: CoachExpertMetadata,
): AgentPolicyEvaluation {
  return {
    decision: {
      approved: true,
      blocked: false,
      fallbackRequired: false,
      allowedTools: [],
      allowedExperts: candidateExperts,
      allowedDomains: ['training'],
      allowedLLM: true,
      metadata: {
        stage: 'PLANNING',
        evaluatedPolicyIds: ['policy-1'],
        rejectedPolicyIds: [],
        violationCount: 0,
        fallbackDecisionCount: 0,
        blockedDomainIds: [],
        blockedToolIds: [],
        blockedExpertIds: [blocked.id],
        blockedLlmUsage: false,
        allowedDomainCount: 1,
        allowedToolCount: 0,
        allowedExpertCount: candidateExperts.length,
        candidateExpertCount: candidateExperts.length,
        selectedExpertCount: 3,
        estimatedCost: 12,
        estimatedLatencyMs: 25,
        maximumExecutionDepth: 4,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      },
    },
    violations: [],
    reason: 'policy-approved',
    actions: [],
  };
}

function buildCompositionResult(input: {
  workout: CoachExpertMetadata;
  recovery: CoachExpertMetadata;
  goal: CoachExpertMetadata;
  blocked: CoachExpertMetadata;
}): CoachExpertCompositionResult {
  return {
    primaryExpert: input.workout,
    participatingExperts: [
      {
        expertId: input.workout.id,
        expertName: input.workout.displayName,
        role: 'PRIMARY',
        sequence: 0,
        summary: 'Workout analysis complete.',
        recommendationCodes: ['INCREASE_VOLUME'],
        riskLevels: ['LOW'],
        confidence: 'HIGH',
        keyFindings: ['WORKOUT_CONSISTENCY'],
        metadata: {},
      },
      {
        expertId: input.recovery.id,
        expertName: input.recovery.displayName,
        role: 'COMPLEMENTARY',
        sequence: 1,
        summary: 'Recovery analysis complete.',
        recommendationCodes: ['PRIORITIZE_RECOVERY'],
        riskLevels: ['HIGH'],
        confidence: 'MEDIUM',
        keyFindings: ['LOW_RECOVERY'],
        metadata: {},
      },
      {
        expertId: input.goal.id,
        expertName: input.goal.displayName,
        role: 'COMPLEMENTARY',
        sequence: 2,
        summary: 'Goal analysis complete.',
        recommendationCodes: ['MAINTAIN_CURRENT_PROGRESSION'],
        riskLevels: ['LOW'],
        confidence: 'MEDIUM',
        keyFindings: ['STRONG_PROGRESS'],
        metadata: {},
      },
    ],
    assessment: {
      summary: 'Unified assessment.',
      keyFindings: ['WORKOUT_CONSISTENCY', 'LOW_RECOVERY', 'STRONG_PROGRESS'],
      metadata: {},
    },
    summary:
      'primary=WorkoutExpert; findings=WORKOUT_CONSISTENCY,LOW_RECOVERY,STRONG_PROGRESS; risk=HIGH; confidence=HIGH; recommendations=INCREASE_VOLUME,PRIORITIZE_RECOVERY,MAINTAIN_CURRENT_PROGRESSION; conflicts=1',
    keyFindings: ['WORKOUT_CONSISTENCY', 'LOW_RECOVERY', 'STRONG_PROGRESS'],
    recommendations: [
      {
        code: 'INCREASE_VOLUME',
        summary: 'Increase training volume.',
        reason: 'Workout progression.',
        priority: 'HIGH',
        category: 'PRIMARY',
        sourceExperts: [input.workout.id],
        metadata: {},
      },
      {
        code: 'PRIORITIZE_RECOVERY',
        summary: 'Prioritize recovery.',
        reason: 'Recovery readiness.',
        priority: 'HIGH',
        category: 'SAFETY_CRITICAL',
        sourceExperts: [input.recovery.id],
        metadata: {},
      },
      {
        code: 'MAINTAIN_CURRENT_PROGRESSION',
        summary: 'Maintain progression.',
        reason: 'Goal continuity.',
        priority: 'MEDIUM',
        category: 'SUPPORTING',
        sourceExperts: [input.goal.id],
        metadata: {},
      },
    ],
    risks: [
      {
        level: 'HIGH',
        summary: 'Unified risk.',
        factors: ['LOW_RECOVERY'],
        sources: [input.recovery.id],
        metadata: {},
      },
      {
        level: 'LOW',
        summary: 'Workout risk.',
        factors: ['WORKOUT_LOAD'],
        sources: [input.workout.id],
        metadata: {},
      },
      {
        level: 'LOW',
        summary: 'Goal risk.',
        factors: ['GOAL_DRIFT'],
        sources: [input.goal.id],
        metadata: {},
      },
    ],
    confidence: {
      level: 'HIGH',
      summary: 'confidence=HIGH',
      factors: ['PRIMARY_EXPERT', 'EXECUTION_COMPLETE'],
      metadata: {},
    },
    conflicts: [
      {
        type: 'WORKOUT_VS_RECOVERY',
        experts: [input.workout.id, input.recovery.id],
        severity: 'HIGH',
        resolution: {
          strategy: 'SAFETY',
          winnerExpertId: input.recovery.id,
          metadata: {},
        },
        metadata: {},
      },
    ],
    supportingExperts: [
      {
        expertId: input.recovery.id,
        expertName: input.recovery.displayName,
        role: 'COMPLEMENTARY',
        sequence: 1,
        summary: 'Recovery analysis complete.',
        recommendationCodes: ['PRIORITIZE_RECOVERY'],
        riskLevels: ['HIGH'],
        confidence: 'MEDIUM',
        keyFindings: ['LOW_RECOVERY'],
        metadata: {},
      },
      {
        expertId: input.goal.id,
        expertName: input.goal.displayName,
        role: 'COMPLEMENTARY',
        sequence: 2,
        summary: 'Goal analysis complete.',
        recommendationCodes: ['MAINTAIN_CURRENT_PROGRESSION'],
        riskLevels: ['LOW'],
        confidence: 'MEDIUM',
        keyFindings: ['STRONG_PROGRESS'],
        metadata: {},
      },
    ],
    metadata: {
      requestId: 'request-123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: input.workout.id,
      participatingExpertIds: [
        input.workout.id,
        input.recovery.id,
        input.goal.id,
      ],
      supportingExpertIds: [input.recovery.id, input.goal.id],
      blockedExpertIds: [input.blocked.id],
      skippedExpertIds: [],
      routeValid: true,
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      candidateExpertCount: 5,
      participatingExpertCount: 3,
      recommendationCount: 3,
      riskCount: 3,
      conflictCount: 1,
      expertResultCount: 3,
      expertContributionCount: 4,
      compositionDurationMs: 13,
      planningDurationMs: 8,
      orchestrationDurationMs: 6,
      expertExecutionDurationMs: 47,
      executionDurationMs: 60,
      runtimeCompleteness: 'FULL',
    },
  } as unknown as CoachExpertCompositionResult;
}

function buildExplanation(input: {
  workout: CoachExpertMetadata;
  recovery: CoachExpertMetadata;
  goal: CoachExpertMetadata;
}): CoachExplanation {
  return {
    primaryExpertId: input.workout.id,
    participatingExperts: [input.workout.id, input.recovery.id, input.goal.id],
    supportingExperts: [input.recovery.id, input.goal.id],
    evidence: [
      {
        type: 'WORKOUT_COMPLETION',
        source: 'EXPERT',
        expert: input.workout.id,
        importance: 'HIGH',
        confidence: 'HIGH',
        availability: 'AVAILABLE',
        metadata: {},
      },
      {
        type: 'RECOVERY_CHECK_IN',
        source: 'EXPERT',
        expert: input.recovery.id,
        importance: 'HIGH',
        confidence: 'HIGH',
        availability: 'AVAILABLE',
        metadata: {},
      },
    ],
    decisionReasons: [],
    recommendationReasons: [],
    riskExplanations: [],
    confidenceExplanation: {
      confidence: 'HIGH',
      supportingEvidenceCount: 2,
      supportingExpertCount: 3,
      missingEvidenceCount: 1,
      policyRestrictions: [],
      metadata: {},
    },
    conflictExplanations: [],
    missingEvidence: [
      {
        type: 'RECOVERY_CHECK_IN',
        source: 'HEALTH_CONTEXT',
        availability: 'MISSING',
        metadata: {
          expertId: input.recovery.id,
        },
      },
    ],
    metadata: {
      requestId: 'request-123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: input.workout.id,
      participatingExpertIds: [
        input.workout.id,
        input.recovery.id,
        input.goal.id,
      ],
      supportingExpertIds: [input.recovery.id, input.goal.id],
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      runtimeCompleteness: 'FULL',
      evidenceCount: 2,
      explanationCount: 1,
      recommendationCount: 3,
      riskCount: 3,
      conflictCount: 0,
      missingEvidenceCount: 1,
      blockedExpertCount: 1,
      blockedRecommendationCount: 0,
      personaTone: 'DIRECT',
      personaFocus: 'WORKOUT',
      personaSafetyLevel: 'NORMAL',
      personaUrgency: 'LOW',
      explanationVersion: 'coach-explainability-v1',
    },
  } as unknown as CoachExplanation;
}

function buildPersonaGuidance() {
  return {
    tone: 'DIRECT',
    directiveLevel: 'MEDIUM',
    empathyLevel: 'LOW',
    encouragementLevel: 'MEDIUM',
    technicalDepth: 'INTERMEDIATE',
    urgency: 'LOW',
    celebrationLevel: 'LOW',
    safetyLevel: 'NORMAL',
    focus: 'WORKOUT',
    verbosity: 'SHORT',
    communicationStyle: {
      tone: 'DIRECT',
      directiveLevel: 'MEDIUM',
      empathyLevel: 'LOW',
      encouragementLevel: 'MEDIUM',
      technicalDepth: 'INTERMEDIATE',
      urgency: 'LOW',
      celebrationLevel: 'LOW',
      safetyLevel: 'NORMAL',
    },
    communicationRules: ['USE_CONCISE_DIRECTIVE_LANGUAGE'],
    metadata: {
      requestId: 'request-123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: 'WorkoutExpert',
      participatingExpertIds: ['WorkoutExpert', 'RecoveryExpert', 'GoalExpert'],
      supportingExpertIds: ['RecoveryExpert', 'GoalExpert'],
      blockedExpertIds: ['NutritionExpert'],
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      riskLevel: 'HIGH',
      conflictCount: 1,
      recommendationCount: 3,
      communicationRuleCount: 1,
      runtimeCompleteness: 'FULL',
      userProfileId: 'profile-123',
      activityLevel: 'INTERMEDIATE',
      technicalDepthSource: 'fitness-profile',
      toneSource: 'composition',
      safetySource: 'risk',
      focusSource: 'composition',
    },
  };
}

function buildExpertResult(
  expertId: string,
  confidence: 'LOW' | 'MEDIUM' | 'HIGH',
  durationMs: number,
  failure: boolean,
) {
  return {
    expertId,
    summary: `${expertId} summary`,
    contributions: [],
    metadata: {
      confidence,
      durationMs,
      recommendations: [
        {
          code: `${expertId}_CODE`,
          summary: `${expertId} recommendation`,
          reason: `${expertId} reason`,
          priority: 'MEDIUM',
          metadata: {},
        },
      ],
      risks: [
        {
          level: confidence === 'HIGH' ? 'LOW' : 'MEDIUM',
          summary: `${expertId} risk`,
          factors: [`${expertId}_FACTOR`],
          metadata: {},
        },
      ],
      runtimeMode: failure ? 'analysis-error-fallback' : 'analysis-success',
    },
  };
}

function buildSelection(
  expert: CoachExpertMetadata,
  role: 'PRIMARY' | 'COMPLEMENTARY' | 'DEPENDENCY',
  sequence: number,
) {
  return {
    expert,
    role,
    sequence,
    reasonCodes: ['PRIMARY_DOMAIN_MATCH'],
  };
}

function findExpert(
  experts: readonly CoachExpertMetadata[],
  expertId: string,
): CoachExpertMetadata {
  const expert = experts.find((candidate) => candidate.id === expertId);

  if (!expert) {
    throw new Error(`Missing expert ${expertId}.`);
  }

  return expert;
}
