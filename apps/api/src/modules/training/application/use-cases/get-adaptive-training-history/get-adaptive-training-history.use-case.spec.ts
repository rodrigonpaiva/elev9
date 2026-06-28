import { GetAdaptiveTrainingHistoryError } from './get-adaptive-training-history.errors';
import { GetAdaptiveTrainingHistoryUseCase } from './get-adaptive-training-history.use-case';
import { AdaptiveTrainingRecommendationRepository } from '../../../domain/repositories/adaptive-training-recommendation.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { AdaptiveTrainingRecommendation } from '../../../domain/entities/adaptive-training-recommendation.entity';
import { AdaptiveTrainingInfluence } from '../../../domain/value-objects/adaptive-training-influence.value-object';

describe('GetAdaptiveTrainingHistoryUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let adaptiveTrainingRecommendationRepository: jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  let useCase: GetAdaptiveTrainingHistoryUseCase;

  beforeEach(() => {
    userProfileRepository = {
      findByAuthUserId: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserProfileRepository>;
    adaptiveTrainingRecommendationRepository = {
      findByUserProfileIdAndDate: jest.fn(),
      findLatestByUserProfileId: jest.fn(),
      findManyByUserProfileId: jest.fn(),
      findRecentByUserProfileId: jest.fn(),
      upsertDailyRecommendation: jest.fn(),
    } as unknown as jest.Mocked<AdaptiveTrainingRecommendationRepository>;

    useCase = new GetAdaptiveTrainingHistoryUseCase(
      userProfileRepository,
      adaptiveTrainingRecommendationRepository,
    );
  });

  it('returns the ordered history', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    adaptiveTrainingRecommendationRepository.findRecentByUserProfileId.mockResolvedValue(
      [buildRecommendation({ date: '2026-06-02' })],
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationRepository.findRecentByUserProfileId,
    ).toHaveBeenCalledWith('profile_123', { limit: 14 });
    expect(result.adaptiveTrainingRecommendations).toHaveLength(1);
  });

  it('applies the maximum limit', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    adaptiveTrainingRecommendationRepository.findRecentByUserProfileId.mockResolvedValue(
      [],
    );

    await useCase.execute({ authUserId: 'auth_user_123', limit: 90 });

    expect(
      adaptiveTrainingRecommendationRepository.findRecentByUserProfileId,
    ).toHaveBeenCalledWith('profile_123', { limit: 90 });
  });

  it('rejects invalid limits', async () => {
    await expect(
      useCase.execute({ authUserId: 'auth_user_123', limit: 0 }),
    ).rejects.toBeInstanceOf(GetAdaptiveTrainingHistoryError);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toBeInstanceOf(GetAdaptiveTrainingHistoryError);
  });

  function buildRecommendation(
    overrides: Partial<AdaptiveTrainingRecommendation> = {},
  ): AdaptiveTrainingRecommendation {
    return new AdaptiveTrainingRecommendation({
      id: 'adaptive_123',
      userProfileId: 'profile_123',
      trainingPlanId: 'training_123',
      date: '2026-06-02',
      recommendationType: 'maintain',
      recommendedIntensity: 'moderate',
      volumeAction: 'maintain',
      reasoning: 'Balanced training signals.',
      influences: [
        new AdaptiveTrainingInfluence({
          code: 'HIGH_READINESS',
          label: 'Readiness is high.',
          impact: 'positive',
          weight: 0.2,
          value: 82,
        }),
      ],
      sourceContext: {
        readinessScore: 82,
      },
      formulaVersion: 'adaptive-training-deterministic-v1',
      generatedBy: 'deterministic',
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
      ...overrides,
    });
  }
});
