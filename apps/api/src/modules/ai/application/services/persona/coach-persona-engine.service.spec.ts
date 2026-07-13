import { CoachPersonaEngineService } from './coach-persona-engine.service';
import type { CoachPersonaEngineInput } from './coach-persona-engine.types';

describe('CoachPersonaEngineService', () => {
  const service = new CoachPersonaEngineService();

  it('builds a workout persona for an active training request', () => {
    const guidance = service.build(
      buildInput({
        unifiedCoachIntelligence: buildIntelligence({
          primaryExpertId: 'WorkoutExpert',
          riskLevel: 'LOW',
          keyFindings: ['WORKOUT_CONSISTENCY'],
          recommendations: ['MAINTAIN_TODAY'],
        }),
        selectedDomains: ['training'],
        healthContext: buildHealthContext({
          goal: 'gain_muscle',
          activityLevel: 'medium',
          weeklyFrequency: 4,
          currentStreak: 5,
          adherenceScore: 82,
        }),
      }),
    );

    expect(guidance.focus).toBe('WORKOUT');
    expect(guidance.tone).toBe('SUPPORTIVE');
    expect(guidance.verbosity).toBe('SHORT');
    expect(guidance.directiveLevel).toBe('MEDIUM');
    expect(guidance.empathyLevel).toBe('MEDIUM');
    expect(guidance.encouragementLevel).toBe('MEDIUM');
    expect(guidance.safetyLevel).toBe('NORMAL');
    expect(guidance.communicationRules).toEqual(
      expect.arrayContaining([
        'PRIORITIZE_WORKOUT',
        'USE_MEDIUM_ENCOURAGEMENT',
      ]),
    );
  });

  it('builds a nutrition persona for detailed guidance', () => {
    const guidance = service.build(
      buildInput({
        unifiedCoachIntelligence: buildIntelligence({
          primaryExpertId: 'NutritionExpert',
          keyFindings: ['NUTRITION_INCONSISTENCY'],
          recommendations: ['INCREASE_PROTEIN_INTAKE', 'STABILIZE_MEAL_TIMING'],
        }),
        selectedDomains: ['nutrition'],
        healthContext: buildHealthContext({
          goal: 'maintain',
          activityLevel: 'medium',
          weeklyFrequency: 3,
          currentStreak: 2,
          adherenceScore: 70,
        }),
        personalization: {
          preferredCoachingStyle: 'educational',
          engagementProfile: 'medium',
          topBehavioralPatterns: [],
        },
      }),
    );

    expect(guidance.focus).toBe('NUTRITION');
    expect(guidance.tone).toBe('ANALYTICAL');
    expect(guidance.verbosity).toBe('NORMAL');
    expect(guidance.technicalDepth).toBe('INTERMEDIATE');
    expect(guidance.safetyLevel).toBe('ELEVATED');
  });

  it('elevates recovery guidance to strict safety and critical urgency', () => {
    const guidance = service.build(
      buildInput({
        unifiedCoachIntelligence: buildIntelligence({
          primaryExpertId: 'RecoveryExpert',
          riskLevel: 'CRITICAL',
          keyFindings: ['LOW_RECOVERY'],
          recommendations: ['TAKE_FULL_RECOVERY_DAY'],
          conflicts: ['WORKOUT_VS_RECOVERY'],
        }),
        selectedDomains: ['recovery', 'training'],
        healthContext: buildHealthContext({
          goal: 'gain_muscle',
          activityLevel: 'high',
          weeklyFrequency: 5,
          currentStreak: 8,
          adherenceScore: 88,
        }),
        policyBlocked: true,
      }),
    );

    expect(guidance.focus).toBe('SAFETY');
    expect(guidance.tone).toBe('CAUTIOUS');
    expect(guidance.verbosity).toBe('VERY_SHORT');
    expect(guidance.urgency).toBe('CRITICAL');
    expect(guidance.safetyLevel).toBe('STRICT');
    expect(guidance.communicationRules).toEqual(
      expect.arrayContaining(['LEAD_WITH_SAFETY', 'DO_NOT_OVERRIDE_SAFETY']),
    );
  });

  it('selects analytical guidance for a plateau with advanced profile', () => {
    const guidance = service.build(
      buildInput({
        unifiedCoachIntelligence: buildIntelligence({
          primaryExpertId: 'ProgressExpert',
          keyFindings: ['PLATEAU'],
          recommendations: ['CHANGE_BLOCK', 'SHIFT_VOLUME'],
        }),
        selectedDomains: ['progress'],
        healthContext: buildHealthContext({
          goal: 'gain_muscle',
          activityLevel: 'high',
          weeklyFrequency: 6,
          currentStreak: 9,
          adherenceScore: 91,
        }),
      }),
    );

    expect(guidance.focus).toBe('PROGRESS');
    expect(guidance.tone).toBe('ANALYTICAL');
    expect(guidance.verbosity).toBe('NORMAL');
    expect(guidance.technicalDepth).toBe('ADVANCED');
  });

  it('celebrates milestones without weakening safety rules', () => {
    const guidance = service.build(
      buildInput({
        unifiedCoachIntelligence: buildIntelligence({
          primaryExpertId: 'GoalExpert',
          keyFindings: ['RECENT_MILESTONE', 'STRONG_PROGRESS'],
          recommendations: ['ACKNOWLEDGE_MILESTONE'],
        }),
        selectedDomains: ['goals', 'progress'],
        healthContext: buildHealthContext({
          goal: 'gain_muscle',
          activityLevel: 'medium',
          weeklyFrequency: 4,
          currentStreak: 6,
          adherenceScore: 84,
        }),
      }),
    );

    expect(guidance.tone).toBe('CELEBRATORY');
    expect(guidance.celebrationLevel).toBe('HIGH');
    expect(guidance.urgency).toBe('MEDIUM');
  });

  it('keeps workout skipped guidance low urgency', () => {
    const guidance = service.build(
      buildInput({
        unifiedCoachIntelligence: buildIntelligence({
          primaryExpertId: 'WorkoutExpert',
          keyFindings: ['WORKOUT_CONSISTENCY'],
          recommendations: ['MAINTAIN_TODAY'],
        }),
        selectedDomains: ['training'],
        healthContext: buildHealthContext({
          goal: 'gain_muscle',
          activityLevel: 'low',
          weeklyFrequency: 2,
          currentStreak: 0,
          adherenceScore: 52,
          recentWorkoutLogs: [],
        }),
      }),
    );

    expect(guidance.technicalDepth).toBe('BEGINNER');
    expect(guidance.urgency).toBe('LOW');
    expect(guidance.empathyLevel).toBe('HIGH');
  });

  it('keeps the result deterministic across repeated builds', () => {
    const input = buildInput({
      unifiedCoachIntelligence: buildIntelligence({
        primaryExpertId: 'WorkoutExpert',
        keyFindings: ['WORKOUT_CONSISTENCY'],
        recommendations: ['MAINTAIN_TODAY'],
      }),
      selectedDomains: ['training'],
      healthContext: buildHealthContext({
        goal: 'gain_muscle',
        activityLevel: 'medium',
        weeklyFrequency: 4,
        currentStreak: 5,
        adherenceScore: 82,
      }),
    });

    expect(service.build(input)).toEqual(service.build(input));
  });
});

function buildInput(
  overrides: Partial<CoachPersonaEngineInput> = {},
): CoachPersonaEngineInput {
  return {
    intent: 'TRAINING',
    selectedDomains: ['training'],
    healthContext: buildHealthContext({}),
    runtimeMetadata: {
      planningDurationMs: 2,
      orchestrationDurationMs: 4,
      expertExecutionDurationMs: 6,
      executionDurationMs: 9,
      stepCount: 5,
      responseMode: 'standard',
    },
    safetyDecisions: {
      policyEvaluation: {
        stage: 'EXECUTION',
        requestId: 'request_123',
        decision: {
          approved: true,
          blocked: false,
          fallbackRequired: false,
          allowedDomains: [],
          blockedDomains: [],
          allowedExperts: [],
          blockedExperts: [],
          allowedTools: [],
          blockedTools: [],
          allowedMemoryScopes: [],
          fallbackReason: 'none',
          confidence: 'HIGH',
          metadata: {
            stage: 'EXECUTION',
            evaluationDurationMs: 1,
          },
        },
        violations: [],
        reason: 'approved',
        actions: [],
      } as CoachPersonaEngineInput['safetyDecisions']['policyEvaluation'],
      safetyMetadata: {
        deterministicFirst: true,
        toolCallingEnabled: false,
        fallbackAllowed: true,
        promptVersion: 'coach-chat-prompt-v1',
      },
    },
    ...overrides,
  };
}

function buildIntelligence(
  overrides: Partial<
    NonNullable<CoachPersonaEngineInput['unifiedCoachIntelligence']>
  > &
    Partial<CoachPersonaEngineInput['unifiedCoachIntelligence']> = {},
): NonNullable<CoachPersonaEngineInput['unifiedCoachIntelligence']> {
  return {
    primaryExpert: {
      id: overrides.primaryExpert?.id ?? 'WorkoutExpert',
      displayName: overrides.primaryExpert?.displayName ?? 'Workout Expert',
      version: overrides.primaryExpert?.version ?? '1.0.0',
      category: overrides.primaryExpert?.category ?? 'TRAINING',
      supportedIntents: overrides.primaryExpert?.supportedIntents ?? [
        'TRAINING',
      ],
      supportedDomains: overrides.primaryExpert?.supportedDomains ?? [
        'training',
      ],
      estimatedCost: overrides.primaryExpert?.estimatedCost ?? 1,
      estimatedLatencyMs: overrides.primaryExpert?.estimatedLatencyMs ?? 1,
      priority: overrides.primaryExpert?.priority ?? 100,
      capabilities: overrides.primaryExpert?.capabilities ?? [
        'TRAINING_SPECIALIST',
      ],
      enabled: overrides.primaryExpert?.enabled ?? true,
    },
    participatingExperts: overrides.participatingExperts ?? [],
    assessment: overrides.assessment ?? {
      summary: 'summary',
      keyFindings: [],
      metadata: {},
    },
    summary: overrides.summary ?? 'summary',
    keyFindings: overrides.keyFindings ?? [],
    recommendations: (overrides.recommendations ?? []).map((code, index) => ({
      code,
      summary: code,
      reason: code,
      priority: 'LOW',
      category: 'PRIMARY',
      sourceExperts: ['WorkoutExpert'],
      metadata: {
        sourceOrder: index,
      },
    })),
    risks: overrides.risks ?? [
      {
        level: 'LOW',
        summary: 'risk=LOW; sources=WorkoutExpert',
        factors: ['stable'],
        sources: ['WorkoutExpert'],
        metadata: {},
      },
    ],
    confidence: overrides.confidence ?? {
      level: 'HIGH',
      summary: 'confidence=HIGH; score=2.4',
      factors: [],
      metadata: {},
    },
    conflicts: (overrides.conflicts ?? []).map((type, index) => ({
      type: 'UNKNOWN',
      experts: ['WorkoutExpert', 'RecoveryExpert'],
      severity: 'HIGH',
      resolution: {
        strategy: 'PRIMARY_EXPERT',
        winnerExpertId: 'WorkoutExpert',
        metadata: {
          conflictType: type,
          sourceOrder: index,
        },
      },
      metadata: {
        sourceType: type,
      },
    })),
    supportingExperts: overrides.supportingExperts ?? [],
    metadata: {
      requestId: 'request_123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: overrides.metadata?.primaryExpertId ?? 'WorkoutExpert',
      participatingExpertIds: overrides.metadata?.participatingExpertIds ?? [
        'WorkoutExpert',
      ],
      supportingExpertIds: overrides.metadata?.supportingExpertIds ?? [],
      blockedExpertIds: overrides.metadata?.blockedExpertIds ?? [],
      skippedExpertIds: overrides.metadata?.skippedExpertIds ?? [],
      routeValid: true,
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      candidateExpertCount: 1,
      participatingExpertCount: 1,
      recommendationCount: (overrides.recommendations ?? []).length,
      riskCount: (overrides.risks ?? []).length,
      conflictCount: (overrides.conflicts ?? []).length,
      expertResultCount: 1,
      expertContributionCount: 1,
      compositionDurationMs: 1,
      planningDurationMs: 2,
      orchestrationDurationMs: 4,
      expertExecutionDurationMs: 6,
      executionDurationMs: 9,
      runtimeCompleteness: 'FULL',
    },
  } as NonNullable<CoachPersonaEngineInput['unifiedCoachIntelligence']>;
}

function buildHealthContext(
  overrides: Partial<CoachPersonaEngineInput['healthContext']> = {},
): CoachPersonaEngineInput['healthContext'] {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    userName: 'Athlete',
    goal: 'gain_muscle',
    activityLevel: 'medium',
    weeklyFrequency: 4,
    adherenceScore: 75,
    currentStreak: 3,
    averageWorkoutDuration: 45,
    fatigueLevel: 'MODERATE',
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: 'training_123',
    latestCheckIn: {
      energyLevel: 3,
      sleepQuality: 3,
      muscleSoreness: 3,
      motivationLevel: 3,
      createdAt: new Date('2026-07-07T09:00:00.000Z'),
    },
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-07-07T10:00:00.000Z'),
    ...overrides,
  };
}
