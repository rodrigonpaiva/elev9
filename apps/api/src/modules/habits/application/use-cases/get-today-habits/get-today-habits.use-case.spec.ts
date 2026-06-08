import { GetTodayHabitsError } from './get-today-habits.errors';
import { GetTodayHabitsUseCase } from './get-today-habits.use-case';

describe('GetTodayHabitsUseCase', () => {
  let useCase: GetTodayHabitsUseCase;

  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let habitSnapshotRepository: {
    findByUserProfileIdAndDate: jest.Mock;
  };
  let buildHabitSnapshotUseCase: { execute: jest.Mock };
  let platformDateService: { getTodayDateString: jest.Mock };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    habitSnapshotRepository = {
      findByUserProfileIdAndDate: jest.fn(),
    };
    buildHabitSnapshotUseCase = {
      execute: jest.fn(),
    };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-06-03'),
    };

    useCase = new GetTodayHabitsUseCase(
      userProfileRepository as never,
      habitSnapshotRepository as never,
      buildHabitSnapshotUseCase as never,
      platformDateService as never,
    );
  });

  it('returns an existing snapshot for today', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findByUserProfileIdAndDate.mockResolvedValue({
      date: '2026-06-03',
      consistencyScore: 72,
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(habitSnapshotRepository.findByUserProfileIdAndDate).toHaveBeenCalledWith(
      'profile_123',
      '2026-06-03',
    );
    expect(buildHabitSnapshotUseCase.execute).not.toHaveBeenCalled();
    expect(result.habitSnapshot.date).toBe('2026-06-03');
  });

  it('builds today snapshot when missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findByUserProfileIdAndDate.mockResolvedValue(null);
    buildHabitSnapshotUseCase.execute.mockResolvedValue({
      habitSnapshot: {
        date: '2026-06-03',
        consistencyScore: 81,
      },
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(buildHabitSnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.habitSnapshot.consistencyScore).toBe(81);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toBeInstanceOf(GetTodayHabitsError);
  });
});
