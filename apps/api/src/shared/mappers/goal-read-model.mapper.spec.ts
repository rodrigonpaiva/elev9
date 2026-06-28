import { GoalReadModelMapper } from './goal-read-model.mapper';

describe('GoalReadModelMapper', () => {
  const goalReadModel = {
    goal: {
      id: 'goal_1',
      type: 'lose_weight',
      status: 'active',
      toJSON: () => ({
        id: 'goal_1',
        userProfileId: 'user_profile_1',
        type: 'lose_weight',
        status: 'active',
        startDate: '2026-06-01',
        targetValue: 70,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
      }),
    },
    progressSnapshot: {
      progressPercentage: 72,
      trend: { value: 'improving' },
      toJSON: () => ({
        goalId: 'goal_1',
        userProfileId: 'user_profile_1',
        date: '2026-06-03',
        progressPercentage: 72,
        currentValue: 78,
        targetValue: 70,
        trend: 'improving',
        sourceContext: {
          prompt: 'hidden',
        },
        formulaVersion: 'goal-progress-v1',
      }),
    },
    forecast: {
      confidence: { value: 'medium' },
      toJSON: () => ({
        goalId: 'goal_1',
        userProfileId: 'user_profile_1',
        predictedCompletionDate: '2026-06-30',
        confidence: 'medium',
        estimatedDaysRemaining: 27,
        generatedAt: '2026-06-03T00:00:00.000Z',
        formulaVersion: 'goal-forecast-v1',
      }),
    },
    milestones: [
      {
        toJSON: () => ({
          goalId: 'goal_1',
          type: 'weight_target',
          title: '25%',
          targetValue: 25,
          achieved: true,
          achievedAt: '2026-06-02T00:00:00.000Z',
        }),
      },
    ],
  } as never;

  it('maps the goal read model to a dashboard payload without sourceContext', () => {
    const result = GoalReadModelMapper.toDashboardPayload(goalReadModel);

    expect(result).toEqual({
      current: {
        id: 'goal_1',
        userProfileId: 'user_profile_1',
        type: 'lose_weight',
        status: 'active',
        startDate: '2026-06-01',
        targetValue: 70,
        createdAt: '2026-06-01T00:00:00.000Z',
        updatedAt: '2026-06-02T00:00:00.000Z',
      },
      progressSnapshot: {
        goalId: 'goal_1',
        userProfileId: 'user_profile_1',
        date: '2026-06-03',
        progressPercentage: 72,
        currentValue: 78,
        targetValue: 70,
        trend: 'improving',
        formulaVersion: 'goal-progress-v1',
      },
      forecast: {
        goalId: 'goal_1',
        userProfileId: 'user_profile_1',
        predictedCompletionDate: '2026-06-30',
        confidence: 'medium',
        estimatedDaysRemaining: 27,
        generatedAt: '2026-06-03T00:00:00.000Z',
        formulaVersion: 'goal-forecast-v1',
      },
      milestones: [
        {
          goalId: 'goal_1',
          type: 'weight_target',
          title: '25%',
          targetValue: 25,
          achieved: true,
          achievedAt: '2026-06-02T00:00:00.000Z',
        },
      ],
    });
    expect(result?.progressSnapshot).not.toHaveProperty('sourceContext');
  });

  it('maps the goal read model to coach decision signals', () => {
    const result = GoalReadModelMapper.toCoachDecisionSignals(goalReadModel);

    expect(result).toEqual({
      goalId: 'goal_1',
      goalType: 'lose_weight',
      goalProgressPercentage: 72,
      goalTrend: 'improving',
      goalForecastConfidence: 'medium',
    });
  });
});
