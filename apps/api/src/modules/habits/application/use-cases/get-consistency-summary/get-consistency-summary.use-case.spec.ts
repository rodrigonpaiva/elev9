import { GetConsistencySummaryError } from './get-consistency-summary.errors';
import { GetConsistencySummaryUseCase } from './get-consistency-summary.use-case';

describe('GetConsistencySummaryUseCase', () => {
  let useCase: GetConsistencySummaryUseCase;

  let userProfileRepository: { findByAuthUserId: jest.Mock };
  let consistencySummaryRepository: { findByUserProfileId: jest.Mock };
  let buildConsistencySummaryUseCase: { execute: jest.Mock };

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
    };
    consistencySummaryRepository = {
      findByUserProfileId: jest.fn(),
    };
    buildConsistencySummaryUseCase = {
      execute: jest.fn(),
    };

    useCase = new GetConsistencySummaryUseCase(
      userProfileRepository as never,
      consistencySummaryRepository as never,
      buildConsistencySummaryUseCase as never,
    );
  });

  it('returns an existing summary', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue({
      score: 72,
      riskLevel: { value: 'medium' },
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(
      consistencySummaryRepository.findByUserProfileId,
    ).toHaveBeenCalledWith('profile_123');
    expect(buildConsistencySummaryUseCase.execute).not.toHaveBeenCalled();
    expect(result.consistencySummary.score).toBe(72);
  });

  it('builds a summary when missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    });
    consistencySummaryRepository.findByUserProfileId.mockResolvedValue(null);
    buildConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: {
        score: 81,
        trend: { value: 'improving' },
      },
    });

    const result = await useCase.execute({
      authUserId: 'auth_123',
    });

    expect(buildConsistencySummaryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.consistencySummary.score).toBe(81);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({
        authUserId: 'auth_123',
      }),
    ).rejects.toBeInstanceOf(GetConsistencySummaryError);
  });
});
