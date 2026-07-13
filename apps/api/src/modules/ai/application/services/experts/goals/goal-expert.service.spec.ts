import { CoachExpertRegistry } from '../coach-expert.registry';
import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import { GoalExpert } from './goal-expert.service';
import type { UserHealthContext } from '../../context-builder/build-user-health-context.service';

describe('GoalExpert', () => {
  const expert = new GoalExpert();

  it('analyzes a completed goal as low risk and keeps the current strategy', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext(),
      goalContext: buildGoalContext({
        currentGoal: buildGoal({
          status: 'achieved',
        }),
        progressSnapshot: buildProgressSnapshot(100, 'stable', '2026-07-07'),
        forecast: buildForecast('high', 0, '2026-07-07T00:00:00.000Z'),
        goalHistory: [buildProgressSnapshot(92, 'improving', '2026-07-05')],
        milestones: [
          buildMilestone('Foundation', 25, true, '2026-06-01'),
          buildMilestone('Volume', 50, true, '2026-06-15'),
          buildMilestone('Peaking', 75, true, '2026-07-01'),
        ],
        achievementHistory: [buildAchievement(100, '2026-07-07')],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'completed',
        nutritionStatus: 'ON_TRACK',
        recoveryStatus: 'GOOD',
      }),
    });

    const loadedContext = expert.loadContext(request, context);
    const result = expert.analyze(request, loadedContext);

    expect(loadedContext.runtimeMetadata.goalExpert).toMatchObject({
      goalStatus: 'COMPLETED',
      progressCompletionPercentage: 100,
      progressTrend: 'STABLE',
      forecastStatus: 'LIKELY',
      consistency: 'HIGH',
      confidence: 'HIGH',
    });
    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      analysis: expect.objectContaining({
        goalStatus: 'COMPLETED',
        progressAssessment: expect.objectContaining({
          completionPercentage: 100,
        }),
        consistency: expect.objectContaining({
          overallConsistency: 'HIGH',
        }),
      }),
    });
    expect(result.summary).toContain('status=COMPLETED');
    expect(result.contributions[1].summary).toBe('Maintain current strategy.');
  });

  it('classifies on-track progress with strong cross-domain consistency', () => {
    const request = buildRequest({
      intent: 'TRAINING',
      selectedDomains: ['goals', 'training', 'nutrition', 'recovery'],
    });
    const context = buildContext({
      healthContext: buildHealthContext({
        generatedAt: new Date('2026-07-07T00:00:00.000Z'),
      }),
      goalContext: buildGoalContext({
        currentGoal: buildGoal({
          status: 'active',
          targetDate: new Date('2026-08-01T00:00:00.000Z'),
        }),
        progressSnapshot: buildProgressSnapshot(78, 'improving', '2026-07-07'),
        forecast: buildForecast('high', 18, '2026-08-01T00:00:00.000Z'),
        goalHistory: [
          buildProgressSnapshot(68, 'improving', '2026-07-05'),
          buildProgressSnapshot(74, 'improving', '2026-07-06'),
        ],
        milestones: [
          buildMilestone('Foundation', 25, true, '2026-06-01'),
          buildMilestone('Volume', 50, true, '2026-06-15'),
          buildMilestone('Peaking', 75, false),
        ],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'completed',
        nutritionStatus: 'ON_TRACK',
        recoveryStatus: 'OPTIMAL',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.goalStatus).toBe('ON_TRACK');
    expect(result.metadata.analysis.consistency).toMatchObject({
      workoutConsistency: 'HIGH',
      nutritionConsistency: 'HIGH',
      recoveryConsistency: 'HIGH',
      overallConsistency: 'HIGH',
    });
    expect(result.metadata.analysis.forecast.status).toBe('LIKELY');
    expect(result.contributions[1].summary).toBe(
      'Stay consistent with the current plan.',
    );
  });

  it('marks a behind goal when progress is slowing and consistency is only partial', () => {
    const request = buildRequest({
      selectedDomains: [
        'goals',
        'training',
        'nutrition',
        'recovery',
        'progress',
      ],
    });
    const context = buildContext({
      goalContext: buildGoalContext({
        currentGoal: buildGoal({
          status: 'active',
          targetDate: new Date('2026-08-15T00:00:00.000Z'),
        }),
        progressSnapshot: buildProgressSnapshot(48, 'stable', '2026-07-07'),
        forecast: buildForecast('medium', 29, '2026-08-15T00:00:00.000Z'),
        goalHistory: [
          buildProgressSnapshot(46, 'stable', '2026-07-05'),
          buildProgressSnapshot(47, 'stable', '2026-07-06'),
        ],
        milestones: [
          buildMilestone('Base', 25, true, '2026-06-01'),
          buildMilestone('Build', 50, false),
          buildMilestone('Peak', 75, false),
        ],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'partially_completed',
        nutritionStatus: 'PARTIAL',
        recoveryStatus: 'MODERATE',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.goalStatus).toBe('BEHIND');
    expect(result.metadata.analysis.forecast.status).toBe('UNCERTAIN');
    expect(
      result.metadata.analysis.milestoneAssessment.remainingMilestones,
    ).toHaveLength(2);
    expect(
      result.metadata.analysis.milestoneAssessment.blockedMilestones,
    ).toHaveLength(0);
    expect(
      result.metadata.analysis.recommendations.map((entry) => entry.code),
    ).toContain('INCREASE_WEEKLY_CONSISTENCY');
  });

  it('marks an at-risk goal when progress is declining and milestones are blocked', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        generatedAt: new Date('2026-07-07T00:00:00.000Z'),
      }),
      goalContext: buildGoalContext({
        currentGoal: buildGoal({
          status: 'active',
          targetDate: new Date('2026-07-20T00:00:00.000Z'),
        }),
        progressSnapshot: buildProgressSnapshot(18, 'declining', '2026-07-07'),
        forecast: buildForecast('low', 42, '2026-07-20T00:00:00.000Z'),
        goalHistory: [
          buildProgressSnapshot(32, 'declining', '2026-07-04'),
          buildProgressSnapshot(24, 'declining', '2026-07-05'),
        ],
        milestones: [
          buildMilestone('Base', 25, false),
          buildMilestone('Build', 50, false),
          buildMilestone('Peak', 75, false),
        ],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'MISSED',
        recoveryStatus: 'CRITICAL',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.goalStatus).toBe('AT_RISK');
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
    expect(
      result.metadata.analysis.milestoneAssessment.blockedMilestones,
    ).toHaveLength(3);
    expect(result.metadata.analysis.forecast.status).toBe('UNLIKELY');
    expect(result.contributions[1].summary).toBe('Reduce inactivity periods.');
  });

  it('returns low confidence when the goal signal is sparse', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        goalContext: buildGoalContext({
          currentGoal: buildGoal({
            status: 'active',
          }),
        }),
        runtimeMetadata: {},
      }),
    );

    expect(result.metadata.confidence).toBe('LOW');
    expect(result.metadata.analysis.goalStatus).toBe('UNKNOWN');
  });

  it('loads runtime metadata for composition-aware selection', () => {
    const loaded = expert.loadContext(
      buildRequest(),
      buildContext({
        goalContext: buildGoalContext({
          currentGoal: buildGoal({
            status: 'active',
          }),
          progressSnapshot: buildProgressSnapshot(
            66,
            'improving',
            '2026-07-07',
          ),
          forecast: buildForecast('medium', 20, '2026-07-20T00:00:00.000Z'),
        }),
        runtimeMetadata: buildRuntimeMetadata({
          workoutStatus: 'completed',
          nutritionStatus: 'ON_TRACK',
          recoveryStatus: 'GOOD',
        }),
      }),
    );

    expect(loaded.runtimeMetadata.goalExpert).toMatchObject({
      expertId: 'GoalExpert',
      goalStatus: 'ON_TRACK',
      recommendationCodes: expect.arrayContaining([
        'STAY_CONSISTENT_WITH_CURRENT_PLAN',
      ]),
    });
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
              blockedDomainIds: ['goals'],
              blockedToolIds: [],
              blockedExpertIds: ['GoalExpert'],
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
          reason: 'Blocked by policy.',
          actions: [],
        },
      }),
    );

    expect(result.metadata.analysis.goalStatus).toBe('UNKNOWN');
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
    expect(result.contributions[1].summary).toBe('Maintain current strategy.');
  });
});

function buildRequest(
  overrides: Partial<CoachExpertRequest> = {},
): CoachExpertRequest {
  const registry = new CoachExpertRegistry();
  const candidateExperts = registry
    .getExpertsForIntent(overrides.intent ?? 'GOALS')
    .map((expert) => expert.metadata);
  const selectedDomains = overrides.selectedDomains ?? [
    'goals',
    'training',
    'nutrition',
    'recovery',
    'progress',
  ];
  const selectedExperts = registry
    .getExpertsForDomains(selectedDomains)
    .map((expert) => expert.metadata);

  return {
    userId: 'user-123',
    conversationId: 'conversation-123',
    userMessage: 'Am I making progress?',
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
    intent: overrides.intent ?? 'GOALS',
    selectedDomains,
    candidateExperts,
    selectedExperts,
  };
}

function buildContext(
  overrides: Partial<CoachExpertContext> = {},
): CoachExpertContext {
  return {
    request: overrides.request ?? buildRequest(),
    healthContext: overrides.healthContext ?? buildHealthContext(),
    goalContext: overrides.goalContext ?? buildGoalContext(),
    selectionReason:
      overrides.selectionReason ??
      'intent=GOALS; domains=goals,training,nutrition,recovery,progress; experts=GoalExpert',
    runtimeMetadata: overrides.runtimeMetadata ?? {},
    ...(overrides.policyEvaluation
      ? { policyEvaluation: overrides.policyEvaluation }
      : {}),
    ...(overrides.recoveryHistory
      ? { recoveryHistory: overrides.recoveryHistory }
      : {}),
    ...(overrides.nutritionPlan
      ? { nutritionPlan: overrides.nutritionPlan }
      : {}),
    ...(overrides.todayNutrition
      ? { todayNutrition: overrides.todayNutrition }
      : {}),
    ...(overrides.nutritionLogs
      ? { nutritionLogs: overrides.nutritionLogs }
      : {}),
  };
}

function buildHealthContext(
  overrides: Partial<UserHealthContext> = {},
): UserHealthContext {
  return {
    authUserId: 'auth-user-123',
    userProfileId: 'profile-123',
    adherenceScore: 78,
    currentStreak: 5,
    averageWorkoutDuration: 52,
    fatigueLevel: 'LOW',
    availableEquipment: ['barbell', 'dumbbells'],
    limitations: [],
    todayWorkout: null,
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-07-07T00:00:00.000Z'),
    ...overrides,
  };
}

function buildGoalContext(
  overrides: Partial<NonNullable<CoachExpertContext['goalContext']>> = {},
) {
  return {
    currentGoal: overrides.currentGoal,
    progressSnapshot: overrides.progressSnapshot,
    forecast: overrides.forecast,
    goalHistory: overrides.goalHistory,
    milestones: overrides.milestones,
    achievementHistory: overrides.achievementHistory,
  };
}

function buildGoal(
  overrides: Partial<
    NonNullable<NonNullable<CoachExpertContext['goalContext']>['currentGoal']>
  > = {},
) {
  return {
    id: 'goal_123',
    userProfileId: 'profile_123',
    type: 'gain_muscle',
    status: { value: 'active' },
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    targetDate: new Date('2026-08-01T00:00:00.000Z'),
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-07T00:00:00.000Z'),
    ...overrides,
  } as never;
}

function buildProgressSnapshot(
  progressPercentage: number,
  trend: 'improving' | 'stable' | 'declining',
  date: string,
) {
  return {
    goalId: 'goal_123',
    userProfileId: 'profile_123',
    date,
    progressPercentage,
    currentValue: 72,
    targetValue: 80,
    trend: { value: trend },
    sourceContext: {
      goalType: 'gain_muscle',
      formulaVersion: 'goal-deterministic-v1',
    },
    formulaVersion: 'goal-deterministic-v1',
  } as never;
}

function buildForecast(
  confidence: 'low' | 'medium' | 'high',
  estimatedDaysRemaining: number,
  predictedCompletionDate?: string,
) {
  return {
    goalId: 'goal_123',
    userProfileId: 'profile_123',
    confidence: { value: confidence },
    estimatedDaysRemaining,
    predictedCompletionDate: predictedCompletionDate
      ? new Date(predictedCompletionDate)
      : undefined,
    generatedAt: new Date('2026-07-07T00:00:00.000Z'),
    formulaVersion: 'goal-deterministic-v1',
  } as never;
}

function buildMilestone(
  title: string,
  targetValue: number,
  achieved: boolean,
  achievedAt?: string,
) {
  return {
    goalId: 'goal_123',
    type: { value: 'custom' },
    title,
    targetValue,
    achieved,
    achievedAt: achievedAt ? new Date(achievedAt) : undefined,
  } as never;
}

function buildAchievement(completionPercentage: number, achievedAt: string) {
  return {
    goalId: 'goal_123',
    achievedAt: new Date(achievedAt),
    completionPercentage,
  } as never;
}

function buildRuntimeMetadata(overrides: {
  workoutStatus:
    | 'completed'
    | 'partially_completed'
    | 'scheduled'
    | 'skipped'
    | 'unavailable';
  nutritionStatus:
    | 'ON_TRACK'
    | 'PARTIAL'
    | 'MISSED'
    | 'NO_PLAN'
    | 'NO_PROFILE'
    | 'UNKNOWN';
  recoveryStatus:
    | 'OPTIMAL'
    | 'GOOD'
    | 'MODERATE'
    | 'POOR'
    | 'CRITICAL'
    | 'UNKNOWN';
}) {
  return {
    workoutExpert: {
      expertId: 'WorkoutExpert',
      trainingStatus: overrides.workoutStatus,
      readinessLevel: 'HIGH',
      priority: 'LOW',
      goalAlignment: 'strength',
      confidence: 'HIGH',
      riskLevel: 'LOW',
      recommendationCodes: ['MAINTAIN_TODAY'],
    },
    nutritionExpert: {
      expertId: 'NutritionExpert',
      nutritionStatus: overrides.nutritionStatus,
      priority: 'LOW',
      goalAlignment: 'muscle_gain',
      confidence: 'HIGH',
      riskLevel: 'LOW',
      recommendationCodes: ['MAINTAIN_CURRENT_PLAN'],
    },
    recoveryExpert: {
      expertId: 'RecoveryExpert',
      recoveryStatus: overrides.recoveryStatus,
      readinessLevel: 'HIGH',
      trend: 'IMPROVING',
      trainingImpact: 'FULL_SESSION',
      confidence: 'HIGH',
      riskLevel: 'LOW',
      recommendationCodes: ['PROCEED_WITH_TODAYS_SESSION'],
    },
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
  } as never;
}
