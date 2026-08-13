import { CoachExpertCompositionService } from './coach-expert-composition.service';
import type { CoachExpertCompositionInput } from './coach-expert-composition.types';

describe('CoachExpertCompositionService', () => {
  const service = new CoachExpertCompositionService();

  it('composes a single expert route with high confidence', () => {
    const result = service.compose(
      buildInput({
        routingDecision: buildRoutingDecision(['WorkoutExpert']),
        expertResults: [
          buildResult('WorkoutExpert', {
            summary: 'Workout expert summary.',
            confidence: 'HIGH',
            trainingStatus: 'completed',
            goalAlignment: 'strength',
            recommendations: [
              buildRecommendation('MAINTAIN_TODAY', 'Maintain today.'),
            ],
            risks: [buildRisk('LOW', 'Workout risk')],
            riskAssessment: buildRisk('LOW', 'Workout risk'),
          }),
        ],
        expertContributions: [buildContribution('WorkoutExpert')],
      }),
    );

    expect(result.primaryExpert?.id).toBe('WorkoutExpert');
    expect(result.participatingExperts).toHaveLength(1);
    expect(
      result.recommendations.map((recommendation) => recommendation.code),
    ).toEqual(['MAINTAIN_TODAY']);
    expect(result.risks[0]?.level).toBe('LOW');
    expect(result.confidence.level).toBe('HIGH');
    expect(result.keyFindings).toContain('WORKOUT_CONSISTENCY');
    expect(result.summary).toContain('primary=WorkoutExpert');
  });

  it('merges multiple experts, removes duplicates, and resolves safety conflicts', () => {
    const result = service.compose(
      buildInput({
        routingDecision: buildRoutingDecision([
          'WorkoutExpert',
          'RecoveryExpert',
        ]),
        expertResults: [
          buildResult('WorkoutExpert', {
            summary: 'Workout expert summary.',
            confidence: 'HIGH',
            trainingStatus: 'completed',
            goalAlignment: 'strength',
            recommendations: [
              buildRecommendation('INCREASE_INTENSITY', 'Increase intensity.'),
              buildRecommendation('INCREASE_INTENSITY', 'Increase intensity.'),
            ],
            risks: [buildRisk('LOW', 'Workout risk')],
            riskAssessment: buildRisk('LOW', 'Workout risk'),
          }),
          buildResult('RecoveryExpert', {
            summary: 'Recovery expert summary.',
            confidence: 'HIGH',
            recoveryStatus: 'POOR',
            goalAlignment: 'strength',
            recommendations: [
              buildRecommendation(
                'TAKE_FULL_RECOVERY_DAY',
                'Take a full recovery day.',
              ),
            ],
            risks: [buildRisk('HIGH', 'Recovery risk')],
            riskAssessment: buildRisk('HIGH', 'Recovery risk'),
          }),
        ],
        expertContributions: [
          buildContribution('WorkoutExpert'),
          buildContribution('RecoveryExpert'),
        ],
      }),
    );

    expect(
      result.recommendations.map((recommendation) => recommendation.code),
    ).toEqual(['INCREASE_INTENSITY', 'TAKE_FULL_RECOVERY_DAY']);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      type: 'WORKOUT_VS_RECOVERY',
      severity: 'CRITICAL',
      resolution: {
        strategy: 'SAFETY',
        winnerExpertId: 'RecoveryExpert',
      },
    });
    expect(result.risks[0]?.level).toBe('HIGH');
    expect(result.confidence.level).toBe('HIGH');
  });

  it('respects blocked experts and blocked recommendations', () => {
    const result = service.compose(
      buildInput({
        routingDecision: buildRoutingDecision([
          'WorkoutExpert',
          'RecoveryExpert',
        ]),
        policyEvaluation: buildPolicyEvaluation({
          blockedExpertIds: ['RecoveryExpert'],
          blockedRecommendationCodes: ['TAKE_FULL_RECOVERY_DAY'],
        }),
        expertResults: [
          buildResult('WorkoutExpert', {
            summary: 'Workout expert summary.',
            confidence: 'HIGH',
            trainingStatus: 'completed',
            goalAlignment: 'strength',
            recommendations: [
              buildRecommendation('MAINTAIN_TODAY', 'Maintain today.'),
            ],
            risks: [buildRisk('LOW', 'Workout risk')],
            riskAssessment: buildRisk('LOW', 'Workout risk'),
          }),
          buildResult('RecoveryExpert', {
            summary: 'Recovery expert summary.',
            confidence: 'HIGH',
            recoveryStatus: 'POOR',
            goalAlignment: 'strength',
            recommendations: [
              buildRecommendation(
                'TAKE_FULL_RECOVERY_DAY',
                'Take a full recovery day.',
              ),
            ],
            risks: [buildRisk('HIGH', 'Recovery risk')],
            riskAssessment: buildRisk('HIGH', 'Recovery risk'),
          }),
        ],
        expertContributions: [
          buildContribution('WorkoutExpert'),
          buildContribution('RecoveryExpert'),
        ],
      }),
    );

    expect(
      result.participatingExperts.map((expert) => expert.expertId),
    ).toEqual(['WorkoutExpert']);
    expect(
      result.recommendations.map((recommendation) => recommendation.code),
    ).toEqual(['MAINTAIN_TODAY']);
    expect(result.conflicts).toHaveLength(0);
    expect(result.metadata.blockedExpertIds).toContain('RecoveryExpert');
    expect(result.metadata.recommendationCount).toBe(1);
  });

  it('detects goal alignment mismatches and keeps unified risk deterministic', () => {
    const result = service.compose(
      buildInput({
        routingDecision: buildRoutingDecision([
          'NutritionExpert',
          'GoalExpert',
        ]),
        intent: 'GOALS',
        selectedDomains: ['goals', 'nutrition'],
        expertResults: [
          buildResult('NutritionExpert', {
            summary: 'Nutrition expert summary.',
            confidence: 'MEDIUM',
            nutritionStatus: 'PARTIAL',
            goalAlignment: 'muscle_gain',
            recommendations: [
              buildRecommendation(
                'MAINTAIN_CURRENT_PLAN',
                'Maintain current plan.',
              ),
            ],
            risks: [buildRisk('MEDIUM', 'Nutrition risk')],
            riskAssessment: buildRisk('MEDIUM', 'Nutrition risk'),
          }),
          buildResult('GoalExpert', {
            summary: 'Goal expert summary.',
            confidence: 'MEDIUM',
            goalStatus: 'AT_RISK',
            goalType: 'fat_loss',
            recommendations: [
              buildRecommendation(
                'FOCUS_ON_NEXT_MILESTONE',
                'Focus on next milestone.',
              ),
            ],
            risks: [buildRisk('LOW', 'Goal risk')],
            riskAssessment: buildRisk('LOW', 'Goal risk'),
          }),
        ],
        expertContributions: [
          buildContribution('NutritionExpert'),
          buildContribution('GoalExpert'),
        ],
      }),
    );

    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.type).toBe('NUTRITION_VS_GOAL');
    expect(result.risks[0]?.level).toBe('MEDIUM');
    expect(result.keyFindings).toEqual(
      expect.arrayContaining(['NUTRITION_INCONSISTENCY', 'GOAL_PROGRESS']),
    );
    expect(result.confidence.level).toBe('MEDIUM');
  });
});

function buildInput(
  overrides: Partial<CoachExpertCompositionInput> = {},
): CoachExpertCompositionInput {
  return {
    requestId: 'request_123',
    intent: 'TRAINING',
    selectedDomains: ['training'],
    routingDecision: buildRoutingDecision(['WorkoutExpert']),
    policyEvaluation: buildPolicyEvaluation(),
    expertResults: [],
    expertContributions: [],
    runtimeMetadata: {
      plan: {} as CoachExpertCompositionInput['runtimeMetadata']['plan'],
      selectedDomains: ['training'],
      expertResults: [],
      expertContributions: [],
      expertExecutionDurationMs: 5,
    },
    executionMetadata: {
      planningDurationMs: 2,
      orchestrationDurationMs: 4,
      expertExecutionDurationMs: 5,
    },
    ...overrides,
  };
}

function buildRoutingDecision(
  expertIds: readonly string[],
): CoachExpertCompositionInput['routingDecision'] {
  const experts = expertIds.map((id, index) => buildExpert(id, index));

  return {
    primaryExpert: experts[0] ?? null,
    complementaryExperts: experts.slice(1),
    orderedExperts: experts,
    blockedExperts: [],
    skippedExperts: [],
    routingReasons: [],
    estimatedCost: experts.length,
    estimatedLatencyMs: experts.length * 10,
    confidence: experts.length > 0 ? 'HIGH' : 'LOW',
    route: {
      primaryExpert:
        (experts[0] ?? null)
          ? {
              expert: experts[0]!,
              role: 'PRIMARY',
              sequence: 0,
              reasonCodes: ['PRIMARY_INTENT_MATCH'],
            }
          : null,
      complementaryExperts: experts.slice(1).map((expert, index) => ({
        expert,
        role: 'COMPLEMENTARY',
        sequence: index + 1,
        reasonCodes: ['COMPLEMENTARY_RULE'],
      })),
      orderedExperts: experts.map((expert, index) => ({
        expert,
        role: index === 0 ? 'PRIMARY' : 'COMPLEMENTARY',
        sequence: index,
        reasonCodes:
          index === 0 ? ['PRIMARY_INTENT_MATCH'] : ['COMPLEMENTARY_RULE'],
      })),
      blockedExperts: [],
      skippedExperts: [],
    },
    metadata: {
      requestId: 'request_123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      candidateExpertIds: expertIds,
      allowedExpertIds: expertIds,
      blockedExpertIds: [],
      skippedExpertIds: [],
      primaryExpertId: experts[0]?.id,
      complementaryExpertIds: experts.slice(1).map((expert) => expert.id),
      orderedExpertIds: expertIds,
      routeValid: true,
      validationIssues: [],
      selectedExpertCount: experts.length,
      candidateExpertCount: expertIds.length,
      blockedExpertCount: 0,
      skippedExpertCount: 0,
      estimatedCost: experts.length,
      estimatedLatencyMs: experts.length * 10,
      confidence: experts.length > 0 ? 'HIGH' : 'LOW',
      maxExperts: 4,
      route: {
        primaryExpert: null,
        complementaryExperts: [],
        orderedExperts: [],
        blockedExperts: [],
        skippedExperts: [],
      },
    },
  };
}

function buildPolicyEvaluation(
  overrides: {
    blockedExpertIds?: readonly string[];
    blockedRecommendationCodes?: readonly string[];
  } = {},
): CoachExpertCompositionInput['policyEvaluation'] {
  return {
    decision: {
      approved: true,
      blocked: false,
      fallbackRequired: false,
      allowedTools: [],
      allowedExperts: [],
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
        blockedExpertIds: overrides.blockedExpertIds ?? [],
        blockedRecommendationCodes: overrides.blockedRecommendationCodes ?? [],
        blockedLlmUsage: false,
        allowedDomainCount: 1,
        allowedToolCount: 0,
        allowedExpertCount: 0,
        candidateExpertCount: 0,
        selectedExpertCount: 0,
        estimatedCost: 0,
        estimatedLatencyMs: 0,
        maximumExecutionDepth: 4,
        maxSteps: 6,
        maxToolCalls: 4,
        evaluationDurationMs: 1,
      } as unknown as CoachExpertCompositionInput['policyEvaluation']['decision']['metadata'],
    },
    violations: [],
    reason: 'Approved.',
    actions: [],
  };
}

function buildExpert(id: string, sequence: number) {
  return {
    id,
    displayName: id.replace('Expert', ' Expert'),
    version: '1.0.0',
    category:
      id === 'WorkoutExpert'
        ? 'TRAINING'
        : id === 'NutritionExpert'
          ? 'NUTRITION'
          : id === 'RecoveryExpert'
            ? 'RECOVERY'
            : id === 'GoalExpert'
              ? 'GOALS'
              : id === 'HabitExpert'
                ? 'HABITS'
                : id === 'ProgressExpert'
                  ? 'PROGRESS'
                  : 'MOTIVATION',
    supportedIntents: ['TRAINING', 'GOALS', 'NUTRITION'],
    supportedDomains: ['training', 'goals', 'nutrition'],
    estimatedCost: sequence + 1,
    estimatedLatencyMs: (sequence + 1) * 10,
    priority: 100 - sequence,
    capabilities: ['CONTEXT_SYNTHESIS'],
    enabled: true,
  } as const;
}

function buildResult(
  expertId: string,
  overrides: {
    summary: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendations: readonly {
      code: string;
      summary: string;
      reason?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      metadata?: Readonly<Record<string, unknown>>;
    }[];
    risks: readonly {
      level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
      summary: string;
      factors?: readonly string[];
      metadata?: Readonly<Record<string, unknown>>;
    }[];
    riskAssessment: {
      level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
      summary: string;
      factors?: readonly string[];
      metadata?: Readonly<Record<string, unknown>>;
    };
    trainingStatus?: string;
    nutritionStatus?: string;
    recoveryStatus?: string;
    goalStatus?: string;
    goalType?: string;
    goalAlignment?: string;
    habitStatus?: string;
    overallProgress?: string;
    motivationState?: string;
    inactivityDays?: number;
  },
) {
  return {
    expertId,
    summary: overrides.summary,
    contributions: [],
    metadata: {
      analysis: {
        summary: overrides.summary,
        confidence: overrides.confidence,
        recommendations: overrides.recommendations,
        risks: overrides.risks,
        riskAssessment: overrides.riskAssessment,
        trainingStatus: overrides.trainingStatus,
        nutritionStatus: overrides.nutritionStatus,
        recoveryStatus: overrides.recoveryStatus,
        goalStatus: overrides.goalStatus,
        goalType: overrides.goalType,
        goalAlignment: overrides.goalAlignment,
        habitStatus: overrides.habitStatus,
        overallProgress: overrides.overallProgress,
        motivationState: overrides.motivationState,
        inactivityDays: overrides.inactivityDays,
      },
    },
  };
}

function buildContribution(expertId: string) {
  return {
    expertId,
    type: 'CONTRIBUTION' as const,
    summary: `${expertId} contribution.`,
    metadata: {},
  };
}

function buildRecommendation(
  code: string,
  summary: string,
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW',
) {
  return {
    code,
    summary,
    reason: summary,
    priority,
    metadata: {},
  };
}

function buildRisk(
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN',
  summary: string,
) {
  return {
    level,
    summary,
    factors: ['evidence'],
    metadata: {},
  };
}
