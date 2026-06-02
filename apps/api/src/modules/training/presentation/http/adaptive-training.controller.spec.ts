import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import {
  GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES,
  GetAdaptiveTrainingHistoryError,
} from '../../application/use-cases/get-adaptive-training-history/get-adaptive-training-history.errors';
import { GetAdaptiveTrainingHistoryUseCase } from '../../application/use-cases/get-adaptive-training-history/get-adaptive-training-history.use-case';
import {
  GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES,
  GetCurrentAdaptiveTrainingError,
} from '../../application/use-cases/get-current-adaptive-training/get-current-adaptive-training.errors';
import { GetCurrentAdaptiveTrainingUseCase } from '../../application/use-cases/get-current-adaptive-training/get-current-adaptive-training.use-case';
import {
  GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES,
  GetTodayAdaptiveTrainingError,
} from '../../application/use-cases/get-today-adaptive-training/get-today-adaptive-training.errors';
import { GetTodayAdaptiveTrainingUseCase } from '../../application/use-cases/get-today-adaptive-training/get-today-adaptive-training.use-case';
import { AdaptiveTrainingInfluence } from '../../domain/value-objects/adaptive-training-influence.value-object';
import { AdaptiveTrainingRecommendation } from '../../domain/entities/adaptive-training-recommendation.entity';
import { AdaptiveTrainingController } from './adaptive-training.controller';

describe('AdaptiveTrainingController', () => {
  let getTodayAdaptiveTrainingUseCase: jest.Mocked<GetTodayAdaptiveTrainingUseCase>;
  let getCurrentAdaptiveTrainingUseCase: jest.Mocked<GetCurrentAdaptiveTrainingUseCase>;
  let getAdaptiveTrainingHistoryUseCase: jest.Mocked<GetAdaptiveTrainingHistoryUseCase>;
  let controller: AdaptiveTrainingController;

  beforeEach(() => {
    getTodayAdaptiveTrainingUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTodayAdaptiveTrainingUseCase>;
    getCurrentAdaptiveTrainingUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentAdaptiveTrainingUseCase>;
    getAdaptiveTrainingHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetAdaptiveTrainingHistoryUseCase>;

    controller = new AdaptiveTrainingController(
      getTodayAdaptiveTrainingUseCase,
      getCurrentAdaptiveTrainingUseCase,
      getAdaptiveTrainingHistoryUseCase,
    );
  });

  it('returns today recommendation for the authenticated user', async () => {
    const recommendation = buildRecommendation({
      date: '2026-06-02',
      recommendationType: 'increase_intensity',
      recommendedIntensity: 'hard',
      volumeAction: 'increase',
    });

    getTodayAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: recommendation,
    });

    const result = await controller.getToday({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
      userProfileId: 'ignored',
    } as never);

    expect(getTodayAdaptiveTrainingUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.adaptiveTrainingRecommendation.date).toBe('2026-06-02');
  });

  it('returns current recommendation for the authenticated user', async () => {
    getCurrentAdaptiveTrainingUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendation: buildRecommendation(),
    });

    const result = await controller.getCurrent({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(getCurrentAdaptiveTrainingUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.adaptiveTrainingRecommendation.id).toBe('adaptive_123');
  });

  it('passes history limit to the use case', async () => {
    getAdaptiveTrainingHistoryUseCase.execute.mockResolvedValue({
      adaptiveTrainingRecommendations: [buildRecommendation()],
    });

    const result = await controller.getHistory(
      {
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      } as never,
      {
        limit: 21,
      },
    );

    expect(getAdaptiveTrainingHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 21,
    });
    expect(result.adaptiveTrainingRecommendations).toHaveLength(1);
  });

  it('maps invalid session errors to 401', async () => {
    getTodayAdaptiveTrainingUseCase.execute.mockRejectedValue(
      new GetTodayAdaptiveTrainingError(
        GET_TODAY_ADAPTIVE_TRAINING_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.getToday({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps missing profile errors to 404', async () => {
    getCurrentAdaptiveTrainingUseCase.execute.mockRejectedValue(
      new GetCurrentAdaptiveTrainingError(
        GET_CURRENT_ADAPTIVE_TRAINING_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      ),
    );

    await expect(
      controller.getCurrent({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps invalid history limit errors to 400', async () => {
    getAdaptiveTrainingHistoryUseCase.execute.mockRejectedValue(
      new GetAdaptiveTrainingHistoryError(
        GET_ADAPTIVE_TRAINING_HISTORY_ERROR_CODES.INVALID_LIMIT,
        'Invalid adaptive training history limit.',
      ),
    );

    await expect(
      controller.getHistory(
        {
          authUser: {
            id: 'auth_user_123',
            email: 'user@email.com',
          },
        } as never,
        {
          limit: 0,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps unexpected errors to 500', async () => {
    getTodayAdaptiveTrainingUseCase.execute.mockRejectedValue(
      new Error('boom'),
    );

    await expect(
      controller.getToday({
        authUser: {
          id: 'auth_user_123',
          email: 'user@email.com',
        },
      } as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('uses auth guard on all routes', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        AdaptiveTrainingController.prototype.getToday,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        AdaptiveTrainingController.prototype.getCurrent,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        AdaptiveTrainingController.prototype.getHistory,
      ),
    ).toContain(AuthSessionGuard);
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
