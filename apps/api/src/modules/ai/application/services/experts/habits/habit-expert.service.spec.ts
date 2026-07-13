import { HabitExpert } from './habit-expert.service';
import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';

describe('HabitExpert', () => {
  const expert = new HabitExpert();

  it('analyzes excellent consistency with high confidence', () => {
    const request = buildRequest();
    const context = buildContext({
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-07',
          consistencyScore: 94,
          streakDays: 12,
          adherenceScore: 96,
          trend: 'improving',
        }),
        summary: {
          currentStreak: 12,
          longestStreak: 12,
          trend: 'improving',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-24',
        scores: [88, 89, 90, 91, 92, 93, 94, 95, 95, 95, 96, 96, 96, 96],
        streaks: [6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12],
        adherence: [88, 89, 90, 91, 92, 93, 94, 95, 95, 95, 96, 96, 96, 96],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'completed',
        nutritionStatus: 'ON_TRACK',
        recoveryStatus: 'OPTIMAL',
        goalStatus: 'ON_TRACK',
      }),
    });

    const loadedContext = expert.loadContext(request, context);
    const result = expert.analyze(request, loadedContext);

    expect(loadedContext.runtimeMetadata.habitExpert).toMatchObject({
      habitStatus: 'EXCELLENT',
      consistency: 'HIGH',
      trend: 'IMPROVING',
      riskLevel: 'LOW',
      confidence: 'HIGH',
    });
    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      analysis: expect.objectContaining({
        habitStatus: 'EXCELLENT',
        consistency: expect.objectContaining({
          dailyConsistency: 'HIGH',
          weeklyConsistency: 'HIGH',
          monthlyConsistency: 'HIGH',
          streakQuality: 'HIGH',
        }),
      }),
    });
    expect(result.summary).toContain('status=EXCELLENT');
    expect(result.contributions[1].summary).toBe('Maintain current streak.');
  });

  it('analyzes poor consistency with a declining trend', () => {
    const request = buildRequest();
    const context = buildContext({
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-07',
          consistencyScore: 34,
          streakDays: 1,
          adherenceScore: 30,
          trend: 'declining',
        }),
        summary: {
          currentStreak: 1,
          longestStreak: 7,
          trend: 'declining',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-24',
        scores: [58, 56, 55, 53, 50, 48, 46, 44, 42, 40, 38, 36, 35, 34],
        streaks: [5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1],
        adherence: [58, 56, 55, 53, 50, 48, 46, 44, 42, 40, 38, 36, 35, 34],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'MISSED',
        recoveryStatus: 'POOR',
        goalStatus: 'AT_RISK',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.habitStatus).toBe('POOR');
    expect(result.metadata.analysis.trend.trend).toBe('DECLINING');
    expect(result.metadata.analysis.risks[0].level).toBe('HIGH');
    expect(result.contributions[1].summary).toBe('Improve daily consistency.');
  });

  it('marks a broken streak as critical risk', () => {
    const request = buildRequest();
    const context = buildContext({
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-07',
          consistencyScore: 28,
          streakDays: 0,
          adherenceScore: 22,
          trend: 'stable',
        }),
        summary: {
          currentStreak: 0,
          longestStreak: 9,
          trend: 'stable',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-30',
        scores: [28, 30, 32, 34, 36, 38, 40],
        streaks: [0, 0, 0, 0, 0, 6, 6],
        adherence: [22, 24, 26, 28, 30, 32, 34],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'MISSED',
        recoveryStatus: 'CRITICAL',
        goalStatus: 'AT_RISK',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.habitStatus).toBe('BROKEN');
    expect(result.metadata.analysis.patterns.patterns).toContain(
      'BROKEN_STREAKS',
    );
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
    expect(result.contributions[1].summary).toBe('Reduce inactivity periods.');
  });

  it('detects an improving trend deterministically', () => {
    const request = buildRequest();
    const context = buildContext({
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-07',
          consistencyScore: 84,
          streakDays: 4,
          adherenceScore: 82,
          trend: 'improving',
        }),
        summary: {
          currentStreak: 4,
          longestStreak: 8,
          trend: 'improving',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-24',
        scores: [68, 69, 70, 71, 72, 73, 74, 82, 83, 84, 84, 85, 86, 87],
        streaks: [2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        adherence: [68, 69, 70, 71, 72, 73, 74, 82, 83, 84, 84, 85, 86, 87],
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.trend.trend).toBe('IMPROVING');
    expect(result.metadata.analysis.consistency.weeklyConsistency).toBe('HIGH');
    expect(result.metadata.analysis.habitStatus).toBe('GOOD');
  });

  it('detects a declining trend deterministically', () => {
    const request = buildRequest();
    const context = buildContext({
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-07',
          consistencyScore: 44,
          streakDays: 2,
          adherenceScore: 40,
          trend: 'declining',
        }),
        summary: {
          currentStreak: 2,
          longestStreak: 7,
          trend: 'declining',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-24',
        scores: [76, 74, 73, 72, 71, 70, 69, 58, 56, 54, 52, 50, 48, 44],
        streaks: [6, 6, 5, 5, 4, 4, 4, 3, 3, 2, 2, 2, 2, 2],
        adherence: [76, 74, 73, 72, 71, 70, 69, 58, 56, 54, 52, 50, 48, 44],
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.trend.trend).toBe('DECLINING');
    expect(result.metadata.analysis.habitStatus).toBe('POOR');
    expect(result.metadata.analysis.risks[0].level).toBe('HIGH');
  });

  it('detects long inactivity as critical risk', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        generatedAt: new Date('2026-07-20T00:00:00.000Z'),
      }),
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-01',
          consistencyScore: 38,
          streakDays: 0,
          adherenceScore: 30,
          trend: 'stable',
        }),
        summary: {
          currentStreak: 0,
          longestStreak: 5,
          trend: 'stable',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-24',
        scores: [48, 46, 44, 42, 40, 38, 36],
        streaks: [0, 0, 0, 0, 0, 0, 0],
        adherence: [40, 38, 36, 34, 32, 30, 28],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'MISSED',
        recoveryStatus: 'CRITICAL',
        goalStatus: 'AT_RISK',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.inactivityDays).toBeGreaterThanOrEqual(14);
    expect(result.metadata.analysis.habitStatus).toBe('BROKEN');
    expect(result.contributions[1].summary).toBe('Reduce inactivity periods.');
  });

  it('detects strong weekly adherence even when monthly adherence is weaker', () => {
    const request = buildRequest();
    const context = buildContext({
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-07',
          consistencyScore: 82,
          streakDays: 5,
          adherenceScore: 82,
          trend: 'stable',
        }),
        summary: {
          currentStreak: 5,
          longestStreak: 8,
          trend: 'stable',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-08',
        scores: [
          40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40,
          40, 40, 40, 40, 40, 40, 82, 82, 82, 82, 82, 82, 82,
        ],
        streaks: Array.from({ length: 30 }, () => 5),
        adherence: [
          40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 40,
          40, 40, 40, 40, 40, 40, 82, 82, 82, 82, 82, 82, 82,
        ],
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.consistency.weeklyConsistency).toBe('HIGH');
    expect(result.metadata.analysis.consistency.monthlyConsistency).toBe('LOW');
    expect(result.metadata.analysis.habitStatus).toBe('GOOD');
  });

  it('integrates workout, nutrition, recovery, and goal signals without recalculation', () => {
    const request = buildRequest({
      intent: 'TRAINING',
      selectedDomains: ['training', 'nutrition', 'recovery', 'goals', 'habits'],
    });
    const context = buildContext({
      habit: buildHabit({
        current: buildSnapshot({
          date: '2026-07-07',
          consistencyScore: 66,
          streakDays: 3,
          adherenceScore: 64,
          trend: 'stable',
        }),
        summary: {
          currentStreak: 3,
          longestStreak: 6,
          trend: 'stable',
        },
      }),
      habitHistory: buildHistory({
        startDate: '2026-06-30',
        scores: [66, 65, 64, 63, 62, 61, 60],
        streaks: [3, 3, 3, 3, 3, 3, 3],
        adherence: [66, 65, 64, 63, 62, 61, 60],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'MISSED',
        recoveryStatus: 'POOR',
        goalStatus: 'AT_RISK',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.patterns.patterns).toEqual(
      expect.arrayContaining([
        'REPEATED_SKIPPED_WORKOUTS',
        'IRREGULAR_NUTRITION',
        'IRREGULAR_RECOVERY',
      ]),
    );
    expect(result.metadata.analysis.crossDomain).toMatchObject({
      workoutConsistency: 'LOW',
      nutritionConsistency: 'LOW',
      recoveryConsistency: 'LOW',
      goalConsistency: 'HIGH',
    });
  });

  it('returns low confidence when backend evidence is sparse', () => {
    const result = expert.analyze(
      buildRequest(),
      buildContext({
        habit: buildHabit({
          current: buildSnapshot({
            date: '2026-07-07',
            consistencyScore: 82,
            streakDays: 2,
            adherenceScore: 82,
            trend: 'stable',
          }),
        }),
      }),
    );

    expect(result.metadata.confidence).toBe('LOW');
    expect(result.metadata.analysis.habitStatus).toBe('EXCELLENT');
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
              blockedDomainIds: ['habits'],
              blockedToolIds: [],
              blockedExpertIds: ['HabitExpert'],
              blockedLlmUsage: true,
              allowedDomainCount: 0,
              allowedToolCount: 0,
              allowedExpertCount: 0,
              candidateExpertCount: 0,
              selectedExpertCount: 0,
              estimatedCost: 0,
              estimatedLatencyMs: 0,
              maximumExecutionDepth: 0,
              maxSteps: 6,
              maxToolCalls: 4,
              evaluationDurationMs: 1,
            },
          },
          violations: [],
          reason: 'Blocked.',
          actions: ['fallback'],
        } as never,
      }),
    );

    expect(result.metadata.analysis.habitStatus).toBe('UNKNOWN');
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
  });

  it('loads runtime metadata for composition-aware selection', () => {
    const loaded = expert.loadContext(
      buildRequest(),
      buildContext({
        habit: buildHabit({
          current: buildSnapshot({
            date: '2026-07-07',
            consistencyScore: 86,
            streakDays: 6,
            adherenceScore: 84,
            trend: 'improving',
          }),
          summary: {
            currentStreak: 6,
            longestStreak: 8,
            trend: 'improving',
          },
        }),
        habitHistory: buildHistory({
          startDate: '2026-06-30',
          scores: [78, 79, 80, 81, 82, 83, 84],
          streaks: [4, 4, 5, 5, 6, 6, 6],
          adherence: [78, 79, 80, 81, 82, 83, 84],
        }),
        runtimeMetadata: buildRuntimeMetadata({
          workoutStatus: 'completed',
          nutritionStatus: 'ON_TRACK',
          recoveryStatus: 'OPTIMAL',
          goalStatus: 'ON_TRACK',
        }),
      }),
    );

    expect(loaded.runtimeMetadata.habitExpert).toMatchObject({
      expertId: 'HabitExpert',
      habitStatus: 'GOOD',
      recommendationCodes: expect.arrayContaining(['MAINTAIN_CURRENT_ROUTINE']),
    });
  });
});

function buildRequest(
  overrides: Partial<CoachExpertRequest> = {},
): CoachExpertRequest {
  return {
    userId: 'profile_123',
    conversationId: 'conversation_123',
    userMessage: 'How consistent am I?',
    sessionMetadata: {
      requestId: 'request_123',
      authUserId: 'auth_user_123',
      userProfileId: 'profile_123',
      conversationId: 'conversation_123',
      userIdHash: 'user-hash-123',
    },
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: false,
    experimentMetadata: {
      experimentId: 'coach-chat-experiment',
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
      canaryBucket: 10,
      canaryPercentage: 100,
      streamingEnabled: false,
      structuredOutputsEnabled: true,
      toolCallingEnabled: false,
      futureMemoryEnabled: false,
      rolloutVariant: 'current',
    } as never,
    intent: 'HABITS',
    selectedDomains: ['habits', 'progress'],
    candidateExperts: [],
    selectedExperts: [],
    ...overrides,
  };
}

function buildContext(
  overrides: Partial<CoachExpertContext> = {},
): CoachExpertContext {
  return {
    request: buildRequest(),
    healthContext: buildHealthContext(),
    selectionReason:
      'intent=HABITS; domains=habits,progress; experts=HabitExpert',
    runtimeMetadata: {},
    ...overrides,
  };
}

function buildHealthContext(overrides: Record<string, unknown> = {}) {
  return {
    authUserId: 'auth_user_123',
    userProfileId: 'profile_123',
    adherenceScore: 75,
    currentStreak: 4,
    averageWorkoutDuration: 45,
    fatigueLevel: 'LOW',
    availableEquipment: [],
    limitations: [],
    todayWorkout: null,
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-07-07T00:00:00.000Z'),
    ...overrides,
  };
}

function buildHabit(overrides: Record<string, unknown> = {}) {
  return {
    current: undefined,
    summary: undefined,
    riskSignals: [],
    ...overrides,
  };
}

function buildSnapshot(overrides: Record<string, unknown>) {
  return {
    userProfileId: 'profile_123',
    date: '2026-07-07',
    consistencyScore: 70,
    streakDays: 3,
    adherenceScore: 70,
    trend: 'stable',
    sourceContext: {
      formulaVersion: 'habit-engine-v1',
      generatedAt: '2026-07-07T00:00:00.000Z',
    },
    formulaVersion: 'habit-engine-v1',
    generatedAt: '2026-07-07T00:00:00.000Z',
    ...overrides,
  };
}

function buildHistory(input: {
  startDate: string;
  scores: number[];
  streaks: number[];
  adherence: number[];
}) {
  return input.scores.map((score, index) => {
    const date = shiftDate(input.startDate, index);

    return buildSnapshot({
      date,
      consistencyScore: score,
      streakDays:
        input.streaks[index] ?? input.streaks[input.streaks.length - 1],
      adherenceScore:
        input.adherence[index] ?? input.adherence[input.adherence.length - 1],
      trend: index < input.scores.length / 2 ? 'stable' : 'improving',
      sourceContext: {
        formulaVersion: 'habit-engine-v1',
        generatedAt: `${date}T00:00:00.000Z`,
      },
      generatedAt: `${date}T00:00:00.000Z`,
    });
  });
}

function buildRuntimeMetadata(input: {
  workoutStatus?: string;
  nutritionStatus?: string;
  recoveryStatus?: string;
  goalStatus?: string;
}) {
  return {
    workoutExpert: input.workoutStatus
      ? {
          expertId: 'WorkoutExpert',
          trainingStatus: input.workoutStatus,
          readinessLevel: 'MEDIUM',
          priority: 'MEDIUM',
          goalAlignment: 'strength',
          confidence: 'HIGH',
          riskLevel: 'LOW',
          recommendationCodes: [],
        }
      : undefined,
    nutritionExpert: input.nutritionStatus
      ? {
          expertId: 'NutritionExpert',
          nutritionStatus: input.nutritionStatus,
          priority: 'MEDIUM',
          goalAlignment: 'maintenance',
          recoverySupport: { level: 'UNKNOWN' },
          confidence: 'HIGH',
          riskLevel: 'LOW',
          recommendationCodes: [],
        }
      : undefined,
    recoveryExpert: input.recoveryStatus
      ? {
          expertId: 'RecoveryExpert',
          recoveryStatus: input.recoveryStatus,
          readiness: { level: 'MEDIUM' },
          trend: input.recoveryStatus === 'POOR' ? 'DECLINING' : 'STABLE',
          trainingImpact: 'REDUCED_VOLUME',
          nutritionSupport: { level: 'UNKNOWN' },
          goalAlignment: 'maintenance',
          confidence: 'HIGH',
          priority: 'MEDIUM',
          recommendationCodes: [],
        }
      : undefined,
    goalExpert: input.goalStatus
      ? {
          expertId: 'GoalExpert',
          goalStatus: input.goalStatus,
          progressCompletionPercentage: 60,
          progressTrend: 'STABLE',
          forecastStatus:
            input.goalStatus === 'ON_TRACK' ? 'LIKELY' : 'UNLIKELY',
          consistency: input.goalStatus === 'ON_TRACK' ? 'HIGH' : 'LOW',
          confidence: 'HIGH',
          riskLevel: input.goalStatus === 'ON_TRACK' ? 'LOW' : 'HIGH',
          recommendationCodes: [],
        }
      : undefined,
  } as Record<string, unknown>;
}

function shiftDate(startDate: string, offsetDays: number): string {
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
