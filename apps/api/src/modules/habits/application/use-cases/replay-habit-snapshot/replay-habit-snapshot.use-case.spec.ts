import { HabitConsistencyCalculatorService } from '../../services/habit-consistency-calculator.service';
import { HabitSnapshot } from '../../../domain/entities/habit-snapshot.entity';
import type { HabitSourceContext } from '../../../domain/habits.types';
import { ConsistencyTrendValueObject } from '../../../domain/value-objects/consistency-trend.value-object';
import {
  REPLAY_HABIT_SNAPSHOT_ERROR_CODES,
  ReplayHabitSnapshotError,
} from './replay-habit-snapshot.errors';
import { ReplayHabitSnapshotUseCase } from './replay-habit-snapshot.use-case';

describe('ReplayHabitSnapshotUseCase', () => {
  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let habitSnapshotRepository: {
    findById: jest.Mock;
    upsertDailySnapshot: jest.Mock;
    findManyByUserProfileId: jest.Mock;
  };
  let habitConsistencyCalculatorService: {
    calculate: jest.Mock;
  };
  let buildHabitSnapshotUseCase: {
    execute: jest.Mock;
  };
  let useCase: ReplayHabitSnapshotUseCase;

  beforeEach(() => {
    const realCalculator = new HabitConsistencyCalculatorService();

    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    habitSnapshotRepository = {
      findById: jest.fn(),
      upsertDailySnapshot: jest.fn(),
      findManyByUserProfileId: jest.fn(),
    };
    habitConsistencyCalculatorService = {
      calculate: jest.fn((input) => realCalculator.calculate(input)),
    };
    buildHabitSnapshotUseCase = {
      execute: jest.fn(),
    };

    useCase = new ReplayHabitSnapshotUseCase(
      userProfileRepository as never,
      habitSnapshotRepository as never,
      habitConsistencyCalculatorService as never,
    );
  });

  it('returns a matching replay result when persisted data matches the recalculated snapshot', async () => {
    const persisted = buildSnapshot();

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findById.mockResolvedValue(persisted);

    const before = persisted.toJSON();
    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      habitSnapshotId: 'snapshot_123',
    });
    const after = persisted.toJSON();

    expect(result.persisted).toBe(persisted);
    expect(result.recalculated).toEqual({
      consistencyScore: 74,
      streakDays: 4,
      adherenceScore: 73,
      trend: 'improving',
      formulaVersion: 'habit-engine-v1',
    });
    expect(result.comparison).toEqual({
      matches: true,
      differences: [],
    });
    expect(result.replayedAt).toBeTruthy();
    expect(after).toEqual(before);
  });

  it.each([
    ['consistencyScore', { consistencyScore: 75 }],
    ['streakDays', { streakDays: 5 }],
    ['adherenceScore', { adherenceScore: 74 }],
    ['trend', { trend: 'stable' }],
    ['formulaVersion', { formulaVersion: 'habit-engine-v2' }],
  ] as const)('detects %s drift', async (field, override) => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findById.mockResolvedValue(buildSnapshot(override));

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      habitSnapshotId: 'snapshot_123',
    });

    expect(result.comparison.matches).toBe(false);
    expect(result.comparison.differences.map((difference) => difference.field)).toContain(
      field,
    );
  });

  it('rejects missing user profiles', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        habitSnapshotId: 'snapshot_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_HABIT_SNAPSHOT_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('rejects missing snapshots', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        habitSnapshotId: 'snapshot_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_HABIT_SNAPSHOT_ERROR_CODES.HABIT_SNAPSHOT_NOT_FOUND,
    });
  });

  it('rejects cross-user snapshots as not found', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_999',
    });
    habitSnapshotRepository.findById.mockResolvedValue(
      buildSnapshot({ userProfileId: 'profile_123' }),
    );

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        habitSnapshotId: 'snapshot_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_HABIT_SNAPSHOT_ERROR_CODES.HABIT_SNAPSHOT_NOT_FOUND,
    });
  });

  it('rejects invalid session input', async () => {
    await expect(
      useCase.execute({
        authUserId: ' ',
        habitSnapshotId: 'snapshot_123',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INVALID_SESSION,
    });
  });

  it('rejects invalid snapshot id input', async () => {
    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        habitSnapshotId: ' ',
      }),
    ).rejects.toMatchObject({
      code: REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INVALID_INPUT,
    });
  });

  it('does not call the build use case', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findById.mockResolvedValue(buildSnapshot());

    await useCase.execute({
      authUserId: 'auth_user_123',
      habitSnapshotId: 'snapshot_123',
    });

    expect(buildHabitSnapshotUseCase.execute).not.toHaveBeenCalled();
  });

  it('does not mutate the persisted snapshot', async () => {
    const persisted = buildSnapshot();

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findById.mockResolvedValue(persisted);

    const before = persisted.toJSON();
    await useCase.execute({
      authUserId: 'auth_user_123',
      habitSnapshotId: 'snapshot_123',
    });

    expect(persisted.toJSON()).toEqual(before);
    expect(habitSnapshotRepository.upsertDailySnapshot).not.toHaveBeenCalled();
  });

  it('uses persisted sourceContext only', async () => {
    const sourceContext: HabitSourceContext = {
      ...buildSourceContext(),
      workoutCompletionRate: 10,
      checkInCompletionRate: 20,
      recoveryAdherence: 30,
      goalProgressScore: 40,
      notificationEngagementScore: 50,
      consecutiveSuccessfulDays: 6,
      longestStreak: 9,
      inactivityDays: 2,
      previousScore: 44,
      generatedAt: '2026-06-04T11:00:00.000Z',
    };

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findById.mockResolvedValue(
      buildSnapshot({ sourceContext }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
      habitSnapshotId: 'snapshot_123',
    });

    expect(habitConsistencyCalculatorService.calculate).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      generatedAt: sourceContext.generatedAt,
      workoutCompletionRate: sourceContext.workoutCompletionRate,
      checkInCompletionRate: sourceContext.checkInCompletionRate,
      recoveryAdherence: sourceContext.recoveryAdherence,
      goalProgressScore: sourceContext.goalProgressScore,
      notificationEngagementScore: sourceContext.notificationEngagementScore,
      consecutiveSuccessfulDays: sourceContext.consecutiveSuccessfulDays,
      longestStreak: sourceContext.longestStreak,
      inactivityDays: sourceContext.inactivityDays,
      previousScore: sourceContext.previousScore,
    });
    expect(habitSnapshotRepository.findManyByUserProfileId).not.toHaveBeenCalled();
    expect(habitSnapshotRepository.upsertDailySnapshot).not.toHaveBeenCalled();
  });

  it('wraps unexpected errors consistently', async () => {
    userProfileRepository.findByAuthUserId.mockRejectedValue(new Error('boom'));

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        habitSnapshotId: 'snapshot_123',
      }),
    ).rejects.toBeInstanceOf(ReplayHabitSnapshotError);
  });
});

function buildSourceContext(
  overrides: Partial<HabitSourceContext> = {},
): HabitSourceContext {
  return {
    formulaVersion: 'habit-engine-v1',
    generatedAt: '2026-06-03T10:00:00.000Z',
    workoutCompletionRate: 80,
    checkInCompletionRate: 70,
    recoveryAdherence: 60,
    goalProgressScore: 90,
    notificationEngagementScore: 50,
    recentWorkoutLogsCount: 4,
    recentCheckInsCount: 5,
    latestRecoverySnapshotDate: '2026-06-03',
    latestGoalSnapshotDate: '2026-06-03',
    latestNotificationDate: '2026-06-03',
    consecutiveSuccessfulDays: 4,
    previousScore: 65,
    ...overrides,
  };
}

function buildSnapshot(
  overrides: Partial<{
    userProfileId: string;
    date: string;
    consistencyScore: number;
    streakDays: number;
    adherenceScore: number;
    trend: 'improving' | 'stable' | 'declining';
    sourceContext: HabitSourceContext;
    formulaVersion: string;
    generatedAt: Date;
  }> = {},
) {
  return new HabitSnapshot({
    userProfileId: overrides.userProfileId ?? 'profile_123',
    date: overrides.date ?? '2026-06-03',
    consistencyScore: overrides.consistencyScore ?? 74,
    streakDays: overrides.streakDays ?? 4,
    adherenceScore: overrides.adherenceScore ?? 73,
    trend: new ConsistencyTrendValueObject(overrides.trend ?? 'improving'),
    sourceContext: overrides.sourceContext ?? buildSourceContext(),
    formulaVersion: overrides.formulaVersion ?? 'habit-engine-v1',
    generatedAt: overrides.generatedAt ?? new Date('2026-06-03T10:00:00.000Z'),
  });
}
