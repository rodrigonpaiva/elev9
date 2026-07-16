import { CoachIntelligenceAggregationService } from './coach-intelligence.aggregation.service';
import { GetCoachIntelligenceError } from './coach-intelligence.errors';

const buildHealthContext = (): Record<string, unknown> => ({
  generatedAt: '2026-07-13T00:00:00.000Z',
  goal: 'fat_loss',
  activityLevel: 'moderate',
  weeklyFrequency: 4,
  adherenceScore: 82,
  currentStreak: 6,
  averageWorkoutDuration: 45,
  fatigueLevel: 'medium',
  availableEquipment: [],
  limitations: [],
  todayWorkout: undefined,
  activeTrainingPlanId: 'plan_123',
  latestCheckIn: {
    createdAt: '2026-07-13T00:00:00.000Z',
  },
  recoverySnapshot: {
    createdAt: '2026-07-13T00:00:00.000Z',
  },
  adaptiveTrainingRecommendation: {
    createdAt: '2026-07-13T00:00:00.000Z',
  },
  adaptiveRecommendationType: 'build',
  adaptiveRecommendedIntensity: 'moderate',
  adaptiveVolumeAction: 'maintain',
  adaptiveTrainingInfluences: [],
  adaptiveTrainingReasoning: [],
  readinessScore: 72,
  fatigueScore: 28,
  recoveryInfluences: [],
  recoveryTrend: 'stable',
  recommendedIntensity: 'moderate',
  nutritionProfile: {
    createdAt: '2026-07-13T00:00:00.000Z',
  },
  recentWorkoutLogs: [],
});

describe('CoachIntelligenceAggregationService', () => {
  let configService: { isEnabled: jest.Mock };
  let contextAssemblerService: { resolveUserProfile: jest.Mock; assemble: jest.Mock };
  let coachExpertRegistry: {
    getExpertsForIntent: jest.Mock;
    getExpertsForDomains: jest.Mock;
    getEnabledExperts: jest.Mock;
    getExpert: jest.Mock;
  };
  let coachExpertRouterService: { route: jest.Mock };
  let coachExpertCompositionService: { compose: jest.Mock };
  let coachPersonaEngineService: { build: jest.Mock };
  let coachExplainabilityService: { build: jest.Mock };
  let coachIntelligenceMapperService: { map: jest.Mock };
  let coachIntelligenceObservabilityService: {
    startTrace: jest.Mock;
    completeTrace: jest.Mock;
    failTrace: jest.Mock;
  };
  let coachExpertObservabilityService: {
    startTrace: jest.Mock;
    completeTrace: jest.Mock;
  };
  let aiRolloutService: { resolveCoachChatAssignment: jest.Mock };
  let service: CoachIntelligenceAggregationService;

  beforeEach(() => {
    configService = {
      isEnabled: jest.fn().mockReturnValue(true),
    };
    contextAssemblerService = {
      resolveUserProfile: jest.fn(),
      assemble: jest.fn(),
    };
    coachExpertRegistry = {
      getExpertsForIntent: jest.fn(),
      getExpertsForDomains: jest.fn(),
      getEnabledExperts: jest.fn(),
      getExpert: jest.fn(),
    };
    coachExpertRouterService = {
      route: jest.fn(),
    };
    coachExpertCompositionService = {
      compose: jest.fn(),
    };
    coachPersonaEngineService = {
      build: jest.fn(),
    };
    coachExplainabilityService = {
      build: jest.fn(),
    };
    coachIntelligenceMapperService = {
      map: jest.fn(),
    };
    coachIntelligenceObservabilityService = {
      startTrace: jest.fn().mockReturnValue(buildCoachIntelligenceTrace()),
      completeTrace: jest.fn(),
      failTrace: jest.fn(),
    };
    coachExpertObservabilityService = {
      startTrace: jest.fn(),
      completeTrace: jest.fn(),
    };
    aiRolloutService = {
      resolveCoachChatAssignment: jest.fn().mockReturnValue({
        experimentId: 'experiment_123',
        canaryBucket: 'A',
        rolloutVariant: 'aggregate',
      }),
    };

    service = new CoachIntelligenceAggregationService(
      configService as never,
      contextAssemblerService as never,
      coachExpertRegistry as never,
      coachExpertRouterService as never,
      coachExpertCompositionService as never,
      coachPersonaEngineService as never,
      coachExplainabilityService as never,
      coachIntelligenceMapperService as never,
      coachIntelligenceObservabilityService as never,
      coachExpertObservabilityService as never,
      aiRolloutService as never,
    );
  });

  it('fails fast when the aggregate feature flag is disabled', async () => {
    configService.isEnabled.mockReturnValue(false);

    await expect(
      service.build({
        authUserId: 'auth_123',
      }),
    ).rejects.toMatchObject({
      code: 'COACH_INTELLIGENCE_FEATURE_DISABLED',
    });

    expect(contextAssemblerService.assemble).not.toHaveBeenCalled();
    expect(coachIntelligenceObservabilityService.startTrace).not.toHaveBeenCalled();
  });

  it('builds a deterministic aggregate and records observability', async () => {
    const expert = buildExpert('WorkoutExpert', 'Workout Expert');
    const candidateExperts = [expert.metadata];
    const sections = buildSections();
    const source = buildSourceContext({
      sections,
      expertContext: {
        userProfileId: 'profile_123',
        healthContext: buildHealthContext(),
      },
    });
    const aggregate = buildAggregate();

    contextAssemblerService.resolveUserProfile.mockResolvedValue({
      id: 'profile_123',
      name: 'Ada',
    });
    contextAssemblerService.assemble.mockResolvedValue({
      authUserId: 'auth_123',
      userProfileId: 'profile_123',
      healthContext: buildHealthContext(),
      source,
      selectedDomains: [
        'training',
        'nutrition',
        'recovery',
        'goals',
        'habits',
        'progress',
        'personalization',
        'notifications',
      ],
      generatedAt: '2026-07-13T00:00:00.000Z',
    });
    coachExpertRegistry.getExpertsForIntent.mockReturnValue([expert]);
    coachExpertRegistry.getExpertsForDomains.mockReturnValue([]);
    coachExpertRegistry.getEnabledExperts.mockReturnValue([expert]);
    coachExpertRegistry.getExpert.mockReturnValue(expert);
    coachExpertRouterService.route.mockReturnValue({
      primaryExpert: expert.metadata,
      complementaryExperts: [],
      orderedExperts: [expert.metadata],
      blockedExperts: [],
      skippedExperts: [],
      routingReasons: [],
      estimatedCost: 1,
      estimatedLatencyMs: 12,
      confidence: 'HIGH',
      route: {
        primaryExpert: {
          expert: expert.metadata,
          role: 'PRIMARY',
          sequence: 0,
          reasonCodes: ['PRIMARY_INTENT_MATCH'],
        },
        complementaryExperts: [],
        orderedExperts: [expert.metadata],
        blockedExperts: [],
        skippedExperts: [],
      },
      metadata: {
        routeValid: true,
      },
    });
    coachExpertCompositionService.compose.mockReturnValue({
      primaryExpert: expert.metadata,
      participatingExperts: [],
      assessment: {
        summary: 'Summary',
        keyFindings: [],
        metadata: {},
      },
      summary: 'Summary',
      keyFindings: [],
      recommendations: [],
      risks: [],
      confidence: {
        level: 'HIGH',
        summary: 'High confidence',
        factors: [],
        metadata: {},
      },
      conflicts: [],
      supportingExperts: [],
      metadata: {
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
        recommendationCount: 0,
        riskCount: 0,
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
    });
    coachPersonaEngineService.build.mockReturnValue({
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
        intent: 'TRAINING',
        selectedDomains: ['training'],
        routeConfidence: 'HIGH',
        policyApproved: true,
        policyBlocked: false,
        policyFallbackRequired: false,
        runtimeCompleteness: 'FULL',
        recommendationCount: 0,
        conflictCount: 0,
        communicationRuleCount: 0,
        primaryExpertId: 'WorkoutExpert',
        participatingExpertIds: ['WorkoutExpert'],
        supportingExpertIds: [],
        blockedExpertIds: [],
        userProfileId: 'profile_123',
        activityLevel: 'moderate',
        technicalDepthSource: 'profile',
        toneSource: 'primary-expert',
        safetySource: 'policy',
        focusSource: 'primary-expert',
      },
    });
    coachExplainabilityService.build.mockReturnValue({
      evidence: [],
      decisionReasons: [],
      recommendationReasons: [],
      riskExplanations: [],
      confidenceExplanation: {
        confidence: 'HIGH',
        supportingEvidenceCount: 0,
        supportingExpertCount: 1,
        missingEvidenceCount: 0,
        policyRestrictions: [],
        metadata: {},
      },
      conflictExplanations: [],
      missingEvidence: [],
      metadata: {
        intent: 'TRAINING',
        selectedDomains: ['training'],
        routeConfidence: 'HIGH',
        policyApproved: true,
        policyBlocked: false,
        policyFallbackRequired: false,
        runtimeCompleteness: 'FULL',
        evidenceCount: 0,
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
        explanationVersion: '1.0.0',
        primaryExpertId: 'WorkoutExpert',
        participatingExpertIds: ['WorkoutExpert'],
        supportingExpertIds: [],
      },
      summary: 'Summary',
    });
    coachExpertObservabilityService.startTrace.mockReturnValue({
      traceId: 'trace_123',
    });
    coachIntelligenceMapperService.map.mockReturnValue(aggregate);
    coachExpertRegistry.getExpert.mockReturnValue(expert);

    const result = await service.build({
      authUserId: 'auth_123',
      requestId: 'request_123',
      conversationId: 'conversation_123',
      userProfileId: 'profile_123',
    });

    expect(result.aggregate.header.aggregateId).toBe('aggregate_123');
    expect(coachIntelligenceMapperService.map).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: 'request_123',
        requestId: 'request_123',
        sourceVersion: '1.0.0',
        rolloutState: 'aggregate',
      }),
    );
    expect(coachExpertObservabilityService.completeTrace).toHaveBeenCalled();
    expect(coachIntelligenceObservabilityService.completeTrace).toHaveBeenCalled();
  });

  it('normalizes unexpected failures through the aggregate observability layer', async () => {
    contextAssemblerService.resolveUserProfile.mockResolvedValue({
      id: 'profile_123',
    });
    contextAssemblerService.assemble.mockRejectedValue(new Error('boom'));

    await expect(
      service.build({
        authUserId: 'auth_123',
      }),
    ).rejects.toMatchObject({
      code: 'COACH_INTELLIGENCE_INTERNAL_ERROR',
    });

    expect(coachIntelligenceObservabilityService.failTrace).toHaveBeenCalled();
  });
});

function buildExpert(id: string, displayName: string) {
  return {
    id,
    metadata: {
      id,
      displayName,
      version: '1.0.0',
      category: 'PROGRESS',
      supportedIntents: ['TRAINING'],
      supportedDomains: ['training'],
      estimatedCost: 1,
      estimatedLatencyMs: 10,
      priority: 10,
      capabilities: ['CONTEXT_SYNTHESIS'],
      enabled: true,
    },
    loadContext: jest.fn((request: never, context: never) => context),
    analyze: jest.fn(() => ({
      expertId: id,
      summary: `${displayName} summary`,
      contributions: [
        {
          expertId: id,
          type: 'CONTEXT',
          summary: `${displayName} contribution`,
        },
      ],
      metadata: {
        expertId: id,
      },
    })),
    contribute: jest.fn(() => [
      {
        expertId: id,
        type: 'CONTRIBUTION',
        summary: `${displayName} contribution`,
      },
    ]),
  };
}

function buildSourceContext(input: {
  sections: Record<string, never>;
  expertContext: Readonly<Record<string, unknown>>;
}) {
  return {
    authUserId: 'auth_123',
    userProfileId: 'profile_123',
    healthContext: buildHealthContext(),
    sections: input.sections,
    expertContext: input.expertContext,
    source: {
      loadDurationMs: 12,
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
    selectedDomains: [
      'training',
      'nutrition',
      'recovery',
      'goals',
      'habits',
      'progress',
      'personalization',
      'notifications',
    ],
    coachDecision: undefined,
  };
}

function buildSections() {
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
    },
    data: {
      trainingPlan: null,
      adaptiveTrainingRecommendation: null,
    },
    warnings: [],
  };

  return {
    training: state,
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
  } as never;
}

function buildAggregate() {
  return {
    header: {
      aggregateId: 'aggregate_123',
      requestId: 'request_123',
      generatedAt: '2026-07-13T00:00:00.000Z',
      sourceVersion: '1.0.0',
      rolloutState: 'aggregate',
    },
    ownership: {
      primaryExpert: 'Workout',
      participatingExperts: ['Workout'],
      supportingExperts: [],
    },
    insight: {
      summary: 'Summary',
      dailyPriority: 'PRIMARY',
      currentFocus: 'WORKOUT',
      currentRisk: null,
      topRecommendation: null,
      keyFindings: [],
      recommendations: [],
      risks: [],
      confidence: {
        level: 'HIGH',
        evidenceCount: 0,
        supportingEvidenceCount: 0,
        missingEvidenceCount: 0,
        policyConfidence: 'HIGH',
        runtimeCompleteness: 'HIGH',
        detail: 'High confidence',
      },
      conflicts: [],
    },
    evidence: [],
    explainability: {
      evidence: [],
      decisionReasons: [],
      recommendationReasons: [],
      riskExplanations: [],
      confidenceExplanation: {
        confidence: 'HIGH',
        supportingEvidenceCount: 0,
        supportingExpertCount: 1,
        missingEvidenceCount: 0,
        policyRestrictions: [],
        metadata: {},
      },
      conflictExplanations: [],
      missingEvidence: [],
      metadata: {
        generatedAt: '2026-07-13T00:00:00.000Z',
        durationMs: 1,
        evidenceCount: 0,
        explanationCount: 0,
        missingEvidenceCount: 0,
      },
      summary: 'Summary',
    },
    warnings: [],
    availability: {
      status: 'available',
      fallbackUsed: false,
      retryable: false,
      reasonCode: 'READY',
      sections: {
        insight: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        evidence: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        explainability: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        training: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        nutrition: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        recovery: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        goals: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        habits: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        progress: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        personalization: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
        notifications: { status: 'available', fallbackUsed: false, retryable: false, reasonCode: 'READY' },
      },
    },
    freshness: {
      status: 'fresh',
      generatedAt: '2026-07-13T00:00:00.000Z',
      sourceTimestamp: '2026-07-13T00:00:00.000Z',
      ageMs: 0,
      sections: {
        insight: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        evidence: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        explainability: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        training: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        nutrition: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        recovery: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        goals: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        habits: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        progress: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        personalization: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
        notifications: { status: 'fresh', generatedAt: '2026-07-13T00:00:00.000Z' },
      },
    },
    sections: buildSections(),
    metadata: {
      contractVersion: '1',
      partialResult: false,
      fallbackUsed: false,
      featureAvailability: {
        insight: true,
        evidence: true,
        explainability: true,
        training: true,
        nutrition: true,
        recovery: true,
        goals: true,
        habits: true,
        progress: true,
        personalization: true,
        notifications: true,
      },
    },
  };
}

function buildCoachIntelligenceTrace() {
  return {
    requestId: 'request_123',
    authUserId: 'auth_123',
    userProfileId: 'profile_123',
    status: 'RUNNING',
    startedAt: '2026-07-13T00:00:00.000Z',
    partialResult: false,
    fallbackUsed: false,
    participatingExperts: [],
    unavailableSections: [],
    degradedSections: [],
    staleSections: [],
    warningCount: 0,
    warnings: [],
    metadata: {},
  } as never;
}
