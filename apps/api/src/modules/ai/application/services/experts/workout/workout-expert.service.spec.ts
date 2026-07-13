import { CoachExpertRegistry } from '../coach-expert.registry';
import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import { WorkoutExpert } from './workout-expert.service';

describe('WorkoutExpert', () => {
  const expert = new WorkoutExpert();

  it('analyzes a completed workout as low risk and maintains the session', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          todayWorkout: buildTodayWorkout(),
          recentWorkoutLogs: [
            buildWorkoutLog({
              workoutDayIndex: 2,
              completedExercises: [
                { name: 'Squat', setsDone: 4, repsDone: 5 },
                { name: 'Bench Press', setsDone: 4, repsDone: 5 },
              ],
            }),
          ],
          recoverySnapshot: {
            readinessScore: 88,
            fatigueScore: 12,
            recoveryTrend: 'improving',
            recommendedIntensity: 'hard',
            influences: [],
          },
          adaptiveTrainingRecommendation: {
            recommendationType: 'maintain',
            recommendedIntensity: 'hard',
            volumeAction: 'maintain',
            reasoning: 'Stable workload.',
            influences: [],
          },
        }),
      }),
    );

    expect(result.summary).toContain('status=completed');
    expect(result.summary).toContain('recommendation=MAINTAIN_TODAY');
    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      analysis: expect.objectContaining({
        trainingStatus: 'completed',
        readinessLevel: 'HIGH',
        goalAlignment: 'strength',
      }),
    });
    expect(result.contributions[1]).toMatchObject({
      type: 'CONTRIBUTION',
      summary: "Maintain today's session.",
    });
  });

  it('marks a missed session as high risk and recommends recovery first', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          todayWorkout: buildTodayWorkout(),
          recentWorkoutLogs: [],
          adherenceScore: 24,
          currentStreak: 0,
          recoverySnapshot: {
            readinessScore: 18,
            fatigueScore: 94,
            recoveryTrend: 'declining',
            recommendedIntensity: 'recovery',
            influences: [],
          },
          adaptiveTrainingRecommendation: {
            recommendationType: 'rest_day',
            recommendedIntensity: 'recovery',
            volumeAction: 'decrease',
            reasoning: 'Recovery first.',
            influences: [],
          },
        }),
      }),
    );

    expect(result.metadata).toMatchObject({
      analysis: expect.objectContaining({
        trainingStatus: 'skipped',
      }),
      priority: 'CRITICAL',
      confidence: 'MEDIUM',
    });
    expect(result.contributions[1].summary).toBe('Complete recovery first.');
    expect(result.metadata.analysis.riskAssessment.level).toBe('CRITICAL');
  });

  it('returns a no-workout recommendation when nothing is scheduled', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          todayWorkout: null,
          recentWorkoutLogs: [],
          recoverySnapshot: {
            readinessScore: 81,
            fatigueScore: 16,
            recoveryTrend: 'stable',
            recommendedIntensity: 'moderate',
            influences: [],
          },
        }),
      }),
    );

    expect(result.metadata.analysis.trainingStatus).toBe('unavailable');
    expect(result.contributions[1]).toMatchObject({
      summary: 'No workout scheduled today.',
    });
    expect(result.metadata.analysis.riskAssessment.level).toBe('LOW');
  });

  it('recommends recovery first when readiness is low', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          todayWorkout: buildTodayWorkout(),
          recentWorkoutLogs: [],
          recoverySnapshot: {
            readinessScore: 18,
            fatigueScore: 91,
            recoveryTrend: 'declining',
            recommendedIntensity: 'recovery',
            influences: [],
          },
        }),
      }),
    );

    expect(result.metadata.analysis.readinessLevel).toBe('LOW');
    expect(result.metadata.analysis.riskAssessment.level).toBe('CRITICAL');
    expect(result.contributions[1].summary).toBe('Complete recovery first.');
  });

  it('uses the trusted adaptive recommendation when high readiness supports increased work', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          todayWorkout: buildTodayWorkout({
            focus: 'strength',
            title: 'Upper body strength',
          }),
          recentWorkoutLogs: [
            buildWorkoutLog({
              workoutDayIndex: 2,
              completedExercises: [
                { name: 'Squat', setsDone: 4, repsDone: 5 },
                { name: 'Bench Press', setsDone: 4, repsDone: 5 },
              ],
            }),
          ],
          recoverySnapshot: {
            readinessScore: 93,
            fatigueScore: 8,
            recoveryTrend: 'improving',
            recommendedIntensity: 'hard',
            influences: [],
          },
          adaptiveTrainingRecommendation: {
            recommendationType: 'increase_intensity',
            recommendedIntensity: 'hard',
            volumeAction: 'increase',
            reasoning: 'Readiness is high.',
            influences: [],
          },
        }),
      }),
    );

    expect(result.metadata.analysis.adaptiveRecommendation).toMatchObject({
      recommendationType: 'increase_intensity',
      recommendedIntensity: 'hard',
    });
    expect(result.contributions[1]).toMatchObject({
      summary: 'Increase training intensity.',
    });
    expect(result.metadata.analysis.goalAlignment).toBe('strength');
    expect(result.metadata.analysis.priority).toBe('LOW');
  });

  it('classifies goal alignment from the trusted goal state', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          goal: 'lose_weight',
          todayWorkout: buildTodayWorkout({
            title: 'Conditioning circuit',
            focus: 'conditioning',
            format: 'cardio',
          }),
          recentWorkoutLogs: [],
        }),
      }),
    );

    expect(result.metadata.analysis.goalAlignment).toBe('endurance');
    expect(result.summary).toContain('goal=endurance');
  });

  it('downgrades confidence when the trusted backend state is sparse', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          todayWorkout: buildTodayWorkout(),
          recentWorkoutLogs: [],
          limitations: [],
          goal: undefined,
          recoverySnapshot: undefined,
          adaptiveTrainingRecommendation: undefined,
          adaptiveRecommendationType: undefined,
          adaptiveRecommendedIntensity: undefined,
          adaptiveVolumeAction: undefined,
          adaptiveTrainingInfluences: undefined,
          adaptiveTrainingReasoning: undefined,
          readinessScore: undefined,
          fatigueScore: undefined,
          recoveryInfluences: undefined,
          recoveryTrend: undefined,
          recommendedIntensity: undefined,
          latestCheckIn: undefined,
          nutritionProfile: undefined,
          activeTrainingPlanId: undefined,
          weeklyFrequency: undefined,
          adherenceScore: 0,
          currentStreak: 0,
          averageWorkoutDuration: 0,
          fatigueLevel: 'HIGH',
        } as any),
      }),
    );

    expect(result.metadata.confidence).toBe('LOW');
  });

  it('respects blocked policy evaluations', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        policyEvaluation: {
          decision: {
            approved: false,
            blocked: true,
            fallbackRequired: true,
            allowedTools: [],
            allowedExperts: [],
            allowedDomains: [],
            allowedLLM: false,
            metadata: {
              stage: 'EXECUTION',
              evaluatedPolicyIds: [],
              rejectedPolicyIds: [],
              violationCount: 1,
              fallbackDecisionCount: 1,
              blockedDomainIds: [],
              blockedToolIds: [],
              blockedExpertIds: [],
              blockedLlmUsage: true,
              allowedDomainCount: 0,
              allowedToolCount: 0,
              allowedExpertCount: 0,
              candidateExpertCount: 0,
              selectedExpertCount: 0,
              estimatedCost: 0,
              estimatedLatencyMs: 0,
              maximumExecutionDepth: 0,
              maxSteps: 0,
              maxToolCalls: 0,
              evaluationDurationMs: 0,
            },
          },
          violations: [],
          reason: 'Policy blocked the request.',
          actions: [],
        },
      }),
    );

    expect(result.metadata).toMatchObject({
      confidence: 'LOW',
      priority: 'CRITICAL',
      analysis: expect.objectContaining({
        trainingStatus: 'unavailable',
      }),
    });
    expect(result.contributions).toHaveLength(2);
  });

  it('loads runtime metadata for composition-aware selection', () => {
    const loadedContext = expert.loadContext(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          todayWorkout: buildTodayWorkout(),
          recoverySnapshot: {
            readinessScore: 84,
            fatigueScore: 15,
            recoveryTrend: 'stable',
            recommendedIntensity: 'hard',
            influences: [],
          },
        }),
      }),
    );

    expect(loadedContext.runtimeMetadata).toEqual(
      expect.objectContaining({
        workoutExpert: expect.objectContaining({
          expertId: 'WorkoutExpert',
          recommendationCodes: expect.arrayContaining(['MAINTAIN_TODAY']),
        }),
      }),
    );
  });
});

function buildRequest(): CoachExpertRequest {
  const registry = new CoachExpertRegistry();
  const candidateExperts = registry
    .getExpertsForIntent('TRAINING')
    .map((expert) => expert.metadata);
  const selectedExperts = registry
    .getExpertsForDomains(['training', 'recovery', 'goals', 'progress'])
    .map((expert) => expert.metadata);

  return {
    userId: 'user-123',
    conversationId: 'conversation-123',
    userMessage: 'Should I train today?',
    sessionMetadata: {
      requestId: 'request-123',
      authUserId: 'auth-user-123',
      userProfileId: 'profile-123',
      conversationId: 'conversation-123',
      userIdHash: 'user-hash-123',
    },
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: false,
    experimentMetadata: buildExperimentMetadata(),
    intent: 'TRAINING',
    selectedDomains: ['training', 'recovery', 'goals', 'progress'],
    candidateExperts,
    selectedExperts,
  };
}

function buildContext(
  overrides: Partial<CoachExpertContext> = {},
): CoachExpertContext {
  return {
    request: buildRequest(),
    policyEvaluation: overrides.policyEvaluation,
    healthContext: overrides.healthContext,
    selectionReason:
      overrides.selectionReason ??
      'intent=TRAINING; domains=training,recovery,goals,progress',
    runtimeMetadata: overrides.runtimeMetadata ?? {},
  };
}

function buildHealthContext(
  overrides: Partial<NonNullable<CoachExpertContext['healthContext']>> = {},
): NonNullable<CoachExpertContext['healthContext']> {
  return {
    authUserId: 'auth-user-123',
    userProfileId: 'profile-123',
    goal: 'gain_muscle',
    activityLevel: 'high',
    weeklyFrequency: 4,
    adherenceScore: 82,
    currentStreak: 3,
    averageWorkoutDuration: 54,
    fatigueLevel: 'LOW',
    availableEquipment: ['barbell', 'dumbbells'],
    limitations: [],
    todayWorkout: buildTodayWorkout(),
    activeTrainingPlanId: 'training-plan-123',
    latestCheckIn: {
      energyLevel: 4,
      sleepQuality: 4,
      muscleSoreness: 2,
      motivationLevel: 5,
      createdAt: new Date('2026-05-04T09:00:00.000Z'),
    },
    recoverySnapshot: {
      date: '2026-05-04',
      readinessScore: 74,
      fatigueScore: 28,
      recoveryTrend: 'stable',
      recommendedIntensity: 'moderate',
      influences: [],
      formulaVersion: 'v1',
      createdAt: new Date('2026-05-04T09:00:00.000Z'),
    },
    adaptiveTrainingRecommendation: {
      recommendationType: 'maintain',
      recommendedIntensity: 'moderate',
      volumeAction: 'maintain',
      reasoning: 'Default recommendation.',
      influences: [],
    },
    adaptiveRecommendationType: 'maintain',
    adaptiveRecommendedIntensity: 'moderate',
    adaptiveVolumeAction: 'maintain',
    adaptiveTrainingInfluences: [],
    adaptiveTrainingReasoning: 'Default recommendation.',
    readinessScore: 74,
    fatigueScore: 28,
    recoveryInfluences: [],
    recoveryTrend: 'stable',
    recommendedIntensity: 'moderate',
    nutritionProfile: {
      goal: 'muscle_gain',
      mealsPerDay: 4,
      dietaryRestrictions: [],
      allergies: [],
      dislikedFoods: [],
      preferredFoods: [],
    },
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-05-04T10:00:00.000Z'),
    ...overrides,
  };
}

function buildTodayWorkout(
  overrides: Partial<
    NonNullable<
      NonNullable<CoachExpertContext['healthContext']>['todayWorkout']
    >
  > = {},
) {
  return {
    dayIndex: 2,
    title: 'Upper body strength',
    focus: 'strength',
    format: 'free_weights',
    intensity: 'hard',
    exercises: [
      {
        name: 'Squat',
        sets: 4,
        reps: 5,
      },
      {
        name: 'Bench Press',
        sets: 4,
        reps: 5,
      },
    ],
    ...overrides,
  };
}

function buildWorkoutLog(
  overrides: Partial<{
    workoutDayIndex: number;
    completedExercises: { name: string; setsDone: number; repsDone: number }[];
    durationMinutes: number;
    date: string;
  }> = {},
) {
  return {
    id: 'workout-log-123',
    trainingPlanId: 'training-plan-123',
    workoutDayIndex: overrides.workoutDayIndex ?? 2,
    durationMinutes: overrides.durationMinutes ?? 48,
    completedExercises: overrides.completedExercises ?? [
      { name: 'Squat', setsDone: 4, repsDone: 5 },
      { name: 'Bench Press', setsDone: 4, repsDone: 5 },
    ],
    date: overrides.date ?? '2026-05-04',
    createdAt: new Date('2026-05-04T10:15:00.000Z'),
    updatedAt: new Date('2026-05-04T10:15:00.000Z'),
  };
}

function buildExperimentMetadata() {
  return {
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
  } as const;
}
