import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { DailyCheckIn } from '../../../domain/entities/daily-check-in.entity';
import { DailyCheckInRepository } from '../../../domain/repositories/daily-check-in.repository';
import { DailyCheckInDateService } from '../../services/daily-check-in-date.service';
import { GetTodayDailyCheckInUseCase } from './get-today-daily-check-in.use-case';

describe('GetTodayDailyCheckInUseCase', () => {
  it('returns the canonical completed state for the user local day', async () => {
    const userProfileRepository = {
      findByAuthUserId: jest.fn().mockResolvedValue(buildUserProfile()),
    } as unknown as UserProfileRepository;
    const dailyCheckInRepository = {
      findByUserProfileIdAndLocalDate: jest
        .fn()
        .mockResolvedValue(buildDailyCheckIn()),
    } as unknown as DailyCheckInRepository;
    const useCase = new GetTodayDailyCheckInUseCase(
      userProfileRepository,
      dailyCheckInRepository,
      new DailyCheckInDateService(),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.completedToday).toBe(true);
    expect(result.dailyCheckIn?.localDate).toBe('2026-05-04');
    expect(
      dailyCheckInRepository.findByUserProfileIdAndLocalDate,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        userProfileId: 'profile_123',
        localDate: expect.any(String),
      }),
    );
  });

  it('returns an explicit pending state when no record exists', async () => {
    const userProfileRepository = {
      findByAuthUserId: jest.fn().mockResolvedValue(buildUserProfile()),
    } as unknown as UserProfileRepository;
    const dailyCheckInRepository = {
      findByUserProfileIdAndLocalDate: jest.fn().mockResolvedValue(null),
    } as unknown as DailyCheckInRepository;
    const useCase = new GetTodayDailyCheckInUseCase(
      userProfileRepository,
      dailyCheckInRepository,
    );

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).resolves.toEqual({ completedToday: false, dailyCheckIn: null });
  });
});

function buildUserProfile(): UserProfile {
  return new UserProfile({
    id: 'profile_123',
    authUserId: 'auth_user_123',
    name: 'Rodrigo',
    language: 'en-US',
    timezone: 'UTC',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function buildDailyCheckIn(): DailyCheckIn {
  return new DailyCheckIn({
    id: 'checkin_123',
    userProfileId: 'profile_123',
    localDate: '2026-05-04',
    timezone: 'UTC',
    energyLevel: 4,
    sleepQuality: 3,
    muscleSoreness: 2,
    motivationLevel: 5,
    createdAt: new Date('2026-05-04T10:00:00.000Z'),
    updatedAt: new Date('2026-05-04T10:00:00.000Z'),
  });
}
