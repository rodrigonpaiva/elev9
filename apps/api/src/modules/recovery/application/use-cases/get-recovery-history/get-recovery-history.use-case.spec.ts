import { RecoverySnapshot } from '../../../domain/entities/recovery-snapshot.entity';
import { RecoverySnapshotRepository } from '../../../domain/repositories/recovery-snapshot.repository';
import { GET_RECOVERY_HISTORY_ERROR_CODES } from './get-recovery-history.errors';
import { GetRecoveryHistoryUseCase } from './get-recovery-history.use-case';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('GetRecoveryHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let recoverySnapshotRepository: jest.Mocked<RecoverySnapshotRepository>;
  let useCase: GetRecoveryHistoryUseCase;

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

    useCase = new GetRecoveryHistoryUseCase(
      userProfileRepository,
      recoverySnapshotRepository,
    );
  });

  it('returns ordered history with the default limit of 14', async () => {
    arrangeUserProfile();
    const snapshots = [buildSnapshot('2026-06-02'), buildSnapshot('2026-06-01')];
    recoverySnapshotRepository.findRecentByUserProfileId.mockResolvedValue(
      snapshots,
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(recoverySnapshotRepository.findRecentByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
    expect(result.recoverySnapshots).toEqual(snapshots);
  });

  it('accepts the max limit of 90', async () => {
    arrangeUserProfile();
    recoverySnapshotRepository.findRecentByUserProfileId.mockResolvedValue([]);

    await useCase.execute({ authUserId: 'auth_user_123', limit: 90 });

    expect(recoverySnapshotRepository.findRecentByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 90 },
    );
  });

  it('rejects limit values above 90', async () => {
    arrangeUserProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123', limit: 91 }),
    ).rejects.toMatchObject({
      code: GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_LIMIT,
    });
  });

  it('rejects invalid limit values', async () => {
    arrangeUserProfile();

    await expect(
      useCase.execute({ authUserId: 'auth_user_123', limit: 0 }),
    ).rejects.toMatchObject({
      code: GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_LIMIT,
    });
  });

  it('isolates history by user profile', async () => {
    arrangeUserProfile({ id: 'profile_real' });
    recoverySnapshotRepository.findRecentByUserProfileId.mockResolvedValue([]);

    await useCase.execute({ authUserId: 'auth_user_real' });

    expect(recoverySnapshotRepository.findRecentByUserProfileId).toHaveBeenCalledWith(
      'profile_real',
      { limit: 14 },
    );
  });

  it('fails when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_RECOVERY_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });

  function arrangeUserProfile(
    overrides: Partial<ConstructorParameters<typeof UserProfile>[0]> = {},
  ): void {
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
        ...overrides,
      }),
    );
  }

  function buildSnapshot(date: string): RecoverySnapshot {
    return new RecoverySnapshot({
      userProfileId: 'profile_123',
      date,
      readinessScore: 82,
      fatigueScore: 24,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      influences: [],
      formulaVersion: 'recovery-deterministic-v1',
      sourceContext: {},
      createdAt: new Date(`${date}T10:00:00.000Z`),
    });
  }
});
