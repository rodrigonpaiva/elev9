import {
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import {
  COACH_INTELLIGENCE_ERROR_CODES,
  GetCoachIntelligenceError,
} from '../../application/services/coach-intelligence/coach-intelligence.errors';
import { GetCoachIntelligenceUseCase } from '../../application/use-cases/get-coach-intelligence/get-coach-intelligence.use-case';
import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { buildCoachIntelligenceAggregateFixture } from '../../../../../test/fixtures/coach-intelligence.fixture';
import type { CoachIntelligenceAggregate } from '@elev9/types';
import { CoachIntelligenceController } from './coach-intelligence.controller';

describe('CoachIntelligenceController', () => {
  let getCoachIntelligenceUseCase: jest.Mocked<GetCoachIntelligenceUseCase>;
  let controller: CoachIntelligenceController;

  beforeEach(() => {
    getCoachIntelligenceUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCoachIntelligenceUseCase>;

    controller = new CoachIntelligenceController(getCoachIntelligenceUseCase);
  });

  it('protects the route with AuthSessionGuard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      CoachIntelligenceController.prototype.getCoachIntelligence,
    ) as readonly unknown[] | undefined;

    expect(guards).toEqual(expect.arrayContaining([AuthSessionGuard]));
  });

  it('returns the canonical aggregate unchanged and forwards request correlation data', async () => {
    const aggregate = buildCoachIntelligenceAggregateFixture();
    getCoachIntelligenceUseCase.execute.mockResolvedValue(aggregate as never);

    const result = await controller.getCoachIntelligence({
      authUser: {
        id: 'auth_123',
        email: 'coach@example.com',
      },
      requestId: 'request_123',
    } as never);

    expect(getCoachIntelligenceUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
      requestId: 'request_123',
    });
    expect(result).toBe(aggregate);
  });

  it.each([
    [
      'partial',
      (aggregate: CoachIntelligenceAggregate): CoachIntelligenceAggregate =>
        ({
          ...aggregate,
          availability: {
            ...aggregate.availability,
            status: 'degraded',
            fallbackUsed: true,
            retryable: true,
            reasonCode: 'PARTIAL_FAILURE',
          },
          metadata: {
            ...aggregate.metadata,
            partialResult: true,
            fallbackUsed: true,
          },
        }) satisfies CoachIntelligenceAggregate,
    ],
    [
      'stale',
      (aggregate: CoachIntelligenceAggregate): CoachIntelligenceAggregate =>
        ({
          ...aggregate,
          availability: {
            ...aggregate.availability,
            status: 'stale',
            fallbackUsed: false,
            retryable: false,
            reasonCode: 'STALE_CONTEXT',
          },
          freshness: {
            ...aggregate.freshness,
            status: 'stale',
          },
        }) satisfies CoachIntelligenceAggregate,
    ],
    [
      'degraded',
      (aggregate: CoachIntelligenceAggregate): CoachIntelligenceAggregate =>
        ({
          ...aggregate,
          availability: {
            ...aggregate.availability,
            status: 'degraded',
            fallbackUsed: true,
            retryable: true,
            reasonCode: 'SOURCE_UNAVAILABLE',
          },
          metadata: {
            ...aggregate.metadata,
            partialResult: true,
            fallbackUsed: true,
          },
        }) satisfies CoachIntelligenceAggregate,
    ],
  ])('returns %s aggregates as 200 and unchanged', async (_label, mutate) => {
    const aggregate = mutate(buildCoachIntelligenceAggregateFixture());
    getCoachIntelligenceUseCase.execute.mockResolvedValue(aggregate as never);

    const result = await controller.getCoachIntelligence({
      authUser: {
        id: 'auth_123',
        email: 'coach@example.com',
      },
      requestId: 'request_123',
    } as never);

    expect(result).toBe(aggregate);
  });

  it('rejects missing authenticated context before invoking the use case', async () => {
    await expect(
      controller.getCoachIntelligence({} as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(getCoachIntelligenceUseCase.execute).not.toHaveBeenCalled();
  });

  it('maps feature disabled to 503', async () => {
    getCoachIntelligenceUseCase.execute.mockRejectedValue(
      new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.FEATURE_DISABLED,
        'Coach intelligence aggregate is disabled.',
      ),
    );

    await expect(
      controller.getCoachIntelligence({
        authUser: {
          id: 'auth_123',
          email: 'coach@example.com',
        },
      } as never),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps missing user profile to 404', async () => {
    getCoachIntelligenceUseCase.execute.mockRejectedValue(
      new GetCoachIntelligenceError(
        COACH_INTELLIGENCE_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      ),
    );

    await expect(
      controller.getCoachIntelligence({
        authUser: {
          id: 'auth_123',
          email: 'coach@example.com',
        },
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps unexpected failures to 500', async () => {
    getCoachIntelligenceUseCase.execute.mockRejectedValue(new Error('boom'));

    await expect(
      controller.getCoachIntelligence({
        authUser: {
          id: 'auth_123',
          email: 'coach@example.com',
        },
      } as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
