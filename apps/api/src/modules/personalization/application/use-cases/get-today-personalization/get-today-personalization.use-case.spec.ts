import { BuildPersonalizationSnapshotUseCase } from '../build-personalization-snapshot/build-personalization-snapshot.use-case';
import { GetTodayPersonalizationError } from './get-today-personalization.errors';
import { GET_TODAY_PERSONALIZATION_ERROR_CODES } from './get-today-personalization.errors';
import { GetTodayPersonalizationUseCase } from './get-today-personalization.use-case';

describe('GetTodayPersonalizationUseCase', () => {
  let userProfileRepository: {
    findByAuthUserId: jest.Mock;
  };
  let personalizationSnapshotRepository: {
    findByUserProfileIdAndDate: jest.Mock;
  };
  let buildPersonalizationSnapshotUseCase: {
    execute: jest.Mock;
  };
  let platformDateService: {
    getTodayDateString: jest.Mock;
  };
  let useCase: GetTodayPersonalizationUseCase;

  beforeEach(() => {
    userProfileRepository = { findByAuthUserId: jest.fn() };
    personalizationSnapshotRepository = {
      findByUserProfileIdAndDate: jest.fn(),
    };
    buildPersonalizationSnapshotUseCase = { execute: jest.fn() };
    platformDateService = {
      getTodayDateString: jest.fn().mockReturnValue('2026-06-03'),
    };

    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    personalizationSnapshotRepository.findByUserProfileIdAndDate.mockResolvedValue(
      null,
    );
    buildPersonalizationSnapshotUseCase.execute.mockResolvedValue({
      personalizationSnapshot: buildSnapshot('snapshot_built'),
    });

    useCase = new GetTodayPersonalizationUseCase(
      userProfileRepository as never,
      personalizationSnapshotRepository as never,
      buildPersonalizationSnapshotUseCase as never,
      platformDateService as never,
    );
  });

  it('returns the existing today snapshot when available', async () => {
    personalizationSnapshotRepository.findByUserProfileIdAndDate.mockResolvedValue(
      buildSnapshot('snapshot_existing'),
    );

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(platformDateService.getTodayDateString).toHaveBeenCalled();
    expect(buildPersonalizationSnapshotUseCase.execute).not.toHaveBeenCalled();
    expect(
      personalizationSnapshotRepository.findByUserProfileIdAndDate,
    ).toHaveBeenCalledWith('profile_123', '2026-06-03');
    expect(result.personalizationSnapshot.id).toBe('snapshot_existing');
  });

  it('builds the today snapshot when missing', async () => {
    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(buildPersonalizationSnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.personalizationSnapshot.id).toBe('snapshot_built');
  });

  it('is idempotent when called repeatedly for the same day', async () => {
    personalizationSnapshotRepository.findByUserProfileIdAndDate.mockResolvedValue(
      buildSnapshot('snapshot_existing'),
    );

    await useCase.execute({ authUserId: 'auth_123' });
    await useCase.execute({ authUserId: 'auth_123' });

    expect(buildPersonalizationSnapshotUseCase.execute).not.toHaveBeenCalled();
    expect(
      personalizationSnapshotRepository.findByUserProfileIdAndDate,
    ).toHaveBeenCalledTimes(2);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: GET_TODAY_PERSONALIZATION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
    });
  });
});

function buildSnapshot(id: string) {
  return {
    id,
    userProfileId: 'profile_123',
    date: '2026-06-03',
    preferredCoachingStyle: { value: 'balanced' },
    engagementProfile: { value: 'medium' },
    notificationResponsiveness: { value: 'medium' },
    goalResponsiveness: { value: 'medium' },
    recoveryResponsiveness: { value: 'medium' },
    habitResponsiveness: { value: 'medium' },
    riskOfDisengagement: { value: 'medium' },
    trend: { value: 'stable' },
    sourceContext: {
      formulaVersion: 'personalization-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
    },
    formulaVersion: 'personalization-engine-v1',
    generatedAt: '2026-06-03T00:00:00.000Z',
  } as never;
}
