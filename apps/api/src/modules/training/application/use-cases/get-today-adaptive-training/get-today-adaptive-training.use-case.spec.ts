import { GetTodayAdaptiveTrainingError } from './get-today-adaptive-training.errors';
import { GetTodayAdaptiveTrainingUseCase } from './get-today-adaptive-training.use-case';
import { AdaptiveTrainingDateService } from '../../services/adaptive-training-date.service';
import { BuildAdaptiveTrainingRecommendationUseCase } from '../build-adaptive-training-recommendation/build-adaptive-training-recommendation.use-case';
import { AdaptiveTrainingRecommendationRepository } from '../../../domain/repositories/adaptive-training-recommendation.repository';
import { UserProfileRepository } from '../../../../users/domain/repositories/user-profile.repository';
import { AdaptiveTrainingRecommendation } from '../../../domain/entities/adaptive-training-recommendation.entity';
import { AdaptiveTrainingInfluence } from '../../../domain/value-objects/adaptive-training-influence.value-object';

describe('GetTodayAdaptiveTrainingUseCase', () => {
  let userProfileRepository: jest.Mocked<UserProfileRepository>;
  let adaptiveTrainingRecommendationRepository: jest.Mocked<AdaptiveTrainingRecommendationRepository>;
  let buildAdaptiveTrainingRecommendationUseCase: jest.Mocked<BuildAdaptiveTrainingRecommendationUseCase>;
  let adaptiveTrainingDateService: jest.Mocked<AdaptiveTrainingDateService>;
  let useCase: GetTodayAdaptiveTrainingUseCase;

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
    adaptiveTrainingDateService = {
      todayUtcDateString: jest.fn(),
    } as unknown as jest.Mocked<AdaptiveTrainingDateService>;

    useCase = new GetTodayAdaptiveTrainingUseCase(
      userProfileRepository,
      adaptiveTrainingRecommendationRepository,
      buildAdaptiveTrainingRecommendationUseCase,
      adaptiveTrainingDateService,
    );
  });

  it('returns the existing recommendation for the day', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    adaptiveTrainingDateService.todayUtcDateString.mockReturnValue(
      '2026-06-02',
    );
    adaptiveTrainingRecommendationRepository.findByUserProfileIdAndDate.mockResolvedValue(
      buildRecommendation({ date: '2026-06-02' }),
    );

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationRepository.findByUserProfileIdAndDate,
    ).toHaveBeenCalledWith('profile_123', '2026-06-02');
    expect(
      buildAdaptiveTrainingRecommendationUseCase.execute,
    ).not.toHaveBeenCalled();
    expect(result.adaptiveTrainingRecommendation.date).toBe('2026-06-02');
  });

  it('builds the recommendation when none exists', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    adaptiveTrainingDateService.todayUtcDateString.mockReturnValue(
      '2026-06-02',
    );
    adaptiveTrainingRecommendationRepository.findByUserProfileIdAndDate.mockResolvedValue(
      null,
    );
    buildAdaptiveTrainingRecommendationUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: buildRecommendation({
        date: '2026-06-02',
      }),
    });

    const result = await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      buildAdaptiveTrainingRecommendationUseCase.execute,
    ).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.adaptiveTrainingRecommendation.date).toBe('2026-06-02');
  });

  it('is idempotent for the same day', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue({
      id: 'profile_123',
    } as never);
    adaptiveTrainingDateService.todayUtcDateString.mockReturnValue(
      '2026-06-02',
    );
    adaptiveTrainingRecommendationRepository.findByUserProfileIdAndDate.mockResolvedValue(
      null,
    );
    buildAdaptiveTrainingRecommendationUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: buildRecommendation({
        date: '2026-06-02',
      }),
    });

    await useCase.execute({ authUserId: 'auth_user_123' });
    await useCase.execute({ authUserId: 'auth_user_123' });

    expect(
      adaptiveTrainingRecommendationRepository.findByUserProfileIdAndDate,
    ).toHaveBeenCalledTimes(2);
    expect(
      buildAdaptiveTrainingRecommendationUseCase.execute,
    ).toHaveBeenCalledTimes(2);
  });

  it('throws when the user profile is missing', async () => {
    userProfileRepository.findByAuthUserId.mockResolvedValue(null);

    await expect(
      useCase.execute({ authUserId: 'auth_user_123' }),
    ).rejects.toBeInstanceOf(GetTodayAdaptiveTrainingError);
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
