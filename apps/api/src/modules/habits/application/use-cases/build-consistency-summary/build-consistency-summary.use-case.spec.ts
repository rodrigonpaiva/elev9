import { HabitConsistencyCalculatorService } from '../../services/habit-consistency-calculator.service';
import { BuildConsistencySummaryError } from './build-consistency-summary.errors';
import { BuildConsistencySummaryUseCase } from './build-consistency-summary.use-case';

describe('BuildConsistencySummaryUseCase', () => {
  let useCase: BuildConsistencySummaryUseCase;

  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let habitSnapshotRepository: {
    findManyByUserProfileId: jest.Mock;
  };
  let consistencySummaryRepository: {
    upsertSummary: jest.Mock;
  };
  let platformDateService: {
    getTodayDateString: jest.Mock;
  };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    habitSnapshotRepository = {
      findManyByUserProfileId: jest.fn(),
    };
    consistencySummaryRepository = {
      upsertSummary: jest.fn(),
    };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-06-03'),
    };

    useCase = new BuildConsistencySummaryUseCase(
      userProfileRepository as never,
      habitSnapshotRepository as never,
      consistencySummaryRepository as never,
      new HabitConsistencyCalculatorService(),
      platformDateService as never,
    );
  });

  it('builds a summary from recent snapshots', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([
      {
        date: '2026-06-03',
        consistencyScore: 80,
        streakDays: 6,
        adherenceScore: 78,
        trend: { value: 'improving' },
        sourceContext: {
          workoutCompletionRate: 80,
          checkInCompletionRate: 80,
          recoveryAdherence: 80,
          goalProgressScore: 80,
          notificationEngagementScore: 80,
        },
      },
      {
        date: '2026-06-02',
        consistencyScore: 70,
        streakDays: 4,
        adherenceScore: 70,
        trend: { value: 'stable' },
        sourceContext: {},
      },
    ]);
    consistencySummaryRepository.upsertSummary.mockResolvedValue({
      userProfileId: 'user_profile_123',
      score: 80,
      trend: { value: 'improving' },
      currentStreak: 6,
      longestStreak: 6,
      adherenceRate: 80,
      riskLevel: { value: 'low' },
      updatedAt: new Date('2026-06-03T12:00:00.000Z'),
      formulaVersion: 'habit-engine-v1',
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(
      habitSnapshotRepository.findManyByUserProfileId,
    ).toHaveBeenCalledWith('user_profile_123', { limit: 30 });
    expect(consistencySummaryRepository.upsertSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'user_profile_123',
        score: 80,
        trend: 'improving',
        currentStreak: 6,
        longestStreak: 6,
        adherenceRate: 80,
        riskLevel: 'low',
        formulaVersion: 'habit-engine-v1',
      }),
    );
    expect(result.consistencySummary.score).toBe(80);
    expect(result.consistencySummary.trend.value).toBe('improving');
    expect(result.consistencySummary.currentStreak).toBe(6);
    expect(result.consistencySummary.longestStreak).toBe(6);
    expect(result.consistencySummary.riskLevel.value).toBe('low');
  });

  it('builds a summary from sparse history', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([
      {
        date: '2026-06-01',
        consistencyScore: 50,
        streakDays: 1,
        adherenceScore: 50,
        trend: { value: 'stable' },
        sourceContext: {},
      },
    ]);
    consistencySummaryRepository.upsertSummary.mockResolvedValue({
      userProfileId: 'user_profile_123',
      score: 50,
      trend: { value: 'stable' },
      currentStreak: 1,
      longestStreak: 1,
      adherenceRate: 50,
      riskLevel: { value: 'medium' },
      updatedAt: new Date('2026-06-03T12:00:00.000Z'),
      formulaVersion: 'habit-engine-v1',
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(consistencySummaryRepository.upsertSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 50,
        trend: 'stable',
        currentStreak: 1,
        longestStreak: 1,
        adherenceRate: 50,
        riskLevel: 'medium',
      }),
    );
    expect(result.consistencySummary.score).toBe(50);
    expect(result.consistencySummary.riskLevel.value).toBe('medium');
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toMatchObject({
      code: 'USER_PROFILE_NOT_FOUND',
    });
  });

  it('keeps user isolation when loading snapshots', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);
    consistencySummaryRepository.upsertSummary.mockResolvedValue({
      userProfileId: 'user_profile_123',
      score: 50,
      trend: { value: 'stable' },
      currentStreak: 0,
      longestStreak: 0,
      adherenceRate: 50,
      riskLevel: { value: 'medium' },
      updatedAt: new Date('2026-06-03T12:00:00.000Z'),
      formulaVersion: 'habit-engine-v1',
    });

    await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(
      habitSnapshotRepository.findManyByUserProfileId,
    ).toHaveBeenCalledWith('user_profile_123', { limit: 30 });
  });
});
