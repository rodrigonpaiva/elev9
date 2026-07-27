import { RecoverySnapshot } from '../../../domain/entities/recovery-snapshot.entity';
import { RecoverySnapshotRepository } from '../../../domain/repositories/recovery-snapshot.repository';
import { BuildRecoverySnapshotUseCase } from '../build-recovery-snapshot/build-recovery-snapshot.use-case';
import { GET_CURRENT_RECOVERY_ERROR_CODES } from './get-current-recovery.errors';
import { GetCurrentRecoveryUseCase } from './get-current-recovery.use-case';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { DailyCheckIn } from '../../../../progress/domain/entities/daily-check-in.entity';
import { DailyCheckInRepository } from '../../../../progress/domain/repositories/daily-check-in.repository';

describe('GetCurrentRecoveryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let recoverySnapshotRepository: jest.Mocked<RecoverySnapshotRepository>;
  let buildRecoverySnapshotUseCase: jest.Mocked<BuildRecoverySnapshotUseCase>;
  let dailyCheckInRepository: jest.Mocked<DailyCheckInRepository>;
  let useCase: GetCurrentRecoveryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    recoverySnapshotRepository = {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      upsertDailySnapshot: jest.fn(),
    } as unknown as jest.Mocked<RecoverySnapshotRepository>;
    buildRecoverySnapshotUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildRecoverySnapshotUseCase>;
    dailyCheckInRepository = {
      findByUserProfileIdAndLocalDate: jest.fn(),
    } as unknown as jest.Mocked<DailyCheckInRepository>;

    useCase = new GetCurrentRecoveryUseCase(
      userProfileRepository,
      recoverySnapshotRepository,
      buildRecoverySnapshotUseCase,
    );
  });

  it('returns the latest snapshot when one exists', async () => {
    arrangeUserProfile();
    const snapshot = buildSnapshot({ date: '2026-06-01' });
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      snapshot,
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.recoverySnapshot).toBe(snapshot);
    expect(buildRecoverySnapshotUseCase.execute).not.toHaveBeenCalled();
  });

  it('builds a snapshot when there is no current snapshot', async () => {
    arrangeUserProfile();
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    const snapshot = buildSnapshot({ date: '2026-06-02' });
    buildRecoverySnapshotUseCase.execute.mockResolvedValue({
      recoverySnapshot: snapshot,
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(buildRecoverySnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.recoverySnapshot).toBe(snapshot);
  });

  it('rebuilds when the current check-in is newer than the latest snapshot', async () => {
    arrangeUserProfile();
    recoverySnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      buildSnapshot({
        sourceContext: {
          formulaVersion: 'recovery-deterministic-v1',
          generatedAt: '2026-06-02T09:00:00.000Z',
        },
      }),
    );
    dailyCheckInRepository.findByUserProfileIdAndLocalDate.mockResolvedValue(
      new DailyCheckIn({
        id: 'check-in-123',
        userProfileId: 'profile_123',
        localDate: '2026-06-02',
        timezone: 'UTC',
        energyLevel: 2,
        sleepQuality: 2,
        muscleSoreness: 4,
        motivationLevel: 2,
        createdAt: new Date('2026-06-02T08:00:00.000Z'),
        updatedAt: new Date('2026-06-02T10:00:00.000Z'),
      }),
    );
    const rebuiltSnapshot = buildSnapshot({ readinessScore: 35 });
    buildRecoverySnapshotUseCase.execute.mockResolvedValue({
      recoverySnapshot: rebuiltSnapshot,
    });

    const useCaseWithFreshness = new GetCurrentRecoveryUseCase(
      userProfileRepository,
      recoverySnapshotRepository,
      buildRecoverySnapshotUseCase,
      dailyCheckInRepository,
    );

    const result = await useCaseWithFreshness.execute({
      authUserId: 'auth_user_123',
    });

    expect(buildRecoverySnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.recoverySnapshot).toBe(rebuiltSnapshot);
  });

  it('fails when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_CURRENT_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  function arrangeUserProfile(): void {
    userProfileRepository.findByAuthUserId.mockResolvedValue(
      new UserProfile({
        id: 'profile_123',
        authUserId: 'auth_user_123',
        name: 'Rodrigo Paiva',
        language: 'en-US',
        timezone: 'UTC',
        status: 'active',
        createdAt: new Date('2026-05-18T09:00:00.000Z'),
        updatedAt: new Date('2026-05-18T09:00:00.000Z'),
      }),
    );
  }

  function buildSnapshot(
    overrides: Partial<ConstructorParameters<typeof RecoverySnapshot>[0]> = {},
  ): RecoverySnapshot {
    return new RecoverySnapshot({
      userProfileId: 'profile_123',
      date: '2026-06-02',
      readinessScore: 82,
      fatigueScore: 24,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      influences: [],
      formulaVersion: 'recovery-deterministic-v1',
      sourceContext: {},
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      ...overrides,
    });
  }
});
