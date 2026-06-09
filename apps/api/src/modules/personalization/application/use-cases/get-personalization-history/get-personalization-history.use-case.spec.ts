import { GetPersonalizationHistoryError } from './get-personalization-history.errors';
import { GET_PERSONALIZATION_HISTORY_ERROR_CODES } from './get-personalization-history.errors';
import { GetPersonalizationHistoryUseCase } from './get-personalization-history.use-case';

describe('GetPersonalizationHistoryUseCase', () => {
  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let personalizationSnapshotRepository: { findManyByUserProfileId: jest.Mock };
  let useCase: GetPersonalizationHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = { findByAuthUserId: jest.fn() };
    personalizationSnapshotRepository = { findManyByUserProfileId: jest.fn() };

    userProfileRepository.findByAuthUserId.mockResolvedValue({ id: 'profile_123' });
    personalizationSnapshotRepository.findManyByUserProfileId.mockResolvedValue([
      buildSnapshot('snapshot_1'),
    ]);

    useCase = new GetPersonalizationHistoryUseCase(
      userProfileRepository as never,
      personalizationSnapshotRepository as never,
    );
  });

  it('uses the default limit of 14', async () => {
    const result = await useCase.execute({ authUserId: 'auth_123' });

    expect(personalizationSnapshotRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
    expect(result.limit).toBe(14);
  });

  it('accepts the maximum limit of 90', async () => {
    await useCase.execute({ authUserId: 'auth_123', limit: 90 });

    expect(personalizationSnapshotRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 90 },
    );
  });

  it('rejects invalid limits', async () => {
    await expect(
      useCase.execute({ authUserId: 'auth_123', limit: 0 }),
    ).rejects.toMatchObject({
      code: GET_PERSONALIZATION_HISTORY_ERROR_CODES.INVALID_LIMIT,
    });
  });

  it('uses the resolved user profile for isolation', async () => {
    await useCase.execute({ authUserId: 'auth_123' });

    expect(userProfileRepository.findByAuthUserId).toHaveBeenCalledWith(
      'auth_123',
    );
    expect(personalizationSnapshotRepository.findManyByUserProfileId).toHaveBeenCalledWith(
      'profile_123',
      { limit: 14 },
    );
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_123' }),
    ).rejects.toMatchObject({
      code: GET_PERSONALIZATION_HISTORY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
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
