import { HabitConsistencyCalculatorService } from '../../services/habit-consistency-calculator.service';
import { BuildHabitRiskSignalsError } from './build-habit-risk-signals.errors';
import { BuildHabitRiskSignalsUseCase } from './build-habit-risk-signals.use-case';

describe('BuildHabitRiskSignalsUseCase', () => {
  let useCase: BuildHabitRiskSignalsUseCase;

  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let habitSnapshotRepository: {
    findManyByUserProfileId: jest.Mock;
  };
  let consistencySummaryRepository: {
    findByUserProfileId: jest.Mock;
  };
  let habitRiskSignalRepository: {
    deleteByUserProfileId: jest.Mock;
    createMany: jest.Mock;
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
      findByUserProfileId: jest.fn(),
    };
    habitRiskSignalRepository = {
      deleteByUserProfileId: jest.fn(),
      createMany: jest.fn(),
    };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-06-03'),
    };

    useCase = new BuildHabitRiskSignalsUseCase(
      userProfileRepository as never,
      habitSnapshotRepository as never,
      consistencySummaryRepository as never,
      habitRiskSignalRepository as never,
      new HabitConsistencyCalculatorService(),
      platformDateService as never,
    );
  });

  it('creates persisted risk signals for unhealthy behavior', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([
      {
        date: '2026-05-27',
        consistencyScore: 30,
        streakDays: 0,
        trend: { value: 'declining' },
        sourceContext: {},
      },
    ]);
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue({
      score: 30,
      trend: { value: 'declining' },
      currentStreak: 0,
      longestStreak: 2,
      adherenceRate: 30,
      riskLevel: { value: 'high' },
    });
    habitRiskSignalRepository.createMany.mockImplementation(
      async (signals) => signals,
    );

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(
      habitRiskSignalRepository.deleteByUserProfileId,
    ).toHaveBeenCalledWith('user_profile_123');
    expect(habitRiskSignalRepository.createMany).toHaveBeenCalled();
    expect(result.habitRiskSignals.map((signal) => signal.type)).toEqual(
      expect.arrayContaining([
        'inactivity_pattern',
        'streak_at_risk',
        'declining_consistency',
        'dropout_risk',
      ]),
    );
  });

  it('does not persist risk signals when the calculator returns none', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([
      {
        date: '2026-06-02',
        consistencyScore: 80,
        streakDays: 5,
        trend: { value: 'stable' },
        sourceContext: {},
      },
    ]);
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue({
      score: 80,
      trend: { value: 'stable' },
      currentStreak: 5,
      longestStreak: 5,
      adherenceRate: 80,
      riskLevel: { value: 'low' },
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(
      habitRiskSignalRepository.deleteByUserProfileId,
    ).toHaveBeenCalledWith('user_profile_123');
    expect(habitRiskSignalRepository.createMany).not.toHaveBeenCalled();
    expect(result.habitRiskSignals).toEqual([]);
  });

  it('falls back safely when snapshot and summary are missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue(null);

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(
      habitRiskSignalRepository.deleteByUserProfileId,
    ).toHaveBeenCalledWith('user_profile_123');
    expect(habitRiskSignalRepository.createMany).not.toHaveBeenCalled();
    expect(result.habitRiskSignals).toEqual([]);
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

  it('keeps user isolation when loading habit snapshots', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'user_profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue(null);

    await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(
      habitSnapshotRepository.findManyByUserProfileId,
    ).toHaveBeenCalledWith('user_profile_123', { limit: 30 });
  });
});
