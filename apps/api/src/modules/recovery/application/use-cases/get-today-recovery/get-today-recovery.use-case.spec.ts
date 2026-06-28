import { RecoverySnapshot } from '../../../domain/entities/recovery-snapshot.entity';
import { RecoverySnapshotRepository } from '../../../domain/repositories/recovery-snapshot.repository';
import { RecoveryDateService } from '../../services/recovery-date.service';
import { BuildRecoverySnapshotUseCase } from '../build-recovery-snapshot/build-recovery-snapshot.use-case';
import { GetTodayRecoveryError } from './get-today-recovery.errors';
import { GET_TODAY_RECOVERY_ERROR_CODES } from './get-today-recovery.errors';
import { GetTodayRecoveryUseCase } from './get-today-recovery.use-case';
import { UserProfile } from '../../../../users/domain/entities/user-profile.entity';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';

describe('GetTodayRecoveryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let recoverySnapshotRepository: jest.Mocked<RecoverySnapshotRepository>;
  let buildRecoverySnapshotUseCase: jest.Mocked<BuildRecoverySnapshotUseCase>;
  let recoveryDateService: RecoveryDateService;
  let useCase: GetTodayRecoveryUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-02T10:00:00.000Z'));

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
    recoveryDateService = new RecoveryDateService();

    useCase = new GetTodayRecoveryUseCase(
      userProfileRepository,
      recoverySnapshotRepository,
      buildRecoverySnapshotUseCase,
      recoveryDateService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the existing snapshot for today', async () => {
    arrangeUserProfile();
    const snapshot = buildSnapshot();
    recoverySnapshotRepository.findByUserProfileIdAndDate.mockResolvedValue(
      snapshot,
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(result.recoverySnapshot).toBe(snapshot);
    expect(buildRecoverySnapshotUseCase.execute).not.toHaveBeenCalled();
  });

  it('builds a snapshot when today snapshot does not exist', async () => {
    arrangeUserProfile();
    recoverySnapshotRepository.findByUserProfileIdAndDate.mockResolvedValue(
      null,
    );
    const snapshot = buildSnapshot();
    buildRecoverySnapshotUseCase.execute.mockResolvedValue({
      recoverySnapshot: snapshot,
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(buildRecoverySnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      date: '2026-06-02',
    });
    expect(result.recoverySnapshot).toBe(snapshot);
  });

  it('is idempotent across repeated reads', async () => {
    arrangeUserProfile();
    const snapshot = buildSnapshot();
    recoverySnapshotRepository.findByUserProfileIdAndDate
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(snapshot);
    buildRecoverySnapshotUseCase.execute.mockResolvedValue({
      recoverySnapshot: snapshot,
    });

    const first = await useCase.execute({ authUserId: 'auth_user_123' });
    const second = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(first.recoverySnapshot.date).toBe('2026-06-02');
    expect(second.recoverySnapshot).toBe(snapshot);
    expect(buildRecoverySnapshotUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('fails when user profile does not exist', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toMatchObject({
      code: GET_TODAY_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
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

  function buildSnapshot(): RecoverySnapshot {
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
    });
  }
});
