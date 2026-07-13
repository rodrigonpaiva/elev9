import { CoachExplainabilityService } from './coach-explainability.service';
import type { CoachExplainabilityEngineInput } from './coach-explainability.types';

describe('CoachExplainabilityService', () => {
  const service = new CoachExplainabilityService();

  it('builds a single-expert workout explanation', () => {
    const explanation = service.build(
      buildInput({
        unifiedCoachIntelligence: buildComposition({
          primaryExpertId: 'WorkoutExpert',
          participatingExperts: ['WorkoutExpert'],
          supportingExperts: [],
          keyFindings: ['WORKOUT_CONSISTENCY'],
          recommendations: ['MAINTAIN_TODAY'],
          risks: ['LOW'],
        }),
        coachPersonaGuidance: buildPersona({
          focus: 'WORKOUT',
          tone: 'SUPPORTIVE',
        }),
        healthContext: buildHealthContext({
          latestCheckIn: true,
          recentWorkoutLogs: 1,
          nutritionProfile: true,
          currentStreak: 6,
          adherenceScore: 84,
        }),
      }),
    );

    expect(explanation.primaryExpertId).toBe('WorkoutExpert');
    expect(explanation.participatingExperts).toEqual(['WorkoutExpert']);
    expect(explanation.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'WORKOUT_HISTORY' }),
        expect.objectContaining({ type: 'EXPERT_CONTRIBUTION' }),
      ]),
    );
    expect(explanation.recommendationReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recommendationCode: 'MAINTAIN_TODAY',
          reasonCategory: 'WORKOUT',
        }),
      ]),
    );
    expect(explanation.confidenceExplanation.confidence).toBe('HIGH');
  });

  it('builds a multi-expert explanation with conflict attribution', () => {
    const explanation = service.build(
      buildInput({
        unifiedCoachIntelligence: buildComposition({
          primaryExpertId: 'RecoveryExpert',
          participatingExperts: ['RecoveryExpert', 'WorkoutExpert'],
          supportingExperts: ['GoalExpert'],
          keyFindings: ['LOW_RECOVERY', 'PLATEAU'],
          recommendations: ['TAKE_FULL_RECOVERY_DAY', 'SHIFT_VOLUME'],
          risks: ['HIGH'],
          conflicts: ['WORKOUT_VS_RECOVERY'],
        }),
        coachPersonaGuidance: buildPersona({
          focus: 'SAFETY',
          tone: 'CAUTIOUS',
          safetyLevel: 'STRICT',
        }),
        healthContext: buildHealthContext({
          latestCheckIn: true,
          recentWorkoutLogs: 2,
          nutritionProfile: true,
          recoverySnapshot: true,
          currentStreak: 8,
          adherenceScore: 92,
        }),
      }),
    );

    expect(explanation.participatingExperts).toEqual(
      expect.arrayContaining(['RecoveryExpert', 'WorkoutExpert']),
    );
    expect(explanation.supportingExperts).toEqual(
      expect.arrayContaining(['GoalExpert']),
    );
    expect(explanation.conflictExplanations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'WORKOUT_VS_RECOVERY',
          resolvedBy: 'SAFETY',
        }),
      ]),
    );
    expect(explanation.riskExplanations[0]?.riskLevel).toBe('HIGH');
    expect(explanation.decisionReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'SAFETY_PRIORITY',
          reasonCategory: 'SAFETY',
        }),
      ]),
    );
  });

  it('filters blocked experts and blocked recommendations', () => {
    const explanation = service.build(
      buildInput({
        unifiedCoachIntelligence: buildComposition({
          primaryExpertId: 'WorkoutExpert',
          participatingExperts: ['WorkoutExpert', 'RecoveryExpert'],
          supportingExperts: ['GoalExpert'],
          blockedExpertIds: ['RecoveryExpert'],
          keyFindings: ['WORKOUT_CONSISTENCY'],
          recommendations: ['MAINTAIN_TODAY', 'TAKE_FULL_RECOVERY_DAY'],
          recommendationSources: [['WorkoutExpert'], ['RecoveryExpert']],
        }),
        coachPersonaGuidance: buildPersona({
          focus: 'WORKOUT',
          tone: 'SUPPORTIVE',
        }),
        healthContext: buildHealthContext({
          latestCheckIn: true,
          recentWorkoutLogs: 1,
          nutritionProfile: true,
        }),
      }),
    );

    expect(explanation.participatingExperts).toEqual(['WorkoutExpert']);
    expect(
      explanation.recommendationReasons.map(
        (reason) => reason.recommendationCode,
      ),
    ).toEqual(['MAINTAIN_TODAY']);
    expect(explanation.metadata.blockedExpertCount).toBe(1);
    expect(explanation.metadata.blockedRecommendationCount).toBe(1);
  });

  it('reports missing evidence deterministically', () => {
    const explanation = service.build(
      buildInput({
        unifiedCoachIntelligence: buildComposition({
          primaryExpertId: 'NutritionExpert',
          participatingExperts: ['NutritionExpert'],
          supportingExperts: [],
          keyFindings: ['NUTRITION_INCONSISTENCY'],
          recommendations: ['INCREASE_PROTEIN_INTAKE'],
          risks: ['MEDIUM'],
        }),
        coachPersonaGuidance: buildPersona({
          focus: 'NUTRITION',
          tone: 'ANALYTICAL',
        }),
        healthContext: buildHealthContext({
          latestCheckIn: false,
          recentWorkoutLogs: 0,
          nutritionProfile: false,
          goal: false,
          currentStreak: 0,
          adherenceScore: 0,
        }),
      }),
    );

    expect(explanation.missingEvidence.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        'RECOVERY_CHECK_IN_MISSING',
        'WORKOUT_HISTORY_MISSING',
        'NUTRITION_PROFILE_MISSING',
        'GOAL_HISTORY_MISSING',
      ]),
    );
    expect(
      explanation.confidenceExplanation.missingEvidenceCount,
    ).toBeGreaterThan(0);
  });
});

function buildInput(
  overrides: Partial<CoachExplainabilityEngineInput> = {},
): CoachExplainabilityEngineInput {
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
            blockedExpertIds: [],
          },
        },
        violations: [],
        reason: 'approved',
        actions: [],
      } as CoachExplainabilityEngineInput['safetyDecisions']['policyEvaluation'],
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

function buildComposition(overrides: {
  primaryExpertId: string;
  participatingExperts: string[];
  supportingExperts: string[];
  keyFindings: string[];
  recommendations: string[];
  risks: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>;
  conflicts?: string[];
  blockedExpertIds?: string[];
  recommendationSources?: string[][];
}): NonNullable<CoachExplainabilityEngineInput['unifiedCoachIntelligence']> {
  return {
    primaryExpert: {
      id: overrides.primaryExpertId,
      displayName: overrides.primaryExpertId,
      version: '1.0.0',
      category: 'TRAINING',
      supportedIntents: ['TRAINING'],
      supportedDomains: ['training'],
      estimatedCost: 1,
      estimatedLatencyMs: 1,
      priority: 100,
      capabilities: ['TRAINING_SPECIALIST'],
      enabled: true,
    },
    participatingExperts: overrides.participatingExperts.map(
      (expertId, index) => ({
        expertId,
        expertName: expertId,
        role: index === 0 ? 'PRIMARY' : 'COMPLEMENTARY',
        sequence: index,
        summary: `${expertId} summary`,
        recommendationCodes: overrides.recommendations,
        riskLevels: overrides.risks,
        confidence: 'HIGH',
        keyFindings: overrides.keyFindings,
        metadata: {},
      }),
    ),
    assessment: {
      summary: 'summary',
      keyFindings: overrides.keyFindings,
      metadata: {},
    },
    summary: 'summary',
    keyFindings: overrides.keyFindings,
    recommendations: overrides.recommendations.map((code, index) => ({
      code,
      summary: code,
      reason: code,
      priority: 'LOW',
      category: 'PRIMARY',
      sourceExperts: overrides.recommendationSources?.[index] ?? [
        overrides.participatingExperts[0],
      ],
      metadata: {},
    })),
    risks: (overrides.risks ?? []).map((level) => ({
      level,
      summary: `risk=${level}`,
      factors: ['stable'],
      sources: overrides.participatingExperts,
      metadata: {},
    })),
    confidence: {
      level: 'HIGH',
      summary: 'confidence=HIGH',
      factors: [],
      metadata: {},
    },
    conflicts: (overrides.conflicts ?? []).map((type) => ({
      type,
      experts: overrides.participatingExperts,
      severity: 'HIGH',
      resolution: {
        strategy: 'SAFETY',
        winnerExpertId: overrides.primaryExpertId,
        metadata: {},
      },
      metadata: {},
    })),
    supportingExperts: overrides.supportingExperts.map((expertId, index) => ({
      expertId,
      expertName: expertId,
      role: 'DEPENDENCY',
      sequence: index,
      summary: `${expertId} summary`,
      recommendationCodes: [],
      riskLevels: [],
      confidence: 'HIGH',
      keyFindings: [],
      metadata: {},
    })),
    metadata: {
      requestId: 'request_123',
      intent: 'TRAINING',
      selectedDomains: ['training'],
      primaryExpertId: overrides.primaryExpertId,
      participatingExpertIds: overrides.participatingExperts,
      supportingExpertIds: overrides.supportingExperts,
      blockedExpertIds: overrides.blockedExpertIds ?? [],
      skippedExpertIds: [],
      routeValid: true,
      routeConfidence: 'HIGH',
      policyApproved: true,
      policyBlocked: false,
      policyFallbackRequired: false,
      candidateExpertCount: overrides.participatingExperts.length,
      participatingExpertCount: overrides.participatingExperts.length,
      recommendationCount: overrides.recommendations.length,
      riskCount: overrides.risks?.length ?? 0,
      conflictCount: overrides.conflicts?.length ?? 0,
      expertResultCount: overrides.participatingExperts.length,
      expertContributionCount: overrides.participatingExperts.length,
      compositionDurationMs: 1,
      planningDurationMs: 2,
      orchestrationDurationMs: 4,
      expertExecutionDurationMs: 6,
      executionDurationMs: 9,
      runtimeCompleteness: 'FULL',
    },
  } as NonNullable<CoachExplainabilityEngineInput['unifiedCoachIntelligence']>;
}

function buildPersona(
  overrides: Partial<
    CoachExplainabilityEngineInput['coachPersonaGuidance']
  > = {},
): NonNullable<CoachExplainabilityEngineInput['coachPersonaGuidance']> {
  return {
    tone: overrides.tone ?? 'SUPPORTIVE',
    verbosity: overrides.verbosity ?? 'SHORT',
    focus: overrides.focus ?? 'WORKOUT',
    directiveLevel: overrides.directiveLevel ?? 'MEDIUM',
    empathyLevel: overrides.empathyLevel ?? 'MEDIUM',
    encouragementLevel: overrides.encouragementLevel ?? 'MEDIUM',
    technicalDepth: overrides.technicalDepth ?? 'INTERMEDIATE',
    urgency: overrides.urgency ?? 'LOW',
    celebrationLevel: overrides.celebrationLevel ?? 'LOW',
    safetyLevel: overrides.safetyLevel ?? 'NORMAL',
    communicationStyle: {
      tone: overrides.tone ?? 'SUPPORTIVE',
      directiveLevel: overrides.directiveLevel ?? 'MEDIUM',
      empathyLevel: overrides.empathyLevel ?? 'MEDIUM',
      encouragementLevel: overrides.encouragementLevel ?? 'MEDIUM',
      technicalDepth: overrides.technicalDepth ?? 'INTERMEDIATE',
      urgency: overrides.urgency ?? 'LOW',
      celebrationLevel: overrides.celebrationLevel ?? 'LOW',
      safetyLevel: overrides.safetyLevel ?? 'NORMAL',
    },
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
      recommendationCount: 0,
      communicationRuleCount: 0,
      runtimeCompleteness: 'FULL',
      userProfileId: 'profile_123',
      activityLevel: 'medium',
      technicalDepthSource: 'INTERMEDIATE',
      toneSource: 'SUPPORTIVE',
      safetySource: 'NORMAL',
      focusSource: 'WorkoutExpert',
    },
  } as NonNullable<CoachExplainabilityEngineInput['coachPersonaGuidance']>;
}

function buildHealthContext(
  overrides: Partial<{
    latestCheckIn: boolean;
    recentWorkoutLogs: number;
    nutritionProfile: boolean;
    recoverySnapshot: boolean;
    currentStreak: number;
    adherenceScore: number;
    goal: boolean;
  }> = {},
): CoachExplainabilityEngineInput['healthContext'] {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    userName: 'Athlete',
    goal: overrides.goal === false ? undefined : 'gain_muscle',
    activityLevel: 'medium',
    weeklyFrequency: 4,
    adherenceScore: overrides.adherenceScore ?? 75,
    currentStreak: overrides.currentStreak ?? 3,
    averageWorkoutDuration: 45,
    fatigueLevel: 'MODERATE',
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    activeTrainingPlanId: 'training_123',
    latestCheckIn:
      overrides.latestCheckIn === false
        ? undefined
        : {
            energyLevel: 3,
            sleepQuality: 3,
            muscleSoreness: 3,
            motivationLevel: 3,
            createdAt: new Date('2026-07-07T09:00:00.000Z'),
          },
    recoverySnapshot:
      overrides.recoverySnapshot === false
        ? undefined
        : ({
            date: '2026-07-07',
            readinessScore: 72,
            fatigueScore: 28,
            recoveryTrend: 'stable',
            recommendedIntensity: 'moderate',
            influences: [],
            formulaVersion: 'recovery-v1',
            createdAt: new Date('2026-07-07T09:00:00.000Z'),
          } as never),
    nutritionProfile:
      overrides.nutritionProfile === false
        ? undefined
        : {
            goal: 'muscle_gain',
            mealsPerDay: 4,
            dietaryRestrictions: [],
            allergies: [],
            dislikedFoods: [],
            preferredFoods: [],
          },
    recentWorkoutLogs: Array.from({
      length: overrides.recentWorkoutLogs ?? 2,
    }).map((_, index) => ({
      id: `workout_${index + 1}`,
      trainingPlanId: 'training_123',
      workoutDayIndex: index + 1,
      durationMinutes: 45,
      completedExercises: [],
      date: '2026-07-07',
      createdAt: new Date('2026-07-07T09:00:00.000Z'),
      updatedAt: new Date('2026-07-07T09:00:00.000Z'),
    })),
    generatedAt: new Date('2026-07-07T10:00:00.000Z'),
  };
}
