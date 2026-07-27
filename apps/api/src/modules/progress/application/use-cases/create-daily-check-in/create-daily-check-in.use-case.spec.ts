import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { BuildRecoverySnapshotUseCase } from '../../../../recovery/application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case';
import { DailyCheckIn } from '../../../domain/entities/daily-check-in.entity';
import { DailyCheckInRepository } from '../../../domain/repositories/daily-check-in.repository';
import { CREATE_DAILY_CHECK_IN_ERROR_CODES } from './create-daily-check-in.errors';
import { CreateDailyCheckInUseCase } from './create-daily-check-in.use-case';

describe('CreateDailyCheckInUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let useCase: CreateDailyCheckInUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    };
    dailyCheckInRepository = {
      upsert: jest.fn(),
      findByUserProfileIdAndLocalDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
    };

    useCase = new CreateDailyCheckInUseCase(
      userProfileRepository,
      dailyCheckInRepository,
    );
  });

  it('creates a daily check-in successfully', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    dailyCheckInRepository.upsert.mockResolvedValue(
      new DailyCheckIn({
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
      }),
    );

    const result = await useCase.execute({
      authUserId: 'auth_user_123',
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    expect(result.dailyCheckIn).toMatchObject({
      id: 'checkin_123',
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });
  });

  it('fails when user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_user_123',
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
      }),
    ).rejects.toMatchObject({
      code: CREATE_DAILY_CHECK_IN_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  it('persists the daily check-in with the resolved user profile', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    dailyCheckInRepository.upsert.mockResolvedValue(
      new DailyCheckIn({
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
      }),
    );

    await useCase.execute({
      authUserId: 'auth_user_123',
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    expect(dailyCheckInRepository.upsert).toHaveBeenCalledWith({
      userProfileId: 'profile_123',
      localDate: expect.any(String),
      timezone: 'UTC',
      legacyDayStart: expect.any(Date),
      legacyDayEnd: expect.any(Date),
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });
  });

  it('recalculates Recovery synchronously after the canonical write', async () => {
    const buildRecoverySnapshotUseCase = {
      execute: jest.fn().mockResolvedValue({ recoverySnapshot: {} }),
    } as unknown as jest.Mocked<BuildRecoverySnapshotUseCase>;
    const recoveryAwareUseCase = new CreateDailyCheckInUseCase(
      userProfileRepository,
      dailyCheckInRepository,
      undefined,
      buildRecoverySnapshotUseCase,
    );
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    dailyCheckInRepository.upsert.mockResolvedValue(
      new DailyCheckIn({
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
      }),
    );

    await recoveryAwareUseCase.execute({
      authUserId: 'auth_user_123',
      energyLevel: 4,
      sleepQuality: 3,
      muscleSoreness: 2,
      motivationLevel: 5,
    });

    expect(buildRecoverySnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      date: expect.any(String),
    });
  });

  it('returns a stable error when Recovery recalculation fails after persistence', async () => {
    const buildRecoverySnapshotUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('recovery unavailable')),
    } as unknown as jest.Mocked<BuildRecoverySnapshotUseCase>;
    const recoveryAwareUseCase = new CreateDailyCheckInUseCase(
      userProfileRepository,
      dailyCheckInRepository,
      undefined,
      buildRecoverySnapshotUseCase,
    );
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      buildUserProfile(),
    );
    dailyCheckInRepository.upsert.mockResolvedValue(
      new DailyCheckIn({
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
      }),
    );

    await expect(
      recoveryAwareUseCase.execute({
        authUserId: 'auth_user_123',
        energyLevel: 4,
        sleepQuality: 3,
        muscleSoreness: 2,
        motivationLevel: 5,
      }),
    ).rejects.toMatchObject({
      code: 'DAILY_CHECK_IN_RECOVERY_RECALCULATION_FAILED',
    });
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
