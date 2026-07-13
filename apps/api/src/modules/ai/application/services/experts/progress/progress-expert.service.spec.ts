import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import { ProgressExpert } from './progress-expert.service';

describe('ProgressExpert', () => {
  const expert = new ProgressExpert();

  it('analyzes excellent consistency with strong weekly adherence and high confidence', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 5,
        currentStreak: 6,
        recentWorkoutLogs: buildWorkoutLogs([
          ['2026-07-01', 40],
          ['2026-07-02', 45],
          ['2026-07-03', 50],
          ['2026-07-04', 52],
          ['2026-07-05', 55],
          ['2026-07-06', 58],
          ['2026-07-07', 60],
        ]),
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 5,
          totalDurationMinutes: 250,
          averageDurationMinutes: 50,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 6,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 18,
          totalDurationMinutes: 900,
          averageDurationMinutes: 50,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 5,
        }),
        workoutHistory: buildWorkoutLogs([
          ['2026-06-24', 35],
          ['2026-06-25', 38],
          ['2026-06-26', 40],
          ['2026-06-27', 42],
          ['2026-06-28', 45],
          ['2026-06-29', 48],
          ['2026-06-30', 50],
          ['2026-07-01', 52],
          ['2026-07-02', 54],
          ['2026-07-03', 56],
          ['2026-07-04', 58],
          ['2026-07-05', 60],
          ['2026-07-06', 62],
          ['2026-07-07', 64],
        ]),
        dailyCheckInHistory: buildCheckIns([
          [5, 5, 1, 5, '2026-06-30'],
          [5, 5, 1, 5, '2026-07-01'],
          [5, 5, 1, 5, '2026-07-02'],
          [5, 5, 1, 5, '2026-07-03'],
          [5, 5, 1, 5, '2026-07-04'],
          [5, 5, 1, 5, '2026-07-05'],
          [5, 5, 1, 5, '2026-07-06'],
          [5, 5, 1, 5, '2026-07-07'],
        ]),
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'completed',
        nutritionStatus: 'ON_TRACK',
        recoveryStatus: 'OPTIMAL',
        recoveryTrend: 'IMPROVING',
        goalStatus: 'ON_TRACK',
        progressTrend: 'IMPROVING',
        forecastStatus: 'LIKELY',
        habitStatus: 'GOOD',
        habitTrend: 'IMPROVING',
      }),
    });

    const loaded = expert.loadContext(request, context);
    const result = expert.analyze(request, loaded);

    expect(loaded.runtimeMetadata.progressExpert).toMatchObject({
      overallProgress: 'EXCELLENT',
      trend: 'STRONGLY_IMPROVING',
      momentum: 'HIGH',
      plateau: 'NONE',
      regression: 'NONE',
      consistency: 'HIGH',
      riskLevel: 'LOW',
      confidence: 'HIGH',
    });
    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      overallProgress: 'EXCELLENT',
    });
    expect(result.metadata.analysis.consistency).toMatchObject({
      weeklyConsistency: 'HIGH',
      monthlyConsistency: 'HIGH',
      historicalConsistency: 'HIGH',
      overallConsistency: 'HIGH',
    });
    expect(result.metadata.analysis.trend.trend).toBe('STRONGLY_IMPROVING');
    expect(result.contributions[1].summary).toBe(
      'Increase progressive overload.',
    );
  });

  it('analyzes poor consistency with declining momentum', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 6,
        currentStreak: 0,
        recentWorkoutLogs: buildWorkoutLogs([
          ['2026-06-30', 25],
          ['2026-07-01', 24],
          ['2026-07-02', 22],
        ]),
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 1,
          totalDurationMinutes: 25,
          averageDurationMinutes: 25,
          lastWorkoutDate: '2026-07-02',
          currentStreak: 0,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 6,
          totalDurationMinutes: 180,
          averageDurationMinutes: 30,
          lastWorkoutDate: '2026-07-02',
          currentStreak: 2,
        }),
        workoutHistory: buildWorkoutLogs([
          ['2026-06-24', 50],
          ['2026-06-25', 48],
          ['2026-06-26', 46],
          ['2026-06-27', 44],
          ['2026-06-28', 42],
          ['2026-06-29', 40],
          ['2026-06-30', 38],
          ['2026-07-01', 36],
          ['2026-07-02', 34],
          ['2026-07-03', 32],
          ['2026-07-04', 30],
          ['2026-07-05', 28],
          ['2026-07-06', 26],
          ['2026-07-07', 24],
        ]),
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'PARTIAL',
        recoveryStatus: 'MODERATE',
        recoveryTrend: 'STABLE',
        goalStatus: 'SLIGHTLY_BEHIND',
        progressTrend: 'STABLE',
        forecastStatus: 'UNCERTAIN',
        habitStatus: 'INCONSISTENT',
        habitTrend: 'STABLE',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.overallProgress).toBe('DECLINING');
    expect(result.metadata.analysis.trend.trend).toBe('DECLINING');
    expect(result.metadata.analysis.consistency.overallConsistency).toBe('LOW');
    expect(result.metadata.analysis.risks[0].level).toBe('HIGH');
    expect(result.contributions[1].summary).toBe('Reduce inactivity.');
  });

  it('detects a broken streak during prolonged inactivity', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        generatedAt: new Date('2026-07-20T00:00:00.000Z'),
        weeklyFrequency: 4,
        currentStreak: 0,
        recentWorkoutLogs: [],
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          lastWorkoutDate: '2026-06-01',
          currentStreak: 0,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          lastWorkoutDate: '2026-06-01',
          currentStreak: 0,
        }),
        workoutHistory: [],
        dailyCheckInHistory: [],
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.inactivityDays).toBeGreaterThanOrEqual(40);
    expect(result.metadata.analysis.overallProgress).toBe('REGRESSION');
    expect(result.metadata.analysis.regression.regression).toBe('SEVERE');
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
    expect(result.contributions[1].summary).toBe('Reduce inactivity.');
  });

  it('detects an improving trend from week-over-month growth', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 4,
        currentStreak: 3,
        recentWorkoutLogs: buildWorkoutLogs([
          ['2026-07-05', 42],
          ['2026-07-06', 46],
          ['2026-07-07', 50],
        ]),
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 4,
          totalDurationMinutes: 180,
          averageDurationMinutes: 45,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 3,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 10,
          totalDurationMinutes: 360,
          averageDurationMinutes: 36,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 2,
        }),
        workoutHistory: buildWorkoutLogs([
          ['2026-06-24', 28],
          ['2026-06-25', 30],
          ['2026-06-26', 32],
          ['2026-06-27', 34],
          ['2026-06-28', 36],
          ['2026-06-29', 38],
          ['2026-06-30', 40],
          ['2026-07-01', 42],
          ['2026-07-02', 44],
          ['2026-07-03', 46],
          ['2026-07-04', 48],
          ['2026-07-05', 50],
          ['2026-07-06', 52],
          ['2026-07-07', 54],
        ]),
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'completed',
        nutritionStatus: 'ON_TRACK',
        recoveryStatus: 'GOOD',
        recoveryTrend: 'IMPROVING',
        goalStatus: 'ON_TRACK',
        progressTrend: 'IMPROVING',
        forecastStatus: 'LIKELY',
        habitStatus: 'GOOD',
        habitTrend: 'IMPROVING',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.trend.trend).toBe('STRONGLY_IMPROVING');
    expect(result.metadata.analysis.overallProgress).toBe('EXCELLENT');
    expect(result.metadata.analysis.momentum.momentum).toBe('HIGH');
  });

  it('detects a declining trend from week-over-month drop', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 5,
        currentStreak: 1,
        recentWorkoutLogs: buildWorkoutLogs([
          ['2026-07-04', 22],
          ['2026-07-05', 20],
        ]),
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 1,
          totalDurationMinutes: 20,
          averageDurationMinutes: 20,
          lastWorkoutDate: '2026-07-05',
          currentStreak: 1,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 12,
          totalDurationMinutes: 540,
          averageDurationMinutes: 45,
          lastWorkoutDate: '2026-07-05',
          currentStreak: 4,
        }),
        workoutHistory: buildWorkoutLogs([
          ['2026-06-24', 55],
          ['2026-06-25', 54],
          ['2026-06-26', 53],
          ['2026-06-27', 52],
          ['2026-06-28', 51],
          ['2026-06-29', 50],
          ['2026-06-30', 49],
          ['2026-07-01', 40],
          ['2026-07-02', 38],
          ['2026-07-03', 36],
          ['2026-07-04', 34],
          ['2026-07-05', 32],
          ['2026-07-06', 30],
          ['2026-07-07', 28],
        ]),
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'PARTIAL',
        recoveryStatus: 'MODERATE',
        recoveryTrend: 'DECLINING',
        goalStatus: 'SLIGHTLY_BEHIND',
        progressTrend: 'STABLE',
        forecastStatus: 'UNCERTAIN',
        habitStatus: 'INCONSISTENT',
        habitTrend: 'STABLE',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.trend.trend).toBe('DECLINING');
    expect(result.metadata.analysis.momentum.momentum).toBe('NEGATIVE');
    expect(result.metadata.analysis.overallProgress).toBe('DECLINING');
  });

  it('detects a plateau when load and adherence stay flat', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 4,
        currentStreak: 3,
        recentWorkoutLogs: buildWorkoutLogs([
          ['2026-07-05', 45],
          ['2026-07-06', 45],
          ['2026-07-07', 45],
        ]),
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 3,
          totalDurationMinutes: 135,
          averageDurationMinutes: 45,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 3,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 12,
          totalDurationMinutes: 540,
          averageDurationMinutes: 45,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 3,
        }),
        workoutHistory: buildWorkoutLogs([
          ['2026-06-24', 45],
          ['2026-06-25', 45],
          ['2026-06-26', 45],
          ['2026-06-27', 45],
          ['2026-06-28', 45],
          ['2026-06-29', 45],
          ['2026-06-30', 45],
          ['2026-07-01', 45],
          ['2026-07-02', 45],
          ['2026-07-03', 45],
          ['2026-07-04', 45],
          ['2026-07-05', 45],
          ['2026-07-06', 45],
          ['2026-07-07', 45],
        ]),
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'unavailable',
        nutritionStatus: 'PARTIAL',
        recoveryStatus: 'MODERATE',
        recoveryTrend: 'STABLE',
        goalStatus: 'BEHIND',
        progressTrend: 'STABLE',
        forecastStatus: 'UNCERTAIN',
        habitStatus: 'INCONSISTENT',
        habitTrend: 'STABLE',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.plateau.plateau).not.toBe('NONE');
    expect(result.metadata.analysis.overallProgress).toBe('PLATEAU');
    expect(result.metadata.analysis.trend.trend).toBe('STABLE');
  });

  it('identifies weak monthly adherence even when weekly adherence is acceptable', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 6,
        currentStreak: 4,
        recentWorkoutLogs: buildWorkoutLogs([
          ['2026-07-04', 44],
          ['2026-07-05', 46],
          ['2026-07-06', 48],
          ['2026-07-07', 50],
        ]),
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 4,
          totalDurationMinutes: 188,
          averageDurationMinutes: 47,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 4,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 7,
          totalDurationMinutes: 280,
          averageDurationMinutes: 40,
          lastWorkoutDate: '2026-07-07',
          currentStreak: 4,
        }),
        workoutHistory: buildWorkoutLogs([
          ['2026-06-24', 40],
          ['2026-06-25', 41],
          ['2026-06-26', 42],
          ['2026-06-27', 43],
          ['2026-06-28', 44],
          ['2026-06-29', 45],
          ['2026-06-30', 46],
          ['2026-07-01', 47],
          ['2026-07-02', 48],
          ['2026-07-03', 49],
          ['2026-07-04', 50],
          ['2026-07-05', 51],
          ['2026-07-06', 52],
          ['2026-07-07', 53],
        ]),
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'completed',
        nutritionStatus: 'ON_TRACK',
        recoveryStatus: 'GOOD',
        recoveryTrend: 'STABLE',
        goalStatus: 'ON_TRACK',
        progressTrend: 'STABLE',
        forecastStatus: 'LIKELY',
        habitStatus: 'GOOD',
        habitTrend: 'STABLE',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.consistency.weeklyConsistency).toBe(
      'MEDIUM',
    );
    expect(result.metadata.analysis.consistency.monthlyConsistency).toBe('LOW');
    expect(result.metadata.analysis.consistency.overallConsistency).toBe(
      'MEDIUM',
    );
  });

  it('uses workout, nutrition, recovery, goal, and habit signals in the cross-domain analysis', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 4,
        currentStreak: 2,
        recentWorkoutLogs: buildWorkoutLogs([
          ['2026-07-05', 45],
          ['2026-07-06', 46],
        ]),
      }),
      progress: buildProgressContext({
        weeklySummary: buildSummary({
          period: 'week',
          workoutsCompleted: 2,
          totalDurationMinutes: 91,
          averageDurationMinutes: 45.5,
          lastWorkoutDate: '2026-07-06',
          currentStreak: 2,
        }),
        monthlySummary: buildSummary({
          period: 'month',
          workoutsCompleted: 8,
          totalDurationMinutes: 360,
          averageDurationMinutes: 45,
          lastWorkoutDate: '2026-07-06',
          currentStreak: 2,
        }),
        workoutHistory: buildWorkoutLogs([
          ['2026-06-24', 48],
          ['2026-06-25', 47],
          ['2026-06-26', 46],
          ['2026-06-27', 45],
          ['2026-06-28', 44],
          ['2026-06-29', 43],
          ['2026-06-30', 42],
          ['2026-07-01', 41],
          ['2026-07-02', 40],
          ['2026-07-03', 39],
          ['2026-07-04', 38],
          ['2026-07-05', 37],
          ['2026-07-06', 36],
        ]),
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutStatus: 'skipped',
        nutritionStatus: 'MISSED',
        recoveryStatus: 'CRITICAL',
        recoveryTrend: 'DECLINING',
        goalStatus: 'AT_RISK',
        progressTrend: 'DECLINING',
        forecastStatus: 'UNLIKELY',
        habitStatus: 'BROKEN',
        habitTrend: 'DECLINING',
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.risks[0].factors).toContain(
      'multiple_negative_cross_domain_signals',
    );
    expect(
      result.metadata.analysis.recommendations.map((item) => item.code),
    ).toContain('REBUILD_BASELINE_ROUTINE');
  });

  it('keeps confidence low when trusted progress evidence is sparse', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        weeklyFrequency: 4,
        currentStreak: 1,
        recentWorkoutLogs: buildWorkoutLogs([['2026-07-07', 45]]),
      }),
      progress: undefined,
      runtimeMetadata: {},
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.confidence).toBe('LOW');
    expect(result.metadata.analysis.sourceCoverage.progressSummaryPresent).toBe(
      false,
    );
    expect(result.metadata.analysis.overallProgress).toBe('GOOD');
  });

  it('respects policy blocking and returns a deterministic fallback analysis', () => {
    const request = buildRequest();
    const context = buildContext({
      policyEvaluation: {
        decision: {
          blocked: true,
          approved: false,
          fallbackRequired: true,
          allowedDomains: [],
          metadata: {
            blockedDomainIds: ['progress'],
          },
        },
      } as never,
    });

    const loaded = expert.loadContext(request, context);
    const result = expert.analyze(request, loaded);

    expect(result.metadata.analysis.overallProgress).toBe('UNKNOWN');
    expect(result.metadata.analysis.risks[0].level).toBe('CRITICAL');
    expect(result.contributions[1].summary).toBe(
      'Focus on long-term consistency.',
    );
  });
});

function buildRequest(): CoachExpertRequest {
  return {
    userId: 'user_123',
    conversationId: 'conversation_123',
    userMessage: 'How is my progress?',
    sessionMetadata: {
      requestId: 'request_123',
      authUserId: 'auth_123',
      userProfileId: 'profile_123',
      conversationId: 'conversation_123',
      userIdHash: 'user-hash-123',
    },
    promptVersion: 'coach-chat-prompt-v1',
    streamingPreference: false,
    selectedDomains: [
      'progress',
      'training',
      'nutrition',
      'recovery',
      'goals',
      'habits',
    ],
    candidateExperts: [],
    selectedExperts: [],
    experimentMetadata: {
      experimentId: 'exp_123',
      promptId: 'coach-chat',
      currentPromptVersion: 'v1',
      previousPromptVersion: 'v0',
      selectedPromptVersion: 'v1',
      currentProvider: 'openai',
      previousProvider: 'openai',
      selectedProvider: 'openai',
      currentModel: 'gpt-4.1-mini',
      previousModel: 'gpt-4.1-mini',
      selectedModel: 'gpt-4.1-mini',
      canaryBucket: 0,
      canaryPercentage: 0,
      streamingEnabled: false,
      structuredOutputsEnabled: true,
      toolCallingEnabled: false,
      futureMemoryEnabled: false,
      rolloutVariant: 'current',
    },
  } as CoachExpertRequest;
}

function buildContext(
  overrides: Partial<CoachExpertContext> = {},
): CoachExpertContext {
  return {
    request: buildRequest(),
    selectionReason: 'progress domain selected',
    runtimeMetadata: {},
    healthContext: buildHealthContext(),
    progress: buildProgressContext(),
    ...overrides,
  };
}

function buildHealthContext(
  overrides: Partial<NonNullable<CoachExpertContext['healthContext']>> = {},
): NonNullable<CoachExpertContext['healthContext']> {
  return {
    authUserId: 'auth_123',
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
    recentWorkoutLogs: [],
    generatedAt: new Date('2026-07-07T00:00:00.000Z'),
    ...overrides,
  } as NonNullable<CoachExpertContext['healthContext']>;
}

function buildProgressContext(
  overrides: Partial<NonNullable<CoachExpertContext['progress']>> = {},
): NonNullable<CoachExpertContext['progress']> {
  return {
    weeklySummary: buildSummary({
      period: 'week',
      workoutsCompleted: 3,
      totalDurationMinutes: 135,
      averageDurationMinutes: 45,
      lastWorkoutDate: '2026-07-07',
      currentStreak: 3,
    }),
    monthlySummary: buildSummary({
      period: 'month',
      workoutsCompleted: 10,
      totalDurationMinutes: 450,
      averageDurationMinutes: 45,
      lastWorkoutDate: '2026-07-07',
      currentStreak: 3,
    }),
    workoutHistory: buildWorkoutLogs([
      ['2026-06-30', 45],
      ['2026-07-01', 45],
      ['2026-07-02', 45],
      ['2026-07-03', 45],
      ['2026-07-04', 45],
      ['2026-07-05', 45],
      ['2026-07-06', 45],
      ['2026-07-07', 45],
    ]),
    dailyCheckInHistory: buildCheckIns([
      [4, 4, 2, 4, '2026-07-01'],
      [4, 4, 2, 4, '2026-07-02'],
      [4, 4, 2, 4, '2026-07-03'],
      [4, 4, 2, 4, '2026-07-04'],
      [4, 4, 2, 4, '2026-07-05'],
      [4, 4, 2, 4, '2026-07-06'],
      [4, 4, 2, 4, '2026-07-07'],
      [4, 4, 2, 4, '2026-07-08'],
    ]),
    ...overrides,
  } as NonNullable<CoachExpertContext['progress']>;
}

function buildSummary(input: {
  period: 'week' | 'month';
  workoutsCompleted: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  lastWorkoutDate: string | null;
  currentStreak: number;
}) {
  return input;
}

function buildWorkoutLogs(
  entries: readonly [string, number][],
): NonNullable<CoachExpertContext['progress']>['workoutHistory'] {
  return entries.map(([date, durationMinutes], index) => ({
    id: `workout_${index}`,
    trainingPlanId: 'training_123',
    workoutDayIndex: index + 1,
    durationMinutes,
    completedExercises: [],
    feedback: undefined,
    date,
    createdAt: `${date}T08:00:00.000Z`,
  }));
}

function buildCheckIns(
  entries: readonly [number, number, number, number, string][],
): NonNullable<CoachExpertContext['progress']>['dailyCheckInHistory'] {
  return entries.map(
    (
      [energyLevel, sleepQuality, muscleSoreness, motivationLevel, createdAt],
      index,
    ) => ({
      id: `checkin_${index}`,
      energyLevel,
      sleepQuality,
      muscleSoreness,
      motivationLevel,
      createdAt,
    }),
  );
}

function buildRuntimeMetadata(input: {
  workoutStatus?: string;
  nutritionStatus?: string;
  recoveryStatus?: string;
  recoveryTrend?: string;
  goalStatus?: string;
  progressTrend?: string;
  forecastStatus?: string;
  habitStatus?: string;
  habitTrend?: string;
}): Record<string, unknown> {
  return {
    ...(input.workoutStatus
      ? {
          workoutExpert: {
            trainingStatus: input.workoutStatus,
            readinessLevel: 'HIGH',
            priority: 'LOW',
            goalAlignment: 'strength',
            confidence: 'HIGH',
            riskLevel: 'LOW',
            recommendationCodes: [],
          },
        }
      : {}),
    ...(input.nutritionStatus
      ? {
          nutritionExpert: {
            nutritionStatus: input.nutritionStatus,
            priority: 'LOW',
            goalAlignment: 'muscle_gain',
            confidence: 'HIGH',
            riskLevel: 'LOW',
            recommendationCodes: [],
          },
        }
      : {}),
    ...(input.recoveryStatus || input.recoveryTrend
      ? {
          recoveryExpert: {
            recoveryStatus: input.recoveryStatus ?? 'GOOD',
            readinessLevel: 'HIGH',
            trend: input.recoveryTrend ?? 'STABLE',
            trainingImpact: 'FULL_SESSION',
            confidence: 'HIGH',
            riskLevel: 'LOW',
            recommendationCodes: [],
          },
        }
      : {}),
    ...(input.goalStatus || input.progressTrend || input.forecastStatus
      ? {
          goalExpert: {
            goalStatus: input.goalStatus ?? 'ON_TRACK',
            progressCompletionPercentage: 60,
            progressTrend: input.progressTrend ?? 'STABLE',
            forecastStatus: input.forecastStatus ?? 'LIKELY',
            consistency: 'HIGH',
            confidence: 'HIGH',
            riskLevel: 'LOW',
            recommendationCodes: [],
            milestoneCount: 0,
            achievementCount: 0,
          },
        }
      : {}),
    ...(input.habitStatus || input.habitTrend
      ? {
          habitExpert: {
            habitStatus: input.habitStatus ?? 'GOOD',
            consistency: 'HIGH',
            trend: input.habitTrend ?? 'STABLE',
            riskLevel: 'LOW',
            confidence: 'HIGH',
            recommendationCodes: [],
            patternCodes: [],
          },
        }
      : {}),
  };
}
