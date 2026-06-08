import { GetCurrentHabitsError } from './get-current-habits.errors';
import { GetCurrentHabitsUseCase } from './get-current-habits.use-case';

describe('GetCurrentHabitsUseCase', () => {
  let useCase: GetCurrentHabitsUseCase;

  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let habitSnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let buildHabitSnapshotUseCase: { execute: jest.Mock };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    habitSnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    buildHabitSnapshotUseCase = {
      execute: jest.fn(),
    };

    useCase = new GetCurrentHabitsUseCase(
      userProfileRepository as never,
      habitSnapshotRepository as never,
      buildHabitSnapshotUseCase as never,
    );
  });

  it('returns the latest snapshot', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findLatestByUserProfileId.mockResolvedValue({
      date: '2026-06-02',
      consistencyScore: 71,
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(habitSnapshotRepository.findLatestByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
    );
    expect(buildHabitSnapshotUseCase.execute).not.toHaveBeenCalled();
    expect(result.habitSnapshot.date).toBe('2026-06-02');
  });

  it('builds the current snapshot when missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(null);
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
    ).rejects.toBeInstanceOf(GetCurrentHabitsError);
  });
});
