import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { PERSONALIZATION_READ_ERROR_CODES } from '../../application/services/personalization-read.errors';
import { GetBehavioralPatternsUseCase } from '../../application/use-cases/get-behavioral-patterns/get-behavioral-patterns.use-case';
import { GetCurrentPersonalizationUseCase } from '../../application/use-cases/get-current-personalization/get-current-personalization.use-case';
import { GetPersonalizationHistoryUseCase } from '../../application/use-cases/get-personalization-history/get-personalization-history.use-case';
import { GetPersonalizationHistoryError } from '../../application/use-cases/get-personalization-history/get-personalization-history.errors';
import { GetTodayPersonalizationUseCase } from '../../application/use-cases/get-today-personalization/get-today-personalization.use-case';
import { GetTodayPersonalizationError } from '../../application/use-cases/get-today-personalization/get-today-personalization.errors';
import { GetUserBehaviorProfileUseCase } from '../../application/use-cases/get-user-behavior-profile/get-user-behavior-profile.use-case';
import { ReplayPersonalizationSnapshotUseCase } from '../../application/use-cases/replay-personalization-snapshot/replay-personalization-snapshot.use-case';
import { ReplayPersonalizationSnapshotError } from '../../application/use-cases/replay-personalization-snapshot/replay-personalization-snapshot.errors';
import { REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES } from '../../application/use-cases/replay-personalization-snapshot/replay-personalization-snapshot.errors';
import { PersonalizationController } from './personalization.controller';

describe('PersonalizationController', () => {
  let getTodayPersonalizationUseCase: jest.Mocked<GetTodayPersonalizationUseCase>;
  let getCurrentPersonalizationUseCase: jest.Mocked<GetCurrentPersonalizationUseCase>;
  let getPersonalizationHistoryUseCase: jest.Mocked<GetPersonalizationHistoryUseCase>;
  let getBehavioralPatternsUseCase: jest.Mocked<GetBehavioralPatternsUseCase>;
  let getUserBehaviorProfileUseCase: jest.Mocked<GetUserBehaviorProfileUseCase>;
  let replayPersonalizationSnapshotUseCase: jest.Mocked<ReplayPersonalizationSnapshotUseCase>;
  let controller: PersonalizationController;

  beforeEach(() => {
    getTodayPersonalizationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTodayPersonalizationUseCase>;
    getCurrentPersonalizationUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentPersonalizationUseCase>;
    getPersonalizationHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetPersonalizationHistoryUseCase>;
    getBehavioralPatternsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetBehavioralPatternsUseCase>;
    getUserBehaviorProfileUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetUserBehaviorProfileUseCase>;
    replayPersonalizationSnapshotUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReplayPersonalizationSnapshotUseCase>;

    controller = new PersonalizationController(
      getTodayPersonalizationUseCase,
      getCurrentPersonalizationUseCase,
      getPersonalizationHistoryUseCase,
      getBehavioralPatternsUseCase,
      getUserBehaviorProfileUseCase,
      replayPersonalizationSnapshotUseCase,
    );
  });

  it('returns today personalization for the authenticated user', async () => {
    getTodayPersonalizationUseCase.execute.mockResolvedValue({
      personalizationSnapshot: buildSnapshot('snapshot_123'),
    } as never);

    const result = await controller.getTodayPersonalization({
      authUser: { id: 'auth_123', email: 'user@email.com' },
      userProfileId: 'ignored',
    } as never);

    expect(getTodayPersonalizationUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.personalizationSnapshot.id).toBe('snapshot_123');
  });

  it('returns current personalization for the authenticated user', async () => {
    getCurrentPersonalizationUseCase.execute.mockResolvedValue({
      personalizationSnapshot: buildSnapshot('snapshot_current'),
    } as never);

    const result = await controller.getCurrentPersonalization({
      authUser: { id: 'auth_123', email: 'user@email.com' },
      userProfileId: 'ignored',
    } as never);

    expect(getCurrentPersonalizationUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.personalizationSnapshot.id).toBe('snapshot_current');
  });

  it('returns history with the provided limit', async () => {
    getPersonalizationHistoryUseCase.execute.mockResolvedValue({
      personalizationSnapshots: [buildSnapshot('snapshot_123')],
      limit: 14,
    } as never);

    const result = await controller.getPersonalizationHistory(
      {
        authUser: { id: 'auth_123', email: 'user@email.com' },
      } as never,
      {
        limit: 14,
      } as never,
    );

    expect(getPersonalizationHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
      limit: 14,
    });
    expect(result.personalizationSnapshots).toHaveLength(1);
  });

  it('returns behavioral patterns for the authenticated user', async () => {
    getBehavioralPatternsUseCase.execute.mockResolvedValue({
      behavioralPatterns: [buildPattern('responds_to_goals')],
    } as never);

    const result = await controller.getBehavioralPatterns({
      authUser: { id: 'auth_123', email: 'user@email.com' },
      userProfileId: 'ignored',
    } as never);

    expect(getBehavioralPatternsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.behavioralPatterns).toHaveLength(1);
  });

  it('returns the user behavior profile for the authenticated user', async () => {
    getUserBehaviorProfileUseCase.execute.mockResolvedValue({
      userBehaviorProfile: buildProfile('profile_123'),
    } as never);

    const result = await controller.getUserBehaviorProfile({
      authUser: { id: 'auth_123', email: 'user@email.com' },
      userProfileId: 'ignored',
    } as never);

    expect(getUserBehaviorProfileUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
    });
    expect(result.userBehaviorProfile.userProfileId).toBe('profile_123');
  });

  it('replays a personalization snapshot for the authenticated user', async () => {
    replayPersonalizationSnapshotUseCase.execute.mockResolvedValue({
      persisted: buildSnapshot('snapshot_123'),
      recalculated: {
        preferredCoachingStyle: 'balanced',
        engagementProfile: 'medium',
        notificationResponsiveness: 'medium',
        goalResponsiveness: 'medium',
        recoveryResponsiveness: 'medium',
        habitResponsiveness: 'medium',
        riskOfDisengagement: 'medium',
        trend: 'stable',
        formulaVersion: 'personalization-engine-v1',
      },
      comparison: {
        matches: true,
        differences: [],
      },
      replayedAt: '2026-06-03T00:00:00.000Z',
    } as never);

    const result = await controller.replayPersonalizationSnapshot(
      {
        authUser: { id: 'auth_123', email: 'user@email.com' },
        userProfileId: 'ignored',
      } as never,
      'snapshot_123',
    );

    expect(replayPersonalizationSnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_123',
      personalizationSnapshotId: 'snapshot_123',
    });
    expect(result.persisted.id).toBe('snapshot_123');
  });

  it('maps invalid limits to 400', async () => {
    getPersonalizationHistoryUseCase.execute.mockRejectedValue(
      new GetPersonalizationHistoryError(
        PERSONALIZATION_READ_ERROR_CODES.INVALID_LIMIT,
        'Limit must be between 1 and 90.',
      ),
    );

    await expect(
      controller.getPersonalizationHistory(
        {
          authUser: { id: 'auth_123', email: 'user@email.com' },
        } as never,
        { limit: 0 } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps missing user profiles to 404', async () => {
    getTodayPersonalizationUseCase.execute.mockRejectedValue(
      new GetTodayPersonalizationError(
        PERSONALIZATION_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      ),
    );

    await expect(
      controller.getTodayPersonalization({
        authUser: { id: 'auth_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps invalid session to 401', async () => {
    getCurrentPersonalizationUseCase.execute.mockRejectedValue(
      new GetTodayPersonalizationError(
        PERSONALIZATION_READ_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.getCurrentPersonalization({
        authUser: { id: 'auth_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps replay not found to 404', async () => {
    replayPersonalizationSnapshotUseCase.execute.mockRejectedValue(
      new ReplayPersonalizationSnapshotError(
        REPLAY_PERSONALIZATION_SNAPSHOT_ERROR_CODES.PERSONALIZATION_SNAPSHOT_NOT_FOUND,
        'Personalization snapshot not found.',
      ),
    );

    await expect(
      controller.replayPersonalizationSnapshot(
        {
          authUser: { id: 'auth_123', email: 'user@email.com' },
        } as never,
        'snapshot_123',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid replay ids before calling the use case', async () => {
    await expect(
      controller.replayPersonalizationSnapshot(
        {
          authUser: { id: 'auth_123', email: 'user@email.com' },
        } as never,
        '   ',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(replayPersonalizationSnapshotUseCase.execute).not.toHaveBeenCalled();
  });

  it('uses auth guard on all routes', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PersonalizationController.prototype.getTodayPersonalization,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PersonalizationController.prototype.getCurrentPersonalization,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PersonalizationController.prototype.getPersonalizationHistory,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PersonalizationController.prototype.getBehavioralPatterns,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PersonalizationController.prototype.getUserBehaviorProfile,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        PersonalizationController.prototype.replayPersonalizationSnapshot,
      ),
    ).toContain(AuthSessionGuard);
  });

  it('exposes the personalization routes under the expected paths', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PersonalizationController.prototype.getTodayPersonalization,
      ),
    ).toBe('today');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PersonalizationController.prototype.getCurrentPersonalization,
      ),
    ).toBe('current');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PersonalizationController.prototype.getPersonalizationHistory,
      ),
    ).toBe('history');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PersonalizationController.prototype.getBehavioralPatterns,
      ),
    ).toBe('patterns');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PersonalizationController.prototype.getUserBehaviorProfile,
      ),
    ).toBe('profile');
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        PersonalizationController.prototype.replayPersonalizationSnapshot,
      ),
    ).toBe('debug/:id/replay');
  });
});

function buildSnapshot(id: string) {
  const snapshot = {
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
  };

  return {
    ...snapshot,
    toJSON() {
      return snapshot;
    },
  } as never;
}

function buildPattern(type: string) {
  const pattern = {
    id: 'pattern_123',
    userProfileId: 'profile_123',
    type: { value: type },
    confidence: { value: 'high' },
    evidenceCount: 1,
    lastObservedAt: '2026-06-03T00:00:00.000Z',
    formulaVersion: 'personalization-engine-v1',
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z',
  };

  return {
    ...pattern,
    toJSON() {
      return pattern;
    },
  } as never;
}

function buildProfile(userProfileId: string) {
  const profile = {
    id: 'profile_123',
    userProfileId,
    preferredCoachingStyle: { value: 'balanced' },
    notificationResponsiveness: { value: 'medium' },
    goalResponsiveness: { value: 'medium' },
    recoveryResponsiveness: { value: 'medium' },
    habitResponsiveness: { value: 'medium' },
    engagementProfile: { value: 'medium' },
    riskOfDisengagement: { value: 'medium' },
    formulaVersion: 'personalization-engine-v1',
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z',
  };

  return {
    ...profile,
    toJSON() {
      return profile;
    },
  } as never;
}
