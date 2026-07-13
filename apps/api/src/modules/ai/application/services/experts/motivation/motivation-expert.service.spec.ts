import type {
  CoachExpertContext,
  CoachExpertRequest,
} from '../coach-expert.types';
import { MotivationExpert } from './motivation-expert.service';

describe('MotivationExpert', () => {
  const expert = new MotivationExpert();

  it('identifies a recent achievement as highly engaged and reinforces progress', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        adherenceScore: 96,
        currentStreak: 12,
        latestCheckIn: {
          energyLevel: 5,
          sleepQuality: 5,
          muscleSoreness: 0,
          motivationLevel: 5,
          createdAt: new Date('2026-07-09T07:30:00.000Z'),
        },
        recentWorkoutLogs: [
          buildWorkoutLog('2026-07-06'),
          buildWorkoutLog('2026-07-08'),
          buildWorkoutLog('2026-07-09'),
        ],
      }),
      goalContext: buildGoalContext({
        progressPercentage: 92,
        currentValue: 92,
        targetValue: 100,
        progressTrend: 'improving',
        forecastConfidence: 'high',
        estimatedDaysRemaining: 9,
        milestones: [
          buildMilestone('Foundation', true, '2026-06-01'),
          buildMilestone('Finish', false),
        ],
        achievementHistory: [buildAchievement('2026-07-08', 92)],
      }),
      progress: buildProgressContext({
        weeklySummary: {
          period: 'week',
          workoutsCompleted: 4,
          totalDurationMinutes: 260,
          averageDurationMinutes: 65,
          lastWorkoutDate: '2026-07-09',
          currentStreak: 12,
        },
        monthlySummary: {
          period: 'month',
          workoutsCompleted: 14,
          totalDurationMinutes: 980,
          averageDurationMinutes: 70,
          lastWorkoutDate: '2026-07-09',
          currentStreak: 12,
        },
        workoutHistory: [
          buildWorkoutLog('2026-07-02'),
          buildWorkoutLog('2026-07-04'),
          buildWorkoutLog('2026-07-06'),
          buildWorkoutLog('2026-07-08'),
          buildWorkoutLog('2026-07-09'),
        ],
      }),
      habit: buildHabit({
        current: {
          date: '2026-07-09',
          consistencyScore: 95,
          streakDays: 12,
          adherenceScore: 96,
          trend: 'improving',
        },
        summary: {
          currentStreak: 12,
          longestStreak: 12,
          adherenceRate: 96,
          trend: 'improving',
          riskLevel: 'low',
        },
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutExpert: {
          expertId: 'WorkoutExpert',
          trainingStatus: 'completed',
        },
        nutritionExpert: {
          expertId: 'NutritionExpert',
          nutritionStatus: 'ON_TRACK',
        },
        recoveryExpert: {
          expertId: 'RecoveryExpert',
          recoveryStatus: 'OPTIMAL',
        },
        goalExpert: {
          expertId: 'GoalExpert',
          goalStatus: 'ON_TRACK',
          forecastStatus: 'LIKELY',
        },
        habitExpert: {
          expertId: 'HabitExpert',
          habitStatus: 'EXCELLENT',
        },
        progressExpert: {
          expertId: 'ProgressExpert',
          trend: 'STRONGLY_IMPROVING',
          momentum: 'HIGH',
          plateau: 'NONE',
          regression: 'NONE',
        },
      }),
    });

    const loaded = expert.loadContext(request, context);
    const result = expert.analyze(request, loaded);

    expect(loaded.runtimeMetadata.motivationExpert).toMatchObject({
      expertId: 'MotivationExpert',
      motivationState: 'HIGHLY_ENGAGED',
      motivationOpportunity: 'RECENT_ACHIEVEMENT',
      strategy: 'REINFORCE_PROGRESS',
      riskLevel: 'LOW',
      confidence: 'HIGH',
    });
    expect(result.summary).toBe(
      'state=HIGHLY_ENGAGED; opportunity=RECENT_ACHIEVEMENT; strategy=REINFORCE_PROGRESS; risk=LOW; confidence=HIGH',
    );
    expect(result.metadata).toMatchObject({
      priority: 'LOW',
      confidence: 'HIGH',
      analysis: expect.objectContaining({
        motivationState: 'HIGHLY_ENGAGED',
        motivationOpportunity: 'RECENT_ACHIEVEMENT',
        strategy: 'REINFORCE_PROGRESS',
      }),
    });
    expect(
      result.metadata.analysis.supportingEvidence.map(
        (entry: { code: string }) => entry.code,
      ),
    ).toEqual(
      expect.arrayContaining([
        'RECENT_ACHIEVEMENT',
        'GOAL_PROGRESS_IMPROVING',
        'HABIT_STRONG',
        'WORKOUT_CONSISTENT',
        'NUTRITION_CONSISTENT',
        'RECOVERY_IMPROVING',
        'CHECKIN_MOTIVATION_HIGH',
      ]),
    );
    expect(result.contributions[1].summary).toBe(
      'strategy=REINFORCE_PROGRESS; recommendation=ACKNOWLEDGE_RECENT_PROGRESS',
    );
  });

  it('detects a comeback after inactivity', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        adherenceScore: 58,
        currentStreak: 3,
        generatedAt: new Date('2026-07-03T00:00:00.000Z'),
        latestCheckIn: {
          energyLevel: 3,
          sleepQuality: 3,
          muscleSoreness: 2,
          motivationLevel: 3,
          createdAt: new Date('2026-07-03T07:30:00.000Z'),
        },
        recentWorkoutLogs: [
          buildWorkoutLog('2026-06-21'),
          buildWorkoutLog('2026-06-22'),
          buildWorkoutLog('2026-07-02'),
        ],
      }),
      goalContext: buildGoalContext({
        progressPercentage: 61,
        currentValue: 61,
        targetValue: 100,
        progressTrend: 'stable',
        forecastConfidence: 'medium',
        estimatedDaysRemaining: 28,
        milestones: [
          buildMilestone('Base', true, '2026-06-01'),
          buildMilestone('Build', false),
        ],
      }),
      progress: buildProgressContext({
        weeklySummary: {
          period: 'week',
          workoutsCompleted: 2,
          totalDurationMinutes: 120,
          averageDurationMinutes: 60,
          lastWorkoutDate: '2026-07-02',
          currentStreak: 3,
        },
        monthlySummary: {
          period: 'month',
          workoutsCompleted: 8,
          totalDurationMinutes: 520,
          averageDurationMinutes: 65,
          lastWorkoutDate: '2026-07-02',
          currentStreak: 3,
        },
        workoutHistory: [
          buildWorkoutLog('2026-06-21'),
          buildWorkoutLog('2026-06-22'),
          buildWorkoutLog('2026-07-01'),
          buildWorkoutLog('2026-07-02'),
        ],
      }),
      habit: buildHabit({
        current: {
          date: '2026-07-02',
          consistencyScore: 67,
          streakDays: 3,
          adherenceScore: 64,
          trend: 'improving',
        },
        summary: {
          currentStreak: 3,
          longestStreak: 8,
          adherenceRate: 64,
          trend: 'improving',
          riskLevel: 'medium',
        },
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutExpert: {
          expertId: 'WorkoutExpert',
          trainingStatus: 'completed',
        },
        nutritionExpert: {
          expertId: 'NutritionExpert',
          nutritionStatus: 'PARTIAL',
        },
        recoveryExpert: {
          expertId: 'RecoveryExpert',
          recoveryStatus: 'GOOD',
        },
        goalExpert: {
          expertId: 'GoalExpert',
          goalStatus: 'SLIGHTLY_BEHIND',
          forecastStatus: 'UNCERTAIN',
        },
        habitExpert: {
          expertId: 'HabitExpert',
          habitStatus: 'GOOD',
        },
        progressExpert: {
          expertId: 'ProgressExpert',
          trend: 'IMPROVING',
          momentum: 'POSITIVE',
          plateau: 'NONE',
          regression: 'NONE',
        },
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.motivationState).toBe('HIGHLY_ENGAGED');
    expect(result.metadata.analysis.motivationOpportunity).toBe('COMEBACK');
    expect(result.metadata.analysis.strategy).toBe('ENCOURAGE_COMEBACK');
    expect(result.metadata.analysis.risk.level).toBe('LOW');
  });

  it('detects plateau pressure deterministically', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        adherenceScore: 72,
        currentStreak: 5,
        recentWorkoutLogs: [
          buildWorkoutLog('2026-07-01'),
          buildWorkoutLog('2026-07-03'),
          buildWorkoutLog('2026-07-05'),
        ],
      }),
      goalContext: buildGoalContext({
        progressPercentage: 60,
        currentValue: 60,
        targetValue: 100,
        progressTrend: 'stable',
        forecastConfidence: 'medium',
        estimatedDaysRemaining: 35,
        milestones: [
          buildMilestone('Base', false),
          buildMilestone('Build', false),
          buildMilestone('Finish', false),
        ],
      }),
      progress: buildProgressContext({
        weeklySummary: {
          period: 'week',
          workoutsCompleted: 3,
          totalDurationMinutes: 180,
          averageDurationMinutes: 60,
          lastWorkoutDate: '2026-07-05',
          currentStreak: 5,
        },
        monthlySummary: {
          period: 'month',
          workoutsCompleted: 12,
          totalDurationMinutes: 720,
          averageDurationMinutes: 60,
          lastWorkoutDate: '2026-07-05',
          currentStreak: 5,
        },
        workoutHistory: [
          buildWorkoutLog('2026-06-28'),
          buildWorkoutLog('2026-06-30'),
          buildWorkoutLog('2026-07-02'),
          buildWorkoutLog('2026-07-04'),
          buildWorkoutLog('2026-07-05'),
        ],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        progressExpert: {
          expertId: 'ProgressExpert',
          trend: 'STABLE',
          momentum: 'NEUTRAL',
          plateau: 'LONG',
          regression: 'NONE',
        },
        goalExpert: {
          expertId: 'GoalExpert',
          goalStatus: 'ON_TRACK',
          forecastStatus: 'LIKELY',
        },
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.motivationOpportunity).toBe(
      'PLATEAU_BREAK',
    );
    expect(result.metadata.analysis.strategy).toBe('REBUILD_ROUTINE');
    expect(
      result.metadata.analysis.supportingEvidence.map(
        (entry: { code: string }) => entry.code,
      ),
    ).toEqual(expect.arrayContaining(['PLATEAU_ACTIVE']));
  });

  it('detects milestone proximity deterministically', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        adherenceScore: 80,
        currentStreak: 6,
        recentWorkoutLogs: [
          buildWorkoutLog('2026-07-04'),
          buildWorkoutLog('2026-07-06'),
          buildWorkoutLog('2026-07-08'),
        ],
      }),
      goalContext: buildGoalContext({
        progressSnapshot: {
          date: '2026-07-08',
          progressPercentage: 84,
          currentValue: 84,
          targetValue: 100,
          trend: { value: 'improving' },
        },
        forecast: {
          confidence: { value: 'high' },
          estimatedDaysRemaining: 11,
        },
        milestones: [
          buildMilestone('Base', true, '2026-06-01'),
          buildMilestone('Build', true, '2026-06-20'),
          buildMilestone('Finish', false),
        ],
      }),
      progress: buildProgressContext({
        weeklySummary: {
          period: 'week',
          workoutsCompleted: 3,
          totalDurationMinutes: 180,
          averageDurationMinutes: 60,
          lastWorkoutDate: '2026-07-08',
          currentStreak: 6,
        },
        monthlySummary: {
          period: 'month',
          workoutsCompleted: 12,
          totalDurationMinutes: 720,
          averageDurationMinutes: 60,
          lastWorkoutDate: '2026-07-08',
          currentStreak: 6,
        },
        workoutHistory: [
          buildWorkoutLog('2026-06-28'),
          buildWorkoutLog('2026-06-30'),
          buildWorkoutLog('2026-07-02'),
          buildWorkoutLog('2026-07-04'),
          buildWorkoutLog('2026-07-06'),
          buildWorkoutLog('2026-07-08'),
        ],
      }),
      runtimeMetadata: buildRuntimeMetadata({
        progressExpert: {
          expertId: 'ProgressExpert',
          trend: 'IMPROVING',
          momentum: 'POSITIVE',
          plateau: 'NONE',
          regression: 'NONE',
        },
        goalExpert: {
          expertId: 'GoalExpert',
          goalStatus: 'ON_TRACK',
          forecastStatus: 'LIKELY',
        },
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.motivationOpportunity).toBe(
      'MILESTONE_CLOSE',
    );
    expect(result.metadata.analysis.goalProgressPercentage).toBe(84);
    expect(result.metadata.analysis.goalForecastStatus).toBe('high');
    expect(result.metadata.analysis.strategy).toBe('FOCUS_NEXT_STEP');
  });

  it('detects regression, broken routine, and long inactivity', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        adherenceScore: 24,
        currentStreak: 0,
        latestCheckIn: {
          energyLevel: 1,
          sleepQuality: 1,
          muscleSoreness: 5,
          motivationLevel: 1,
          createdAt: new Date('2026-07-10T07:30:00.000Z'),
        },
        recentWorkoutLogs: [buildWorkoutLog('2026-06-01')],
      }),
      progress: buildProgressContext({
        weeklySummary: {
          period: 'week',
          workoutsCompleted: 0,
          totalDurationMinutes: 0,
          averageDurationMinutes: 0,
          lastWorkoutDate: '2026-06-01',
          currentStreak: 0,
        },
        monthlySummary: {
          period: 'month',
          workoutsCompleted: 1,
          totalDurationMinutes: 40,
          averageDurationMinutes: 40,
          lastWorkoutDate: '2026-06-01',
          currentStreak: 0,
        },
        workoutHistory: [buildWorkoutLog('2026-06-01')],
      }),
      habit: buildHabit({
        current: {
          date: '2026-07-10',
          consistencyScore: 24,
          streakDays: 0,
          adherenceScore: 22,
          trend: 'declining',
        },
        summary: {
          currentStreak: 0,
          longestStreak: 9,
          adherenceRate: 22,
          trend: 'declining',
          riskLevel: 'high',
        },
      }),
      runtimeMetadata: buildRuntimeMetadata({
        workoutExpert: {
          expertId: 'WorkoutExpert',
          trainingStatus: 'skipped',
        },
        nutritionExpert: {
          expertId: 'NutritionExpert',
          nutritionStatus: 'MISSED',
        },
        recoveryExpert: {
          expertId: 'RecoveryExpert',
          recoveryStatus: 'CRITICAL',
        },
        goalExpert: {
          expertId: 'GoalExpert',
          goalStatus: 'AT_RISK',
        },
        habitExpert: {
          expertId: 'HabitExpert',
          habitStatus: 'BROKEN',
        },
        progressExpert: {
          expertId: 'ProgressExpert',
          trend: 'REGRESSING',
          momentum: 'VERY_NEGATIVE',
          plateau: 'LONG',
          regression: 'SEVERE',
        },
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.motivationState).toBe('DISENGAGING');
    expect(result.metadata.analysis.strategy).toBe('REDUCE_OVERLOAD');
    expect(result.metadata.analysis.risk.level).toBe('CRITICAL');
    expect(result.metadata.analysis.inactivityDays).toBeGreaterThanOrEqual(30);
  });

  it('returns low confidence when evidence is sparse', () => {
    const request = buildRequest();
    const context = buildContext({
      healthContext: buildHealthContext({
        adherenceScore: 0,
        currentStreak: 0,
        recentWorkoutLogs: [],
      }),
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.confidence).toBe('LOW');
    expect(result.metadata.analysis.motivationState).toBe('NEEDS_SUPPORT');
  });

  it('respects blocked policy evaluations', () => {
    const request = buildRequest();
    const context = buildContext({
      policyEvaluation: {
        decision: {
          approved: false,
          blocked: true,
          fallbackRequired: true,
          allowedDomains: [],
          allowedTools: [],
          allowedExperts: [],
          allowedLLM: false,
          metadata: {},
        },
      } as CoachExpertContext['policyEvaluation'],
    });

    const result = expert.analyze(request, context);

    expect(result.metadata.analysis.motivationState).toBe('UNKNOWN');
    expect(result.metadata.analysis.confidence).toBe('LOW');
    expect(result.metadata.analysis.risk.level).toBe('CRITICAL');
  });

  it('loads runtime metadata for composition-aware selection', () => {
    const loaded = expert.loadContext(
      buildRequest(),
      buildContext({
        healthContext: buildHealthContext({
          adherenceScore: 88,
          currentStreak: 8,
          latestCheckIn: {
            energyLevel: 4,
            sleepQuality: 4,
            muscleSoreness: 1,
            motivationLevel: 4,
            createdAt: new Date('2026-07-09T07:30:00.000Z'),
          },
          recentWorkoutLogs: [
            buildWorkoutLog('2026-07-05'),
            buildWorkoutLog('2026-07-07'),
            buildWorkoutLog('2026-07-09'),
          ],
        }),
        goalContext: buildGoalContext({
          progressPercentage: 84,
          currentValue: 84,
          targetValue: 100,
          progressTrend: 'improving',
          forecastConfidence: 'high',
          estimatedDaysRemaining: 12,
          milestones: [buildMilestone('Base', true, '2026-06-01')],
        }),
        runtimeMetadata: buildRuntimeMetadata({
          workoutExpert: {
            expertId: 'WorkoutExpert',
            trainingStatus: 'completed',
          },
          progressExpert: {
            expertId: 'ProgressExpert',
            trend: 'IMPROVING',
            momentum: 'POSITIVE',
            plateau: 'NONE',
            regression: 'NONE',
          },
          habitExpert: {
            expertId: 'HabitExpert',
            habitStatus: 'GOOD',
          },
        }),
      }),
    );

    expect(loaded.runtimeMetadata.motivationExpert).toMatchObject({
      expertId: 'MotivationExpert',
      motivationState: 'HIGHLY_ENGAGED',
      strategy: 'CELEBRATE_CONSISTENCY',
    });
  });
});

function buildRequest(
  overrides: Partial<CoachExpertRequest> = {},
): CoachExpertRequest {
  return {
    userId: overrides.userId ?? 'user-1',
    conversationId: overrides.conversationId ?? 'conversation-1',
    userMessage: overrides.userMessage ?? 'motivation check',
    sessionMetadata:
      overrides.sessionMetadata ??
      ({
        requestId: 'request-1',
        authUserId: 'auth-user-1',
        userProfileId: 'profile-1',
        conversationId: 'conversation-1',
        userIdHash: 'hash-1',
      } as CoachExpertRequest['sessionMetadata']),
    promptVersion: overrides.promptVersion ?? 'prompt-v1',
    streamingPreference: overrides.streamingPreference ?? false,
    experimentMetadata:
      overrides.experimentMetadata ??
      ({
        experimentId: 'experiment-1',
        rolloutVariant: 'control',
        toolCallingEnabled: false,
      } as CoachExpertRequest['experimentMetadata']),
    signal: overrides.signal,
    onDelta: overrides.onDelta,
    intent: overrides.intent ?? 'MOTIVATION',
    selectedDomains: overrides.selectedDomains ?? [
      'goals',
      'progress',
      'training',
      'recovery',
      'habits',
      'nutrition',
    ],
    candidateExperts: overrides.candidateExperts ?? [],
    selectedExperts: overrides.selectedExperts ?? [],
  } as CoachExpertRequest;
}

function buildContext(
  overrides: Partial<CoachExpertContext> = {},
): CoachExpertContext {
  const request = overrides.request ?? buildRequest();

  return {
    request,
    selectionReason: overrides.selectionReason ?? 'selected for motivation',
    runtimeMetadata: overrides.runtimeMetadata ?? {},
    healthContext:
      overrides.healthContext ??
      buildHealthContext({
        recentWorkoutLogs: [],
      }),
    ...(overrides.goalContext ? { goalContext: overrides.goalContext } : {}),
    ...(overrides.progress ? { progress: overrides.progress } : {}),
    ...(overrides.habit ? { habit: overrides.habit } : {}),
    ...(overrides.policyEvaluation
      ? { policyEvaluation: overrides.policyEvaluation }
      : {}),
  } as CoachExpertContext;
}

function buildHealthContext(
  overrides: Partial<NonNullable<CoachExpertContext['healthContext']>> = {},
): NonNullable<CoachExpertContext['healthContext']> {
  return {
    authUserId: overrides.authUserId ?? 'auth-user-1',
    userProfileId: overrides.userProfileId ?? 'profile-1',
    adherenceScore: overrides.adherenceScore ?? 0,
    currentStreak: overrides.currentStreak ?? 0,
    averageWorkoutDuration: overrides.averageWorkoutDuration ?? 0,
    fatigueLevel: overrides.fatigueLevel ?? 'MODERATE',
    availableEquipment: overrides.availableEquipment ?? [],
    limitations: overrides.limitations ?? [],
    todayWorkout: overrides.todayWorkout ?? null,
    recentWorkoutLogs: overrides.recentWorkoutLogs ?? [],
    generatedAt: overrides.generatedAt ?? new Date('2026-07-10T00:00:00.000Z'),
    ...(overrides.weeklyFrequency !== undefined
      ? { weeklyFrequency: overrides.weeklyFrequency }
      : {}),
    ...(overrides.latestCheckIn
      ? { latestCheckIn: overrides.latestCheckIn }
      : {}),
  } as NonNullable<CoachExpertContext['healthContext']>;
}

function buildGoalContext(
  overrides: Partial<NonNullable<CoachExpertContext['goalContext']>> = {},
): NonNullable<CoachExpertContext['goalContext']> {
  return {
    currentGoal:
      overrides.currentGoal ??
      ({
        status: { value: 'active' },
        targetValue: 100,
      } as NonNullable<
        NonNullable<CoachExpertContext['goalContext']>['currentGoal']
      >),
    progressSnapshot:
      overrides.progressSnapshot ??
      ({
        date: '2026-07-10',
        progressPercentage: 50,
        currentValue: 50,
        targetValue: 100,
        trend: { value: 'stable' },
      } as NonNullable<
        NonNullable<CoachExpertContext['goalContext']>['progressSnapshot']
      >),
    forecast:
      overrides.forecast ??
      ({
        confidence: { value: 'medium' },
        estimatedDaysRemaining: 30,
      } as NonNullable<
        NonNullable<CoachExpertContext['goalContext']>['forecast']
      >),
    goalHistory: overrides.goalHistory ?? [],
    milestones: overrides.milestones ?? [],
    achievementHistory: overrides.achievementHistory ?? [],
  } as NonNullable<CoachExpertContext['goalContext']>;
}

function buildProgressContext(
  overrides: Partial<NonNullable<CoachExpertContext['progress']>> = {},
): NonNullable<CoachExpertContext['progress']> {
  return {
    weeklySummary:
      overrides.weeklySummary ??
      ({
        period: 'week',
        workoutsCompleted: 0,
        totalDurationMinutes: 0,
        averageDurationMinutes: 0,
        lastWorkoutDate: null,
        currentStreak: 0,
      } as NonNullable<
        NonNullable<CoachExpertContext['progress']>['weeklySummary']
      >),
    monthlySummary:
      overrides.monthlySummary ??
      ({
        period: 'month',
        workoutsCompleted: 0,
        totalDurationMinutes: 0,
        averageDurationMinutes: 0,
        lastWorkoutDate: null,
        currentStreak: 0,
      } as NonNullable<
        NonNullable<CoachExpertContext['progress']>['monthlySummary']
      >),
    workoutHistory: overrides.workoutHistory ?? [],
    dailyCheckInHistory: overrides.dailyCheckInHistory ?? [],
  } as NonNullable<CoachExpertContext['progress']>;
}

function buildHabit(
  overrides: Partial<NonNullable<CoachExpertContext['habit']>> = {},
): NonNullable<CoachExpertContext['habit']> {
  return {
    current:
      overrides.current ??
      ({
        date: '2026-07-10',
        consistencyScore: 50,
        streakDays: 0,
        adherenceScore: 50,
        trend: 'stable',
        sourceContext: 'calculated',
        formulaVersion: 'habit-v1',
        generatedAt: '2026-07-10T00:00:00.000Z',
      } as NonNullable<NonNullable<CoachExpertContext['habit']>['current']>),
    summary:
      overrides.summary ??
      ({
        userProfileId: 'profile-1',
        score: 50,
        trend: 'stable',
        currentStreak: 0,
        longestStreak: 0,
        adherenceRate: 50,
        riskLevel: 'low',
        updatedAt: '2026-07-10T00:00:00.000Z',
        formulaVersion: 'habit-v1',
      } as NonNullable<NonNullable<CoachExpertContext['habit']>['summary']>),
    riskSignals: overrides.riskSignals ?? [],
  } as NonNullable<CoachExpertContext['habit']>;
}

function buildRuntimeMetadata(
  overrides: Record<string, unknown> = {},
): CoachExpertContext['runtimeMetadata'] {
  return {
    ...overrides,
  };
}

function buildWorkoutLog(date: string) {
  return {
    id: `workout-${date}`,
    trainingPlanId: 'training-plan-1',
    workoutDayIndex: 1,
    durationMinutes: 60,
    completedExercises: [
      {
        name: 'Squat',
        setsDone: 3,
        repsDone: 5,
      },
    ],
    date,
    createdAt: `${date}T08:00:00.000Z`,
  };
}

function buildAchievement(date: string, completionPercentage: number) {
  return {
    goalId: 'goal-1',
    achievedAt: new Date(`${date}T00:00:00.000Z`),
    completionPercentage,
  };
}

function buildMilestone(title: string, achieved: boolean, achievedAt?: string) {
  return {
    goalId: 'goal-1',
    type: { value: 'custom' },
    title,
    targetValue: 100,
    achieved,
    ...(achievedAt
      ? { achievedAt: new Date(`${achievedAt}T00:00:00.000Z`) }
      : {}),
  };
}
