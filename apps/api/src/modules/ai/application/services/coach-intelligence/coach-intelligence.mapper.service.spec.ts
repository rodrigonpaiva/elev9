import { CoachIntelligenceFreshnessPolicy } from './coach-intelligence.policy';
import { CoachIntelligenceMapperService } from './coach-intelligence.mapper.service';

describe('CoachIntelligenceMapperService', () => {
  const service = new CoachIntelligenceMapperService(
    new CoachIntelligenceFreshnessPolicy(),
  );

  it('maps the backend build result into the canonical public aggregate', () => {
    const evidence = {
      type: 'WORKOUT_HISTORY',
      source: 'Workout',
      expert: 'Workout',
      importance: 'HIGH',
      confidence: 'HIGH',
      availability: 'AVAILABLE',
      metadata: {
        workoutLogCount: 3,
      },
    } as never;

    const result = service.map(
      buildInput({
        evidence,
      }),
    );

    expect(result.header).toEqual(
      expect.objectContaining({
        aggregateId: 'aggregate_123',
        requestId: 'request_123',
        sourceVersion: '1.0.0',
        rolloutState: 'aggregate',
      }),
    );
    expect(result.ownership.primaryExpert).toBe('Workout');
    expect(result.insight.topRecommendation?.code).toBe('MAINTAIN_TODAY');
    expect(result.insight.currentRisk?.level).toBe('LOW');
    expect(result.explainability.evidence[0]?.id).toBe('evidence-01');
    expect(result.explainability.decisionReasons[0]?.priority).toBe('primary');
    expect(result.availability.status).toBe('available');
    expect(result.freshness.status).toBe('fresh');
    expect(result.metadata.contractVersion).toBe('1');
    expect(result.warnings).toEqual([]);
  });
});

function buildInput(
  overrides: Partial<Parameters<CoachIntelligenceMapperService['map']>[0]> = {},
): Parameters<CoachIntelligenceMapperService['map']>[0] {
  return {
    aggregateId: 'aggregate_123',
    requestId: 'request_123',
    sourceVersion: '1.0.0',
    rolloutState: 'aggregate',
    source: buildSource(),
    pipeline: buildPipeline({
      evidence: overrides as never,
    }),
    ...overrides,
  } as never;
}

function buildSource() {
  const state = {
    availability: {
      status: 'available',
      fallbackUsed: false,
      retryable: false,
      reasonCode: 'READY',
    },
    freshness: {
      status: 'fresh',
      generatedAt: '2026-07-13T00:00:00.000Z',
      sourceTimestamp: '2026-07-13T00:00:00.000Z',
      ageMs: 0,
    },
    data: null,
    warnings: [],
  };

  return {
    authUserId: 'auth_123',
    userProfileId: 'profile_123',
    healthContext: {
      generatedAt: '2026-07-13T00:00:00.000Z',
      goal: 'fat_loss',
      activityLevel: 'moderate',
      weeklyFrequency: 4,
      adherenceScore: 82,
      currentStreak: 6,
      fatigueLevel: 'medium',
      limitations: [],
      recoverySnapshot: null,
      nutritionProfile: null,
      todayWorkout: null,
      recentWorkoutLogs: [],
    },
    coachDecision: undefined,
    expertContext: {
      userProfileId: 'profile_123',
      healthContext: {
        generatedAt: '2026-07-13T00:00:00.000Z',
      },
    },
    sections: {
      training: {
        ...state,
        data: {
          trainingPlan: null,
          adaptiveTrainingRecommendation: null,
        },
      },
      nutrition: {
        ...state,
        data: {
          todayNutrition: null,
          nutritionPlan: null,
          nutritionRecommendation: null,
        },
      },
      recovery: {
        ...state,
        data: {
          recoverySnapshot: null,
        },
      },
      goals: {
        ...state,
        data: {
          currentGoal: null,
          progressSnapshot: null,
          forecast: null,
          milestones: [],
          achievements: [],
        },
      },
      habits: {
        ...state,
        data: {
          habitSnapshot: null,
          consistencySummary: null,
          habitRiskSignals: [],
        },
      },
      progress: {
        ...state,
        data: {
          progressSummary: null,
          dailyCheckIn: null,
        },
      },
      personalization: {
        ...state,
        data: {
          personalizationSnapshot: null,
          userBehaviorProfile: null,
          behavioralPatterns: [],
        },
      },
      notifications: {
        ...state,
        data: {
          notificationDecision: null,
          engagementSummary: null,
        },
      },
    },
    generatedAt: '2026-07-13T00:00:00.000Z',
    loadDurationMs: 12,
    sectionLoadDurationsMs: {
      training: 1,
      nutrition: 1,
      recovery: 1,
      goals: 1,
      habits: 1,
      progress: 1,
      personalization: 1,
      notifications: 1,
    },
  } as never;
}

function buildPipeline(
  overrides: Partial<Parameters<CoachIntelligenceMapperService['map']>[0]['pipeline']> = {},
): Parameters<CoachIntelligenceMapperService['map']>[0]['pipeline'] {
  const evidence = {
    type: 'WORKOUT_HISTORY',
    source: 'Workout',
    expert: 'Workout',
    importance: 'HIGH',
    confidence: 'HIGH',
    availability: 'AVAILABLE',
    metadata: {
      workoutLogCount: 3,
    },
  } as never;

  return {
    selection: {
      intent: 'TRAINING',
      primaryExpert: 'Workout',
      candidateExperts: ['Workout'],
      participatingExperts: ['Workout'],
    },
    routingDecision: {
      primaryExpert: 'Workout',
      participatingExperts: ['Workout'],
      routeValid: true,
      confidence: 'HIGH',
    },
    policyEvaluation: {
      decision: {
        approved: true,
        blocked: false,
        fallbackRequired: false,
        allowedTools: [],
        allowedExperts: [],
        allowedDomains: [],
        allowedLLM: false,
        metadata: {
          stage: 'CONTEXT',
          blockedExpertIds: [],
          blockedDomainIds: [],
          blockedToolIds: [],
          blockedLlmUsage: false,
          allowedDomainCount: 1,
          allowedToolCount: 0,
          allowedExpertCount: 1,
          candidateExpertCount: 1,
          selectedExpertCount: 1,
          estimatedCost: 0,
          estimatedLatencyMs: 0,
          maximumExecutionDepth: 0,
          maxSteps: 0,
          maxToolCalls: 0,
          evaluationDurationMs: 0,
          evaluatedPolicyIds: [],
          rejectedPolicyIds: [],
          violationCount: 0,
          fallbackDecisionCount: 0,
        },
      },
      violations: [],
      reason: 'approved',
      actions: [],
    },
    composition: {
      primaryExpert: {
        id: 'WorkoutExpert',
        displayName: 'Workout Expert',
        version: '1.0.0',
        category: 'TRAINING',
        supportedIntents: ['TRAINING'],
        supportedDomains: ['training'],
        estimatedCost: 1,
        estimatedLatencyMs: 10,
        priority: 10,
        capabilities: ['CONTEXT_SYNTHESIS'],
        enabled: true,
      },
      participatingExperts: [
        {
          expertId: 'WorkoutExpert',
          expertName: 'Workout Expert',
          role: 'PRIMARY',
          sequence: 0,
          summary: 'Workout expert summary.',
          recommendationCodes: ['MAINTAIN_TODAY'],
          riskLevels: ['LOW'],
          confidence: 'HIGH',
          keyFindings: ['WORKOUT_CONSISTENCY'],
          metadata: {},
        },
      ],
      assessment: {
        summary: 'Workout is on track.',
        keyFindings: ['WORKOUT_CONSISTENCY'],
        metadata: {},
      },
      summary: 'Workout is on track.',
      keyFindings: ['WORKOUT_CONSISTENCY'],
      recommendations: [
        {
          code: 'MAINTAIN_TODAY',
          summary: 'Maintain today.',
          reason: 'Workout consistency is good.',
          priority: 'PRIMARY',
          category: 'PRIMARY',
          sourceExperts: ['WorkoutExpert'],
          metadata: {},
        },
      ],
      risks: [
        {
          level: 'LOW',
          summary: 'Low workout risk.',
          factors: ['good_consistency'],
          sources: ['WorkoutExpert'],
          metadata: {},
        },
      ],
      confidence: {
        level: 'HIGH',
        summary: 'High confidence.',
        factors: ['strong_evidence'],
        metadata: {},
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
        planningDurationMs: 0,
        orchestrationDurationMs: 0,
        expertExecutionDurationMs: 1,
        executionDurationMs: 1,
        runtimeCompleteness: 'FULL',
      },
    },
    personaGuidance: {
      tone: 'SUPPORTIVE',
      verbosity: 'SHORT',
      focus: 'WORKOUT',
      directiveLevel: 'MEDIUM',
      empathyLevel: 'MEDIUM',
      encouragementLevel: 'MEDIUM',
      technicalDepth: 'BEGINNER',
      urgency: 'LOW',
      celebrationLevel: 'LOW',
      safetyLevel: 'NORMAL',
      communicationRules: [],
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
        communicationRuleCount: 0,
        runtimeCompleteness: 'FULL',
        userProfileId: 'profile_123',
        activityLevel: 'moderate',
        technicalDepthSource: 'profile',
        toneSource: 'primary-expert',
        safetySource: 'policy',
        focusSource: 'primary-expert',
      },
    },
    explanation: {
      evidence: [evidence],
      decisionReasons: [
        {
          code: 'PRIMARY_FOCUS',
          decisionType: 'FOCUS',
          supportingEvidence: [evidence],
          supportingExperts: ['Workout'],
          priority: 'HIGH',
          reasonCategory: 'WORKOUT',
          metadata: {},
        },
      ],
      recommendationReasons: [
        {
          recommendationCode: 'MAINTAIN_TODAY',
          supportingEvidence: [evidence],
          supportingExperts: ['Workout'],
          priority: 'PRIMARY',
          reasonCategory: 'WORKOUT',
          metadata: {},
        },
      ],
      riskExplanations: [
        {
          riskLevel: 'LOW',
          supportingEvidence: [evidence],
          supportingExperts: ['Workout'],
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
        supportingExpertIds: [],
        routeConfidence: 'HIGH',
        policyApproved: true,
        policyBlocked: false,
        policyFallbackRequired: false,
        runtimeCompleteness: 'FULL',
        evidenceCount: 1,
        explanationCount: 3,
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
        explanationVersion: '1.0.0',
      },
      summary: 'Workout is on track.',
    },
    expertResults: [
      {
        expertId: 'WorkoutExpert',
        summary: 'Workout expert summary.',
        contributions: [
          {
            expertId: 'WorkoutExpert',
            type: 'CONTRIBUTION',
            summary: 'Workout contribution.',
          },
        ],
        metadata: {},
      },
    ],
    expertContributions: [
      {
        expertId: 'WorkoutExpert',
        type: 'CONTRIBUTION',
        summary: 'Workout contribution.',
      },
    ],
    executionDurationMs: 12,
    compositionDurationMs: 1,
    personaDurationMs: 1,
    explainabilityDurationMs: 1,
    expertExecutionDurationMs: 1,
    routingDurationMs: 1,
    ...overrides,
  } as never;
}
