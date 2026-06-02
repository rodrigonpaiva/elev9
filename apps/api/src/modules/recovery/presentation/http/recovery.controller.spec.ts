import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { BuildRecoverySnapshotUseCase } from '../../application/use-cases/build-recovery-snapshot/build-recovery-snapshot.use-case';
import {
  GET_CURRENT_RECOVERY_ERROR_CODES,
  GetCurrentRecoveryError,
} from '../../application/use-cases/get-current-recovery/get-current-recovery.errors';
import { GetCurrentRecoveryUseCase } from '../../application/use-cases/get-current-recovery/get-current-recovery.use-case';
import {
  GET_RECOVERY_HISTORY_ERROR_CODES,
  GetRecoveryHistoryError,
} from '../../application/use-cases/get-recovery-history/get-recovery-history.errors';
import { GetRecoveryHistoryUseCase } from '../../application/use-cases/get-recovery-history/get-recovery-history.use-case';
import {
  GET_TODAY_RECOVERY_ERROR_CODES,
  GetTodayRecoveryError,
} from '../../application/use-cases/get-today-recovery/get-today-recovery.errors';
import { GetTodayRecoveryUseCase } from '../../application/use-cases/get-today-recovery/get-today-recovery.use-case';
import { RecoveryInfluence, RecoverySnapshot } from '../../domain/entities/recovery-snapshot.entity';
import { RecoveryController } from './recovery.controller';

describe('RecoveryController', () => {
  let getTodayRecoveryUseCase: jest.Mocked<GetTodayRecoveryUseCase>;
  let getCurrentRecoveryUseCase: jest.Mocked<GetCurrentRecoveryUseCase>;
  let getRecoveryHistoryUseCase: jest.Mocked<GetRecoveryHistoryUseCase>;
  let buildRecoverySnapshotUseCase: jest.Mocked<BuildRecoverySnapshotUseCase>;
  let controller: RecoveryController;

  beforeEach(() => {
    getTodayRecoveryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTodayRecoveryUseCase>;
    getCurrentRecoveryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentRecoveryUseCase>;
    getRecoveryHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetRecoveryHistoryUseCase>;
    buildRecoverySnapshotUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<BuildRecoverySnapshotUseCase>;

    controller = new RecoveryController(
      getTodayRecoveryUseCase,
      getCurrentRecoveryUseCase,
      getRecoveryHistoryUseCase,
      buildRecoverySnapshotUseCase,
    );
  });

  it('returns today recovery for the authenticated user', async () => {
    const snapshot = buildRecoverySnapshot({
      date: '2026-06-02',
      readinessScore: 84,
      fatigueScore: 22,
    });

    getTodayRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: snapshot,
    });

    const result = await controller.getToday({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
      userProfileId: 'ignored_profile',
    } as never);

    expect(getTodayRecoveryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result).toEqual({
      recoverySnapshot: {
        userProfileId: 'profile_123',
        date: '2026-06-02',
        readinessScore: 84,
        fatigueScore: 22,
        recoveryTrend: 'improving',
        recommendedIntensity: 'hard',
        influences: [
          {
            code: 'HIGH_ADHERENCE',
            label: 'Strong adherence supports recovery.',
            impact: 'positive',
            weight: 0.15,
            value: 100,
          },
        ],
        formulaVersion: 'recovery-deterministic-v1',
        sourceContext: {
          sleepQuality: 4,
          energyLevel: 5,
        },
        createdAt: '2026-06-02T10:00:00.000Z',
      },
    });
  });

  it('returns current recovery for the authenticated user', async () => {
    const snapshot = buildRecoverySnapshot({
      date: '2026-06-02',
      readinessScore: 72,
      fatigueScore: 38,
    });

    getCurrentRecoveryUseCase.execute.mockResolvedValue({
      recoverySnapshot: snapshot,
    });

    const result = await controller.getCurrent({
      authUser: {
        id: 'auth_user_123',
        email: 'user@email.com',
      },
    });

    expect(getCurrentRecoveryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.recoverySnapshot.date).toBe('2026-06-02');
  });

  it('passes history limit to the use case', async () => {
    getRecoveryHistoryUseCase.execute.mockResolvedValue({
      recoverySnapshots: [buildRecoverySnapshot()],
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

    expect(getRecoveryHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 21,
    });
    expect(result.recoverySnapshots).toHaveLength(1);
  });

  it('maps invalid session errors to 401', async () => {
    getTodayRecoveryUseCase.execute.mockRejectedValue(
      new GetTodayRecoveryError(
        GET_TODAY_RECOVERY_ERROR_CODES.INVALID_SESSION,
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

  it('maps user profile missing errors to 404', async () => {
    getCurrentRecoveryUseCase.execute.mockRejectedValue(
      new GetCurrentRecoveryError(
        GET_CURRENT_RECOVERY_ERROR_CODES.USER_PROFILE_NOT_FOUND,
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
    getRecoveryHistoryUseCase.execute.mockRejectedValue(
      new GetRecoveryHistoryError(
        GET_RECOVERY_HISTORY_ERROR_CODES.INVALID_LIMIT,
        'Invalid recovery history limit.',
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
    getTodayRecoveryUseCase.execute.mockRejectedValue(new Error('boom'));

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
        RecoveryController.prototype.getToday,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RecoveryController.prototype.getCurrent,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        RecoveryController.prototype.getHistory,
      ),
    ).toContain(AuthSessionGuard);
  });

  function buildRecoverySnapshot(
    overrides: Partial<RecoverySnapshot> = {},
  ): RecoverySnapshot {
    return new RecoverySnapshot({
      userProfileId: 'profile_123',
      date: '2026-06-02',
      readinessScore: 84,
      fatigueScore: 22,
      recoveryTrend: 'improving',
      recommendedIntensity: 'hard',
      influences: [
        new RecoveryInfluence({
          code: 'HIGH_ADHERENCE',
          label: 'Strong adherence supports recovery.',
          impact: 'positive',
          weight: 0.15,
          value: 100,
        }),
      ],
      formulaVersion: 'recovery-deterministic-v1',
      sourceContext: {
        sleepQuality: 4,
        energyLevel: 5,
      },
      createdAt: new Date('2026-06-02T10:00:00.000Z'),
      ...overrides,
    });
  }
});
