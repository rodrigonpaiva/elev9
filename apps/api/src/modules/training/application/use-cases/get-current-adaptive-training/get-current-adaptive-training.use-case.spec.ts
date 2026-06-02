import { GetCurrentAdaptiveTrainingError } from './get-current-adaptive-training.errors';
import { GetCurrentAdaptiveTrainingUseCase } from './get-current-adaptive-training.use-case';
import { BuildAdaptiveTrainingRecommendationUseCase } from '../build-adaptive-training-recommendation/build-adaptive-training-recommendation.use-case';
import { AdaptiveTrainingRecommendationRepository } from '../../../domain/repositories/adaptive-training-recommendation.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { AdaptiveTrainingRecommendation } from '../../../domain/entities/adaptive-training-recommendation.entity';
import { AdaptiveTrainingInfluence } from '../../../domain/value-objects/adaptive-training-influence.value-object';

describe('GetCurrentAdaptiveTrainingUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let adaptiveTrainingRecommendationRepository: jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  let buildAdaptiveTrainingRecommendationUseCase: jest.Mocked<BuildAdaptiveTrainingRecommendationUseCase>;
  let useCase: GetCurrentAdaptiveTrainingUseCase;

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
    buildAdaptiveTrainingRecommendationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildAdaptiveTrainingRecommendationUseCase>;

    useCase = new GetCurrentAdaptiveTrainingUseCase(
      userProfileRepository,
      adaptiveTrainingRecommendationRepository,
      buildAdaptiveTrainingRecommendationUseCase,
    );
  });

  it('returns the latest recommendation', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    adaptiveTrainingRecommendationRepository.findLatestByUserProfileId.mockResolvedValue(
      buildRecommendation({ date: '2026-06-02' }),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationRepository.findLatestByUserProfileId,
    ).toHaveBeenCalledWith('profile_123');
    expect(buildAdaptiveTrainingRecommendationUseCase.execute).not.toHaveBeenCalled();
    expect(result.adaptiveTrainingRecommendation.date).toBe('2026-06-02');
  });

  it('builds a recommendation when no latest exists', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    adaptiveTrainingRecommendationRepository.findLatestByUserProfileId.mockResolvedValue(
      null,
    );
    buildAdaptiveTrainingRecommendationUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: buildRecommendation(),
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(buildAdaptiveTrainingRecommendationUseCase.execute).toHaveBeenCalledWith(
      {
        authUserId: 'auth_user_123',
      },
    );
    expect(result.adaptiveTrainingRecommendation.id).toBe('adaptive_123');
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toBeInstanceOf(GetCurrentAdaptiveTrainingError);
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
