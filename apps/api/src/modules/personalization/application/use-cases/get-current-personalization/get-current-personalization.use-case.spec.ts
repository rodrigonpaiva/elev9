import { GetCurrentPersonalizationError } from './get-current-personalization.errors';
import { GET_CURRENT_PERSONALIZATION_ERROR_CODES } from './get-current-personalization.errors';
import { GetCurrentPersonalizationUseCase } from './get-current-personalization.use-case';

describe('GetCurrentPersonalizationUseCase', () => {
  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let personalizationSnapshotRepository: {
    findLatestByUserProfileId: jest.Mock;
  };
  let buildPersonalizationSnapshotUseCase: { execute: jest.Mock };
  let useCase: GetCurrentPersonalizationUseCase;

  beforeEach(() => {
    userProfileRepository = { findByAuthUserId: jest.fn() };
    personalizationSnapshotRepository = {
      findLatestByUserProfileId: jest.fn(),
    };
    buildPersonalizationSnapshotUseCase = { execute: jest.fn() };

    userProfileRepository.findByAuthUserId.mockResolvedValue({ id: 'profile_123' });
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(null);
    buildPersonalizationSnapshotUseCase.execute.mockResolvedValue({
      personalizationSnapshot: buildSnapshot('snapshot_built'),
    });

    useCase = new GetCurrentPersonalizationUseCase(
      userProfileRepository as never,
      personalizationSnapshotRepository as never,
      buildPersonalizationSnapshotUseCase as never,
    );
  });

  it('returns the latest snapshot when available', async () => {
    personalizationSnapshotRepository.findLatestByUserProfileId.mockResolvedValue(
      buildSnapshot('snapshot_latest'),
    );

    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(
      buildPersonalizationSnapshotUseCase.execute,
    ).not.toHaveBeenCalled();
    expect(result.personalizationSnapshot.id).toBe('snapshot_latest');
  });

  it('builds when the latest snapshot is missing', async () => {
    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(buildPersonalizationSnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.personalizationSnapshot.id).toBe('snapshot_built');
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: GET_CURRENT_PERSONALIZATION_ERROR_CODES.USER_PROFILE_NOT_FOUND,
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
