import { GetHabitHistoryError } from './get-habit-history.errors';
import { GetHabitHistoryUseCase } from './get-habit-history.use-case';

describe('GetHabitHistoryUseCase', () => {
  let useCase: GetHabitHistoryUseCase;

  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let habitSnapshotRepository: { findManyByUserProfileId: jest.Mock };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    habitSnapshotRepository = {
      findManyByUserProfileId: jest.fn(),
    };

    useCase = new GetHabitHistoryUseCase(
      userProfileRepository as never,
      habitSnapshotRepository as never,
    );
  });

  it('defaults to 14 items', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(habitSnapshotRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
    expect(result.limit).toBe(14);
  });

  it('caps at 90 items', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);

    const result = await useCase.execute({
      authUserId: 'auth_123',
      limit: 90,
    });

    expect(habitSnapshotRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 90 },
    );
    expect(result.limit).toBe(90);
  });

  it('rejects invalid limits', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
        limit: 0,
      }),
    ).rejects.toBeInstanceOf(GetHabitHistoryError);
  });

  it('preserves user isolation', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_456',
    });
    habitSnapshotRepository.findManyByUserProfileId.mockResolvedValue([]);

    await useCase.execute({
      authUserId: 'auth_123',
      limit: 14,
    });

    expect(habitSnapshotRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_456',
      { limit: 14 },
    );
  });
});
