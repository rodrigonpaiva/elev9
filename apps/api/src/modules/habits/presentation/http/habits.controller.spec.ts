import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PATH_METADATA } from '@nestjs/common/constants';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { HabitSnapshot } from '../../domain/entities/habit-snapshot.entity';
import { ConsistencySummary } from '../../domain/entities/consistency-summary.entity';
import { HabitRiskSignal } from '../../domain/entities/habit-risk-signal.entity';
import { ConsistencyTrendValueObject } from '../../domain/value-objects/consistency-trend.value-object';
import { HabitRiskLevelValueObject } from '../../domain/value-objects/habit-risk-level.value-object';
import { GetConsistencySummaryUseCase } from '../../application/use-cases/get-consistency-summary/get-consistency-summary.use-case';
import { GetConsistencySummaryError } from '../../application/use-cases/get-consistency-summary/get-consistency-summary.errors';
import { GET_CONSISTENCY_SUMMARY_ERROR_CODES } from '../../application/use-cases/get-consistency-summary/get-consistency-summary.errors';
import { GetCurrentHabitsUseCase } from '../../application/use-cases/get-current-habits/get-current-habits.use-case';
import { GetHabitHistoryUseCase } from '../../application/use-cases/get-habit-history/get-habit-history.use-case';
import { GetHabitHistoryError } from '../../application/use-cases/get-habit-history/get-habit-history.errors';
import { GET_HABIT_HISTORY_ERROR_CODES } from '../../application/use-cases/get-habit-history/get-habit-history.errors';
import { GetHabitRiskSignalsUseCase } from '../../application/use-cases/get-habit-risk-signals/get-habit-risk-signals.use-case';
import { GetHabitRiskSignalsError } from '../../application/use-cases/get-habit-risk-signals/get-habit-risk-signals.errors';
import { GET_HABIT_RISK_SIGNALS_ERROR_CODES } from '../../application/use-cases/get-habit-risk-signals/get-habit-risk-signals.errors';
import { GetTodayHabitsUseCase } from '../../application/use-cases/get-today-habits/get-today-habits.use-case';
import { GetTodayHabitsError } from '../../application/use-cases/get-today-habits/get-today-habits.errors';
import { GET_TODAY_HABITS_ERROR_CODES } from '../../application/use-cases/get-today-habits/get-today-habits.errors';
import {
  REPLAY_HABIT_SNAPSHOT_ERROR_CODES,
  ReplayHabitSnapshotError,
} from '../../application/use-cases/replay-habit-snapshot/replay-habit-snapshot.errors';
import { ReplayHabitSnapshotUseCase } from '../../application/use-cases/replay-habit-snapshot/replay-habit-snapshot.use-case';
import { HabitsController } from './habits.controller';

describe('HabitsController', () => {
  let getTodayHabitsUseCase: jest.Mocked<GetTodayHabitsUseCase>;
  let getCurrentHabitsUseCase: jest.Mocked<GetCurrentHabitsUseCase>;
  let getHabitHistoryUseCase: jest.Mocked<GetHabitHistoryUseCase>;
  let getConsistencySummaryUseCase: jest.Mocked<GetConsistencySummaryUseCase>;
  let getHabitRiskSignalsUseCase: jest.Mocked<GetHabitRiskSignalsUseCase>;
  let replayHabitSnapshotUseCase: jest.Mocked<ReplayHabitSnapshotUseCase>;
  let controller: HabitsController;

  beforeEach(() => {
    getTodayHabitsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetTodayHabitsUseCase>;
    getCurrentHabitsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentHabitsUseCase>;
    getHabitHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetHabitHistoryUseCase>;
    getConsistencySummaryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetConsistencySummaryUseCase>;
    getHabitRiskSignalsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetHabitRiskSignalsUseCase>;
    replayHabitSnapshotUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReplayHabitSnapshotUseCase>;

    controller = new HabitsController(
      getTodayHabitsUseCase,
      getCurrentHabitsUseCase,
      getHabitHistoryUseCase,
      getConsistencySummaryUseCase,
      getHabitRiskSignalsUseCase,
      replayHabitSnapshotUseCase,
    );
  });

  it('returns today habits for the authenticated user', async () => {
    getTodayHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: buildHabitSnapshot('2026-06-03'),
    } as never);

    const result = await controller.getTodayHabits({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
      userProfileId: 'ignored',
    } as never);

    expect(getTodayHabitsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.habitSnapshot.date).toBe('2026-06-03');
  });

  it('returns current habits for the authenticated user', async () => {
    getCurrentHabitsUseCase.execute.mockResolvedValue({
      habitSnapshot: buildHabitSnapshot('2026-06-03'),
    } as never);

    const result = await controller.getCurrentHabits({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    } as never);

    expect(getCurrentHabitsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.habitSnapshot.date).toBe('2026-06-03');
  });

  it('returns history with the provided limit', async () => {
    getHabitHistoryUseCase.execute.mockResolvedValue({
      habitSnapshots: [buildHabitSnapshot('2026-06-03')],
      limit: 14,
    } as never);

    const result = await controller.getHabitHistory(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never,
      {
        limit: 14,
      } as never,
    );

    expect(getHabitHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 14,
    });
    expect(result.habitSnapshots).toHaveLength(1);
  });

  it('returns the consistency summary for the authenticated user', async () => {
    getConsistencySummaryUseCase.execute.mockResolvedValue({
      consistencySummary: buildConsistencySummary(),
    } as never);

    const result = await controller.getConsistencySummary({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    } as never);

    expect(getConsistencySummaryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.consistencySummary.score).toBe(72);
  });

  it('returns habit risk signals for the authenticated user', async () => {
    getHabitRiskSignalsUseCase.execute.mockResolvedValue({
      habitRiskSignals: [buildHabitRiskSignal()],
    } as never);

    const result = await controller.getHabitRiskSignals({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    } as never);

    expect(getHabitRiskSignalsUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.habitRiskSignals).toHaveLength(1);
  });

  it('replays a habit snapshot for the authenticated user', async () => {
    replayHabitSnapshotUseCase.execute.mockResolvedValue({
      persisted: buildHabitSnapshot('2026-06-03'),
      recalculated: {
        consistencyScore: 72,
        streakDays: 5,
        adherenceScore: 68,
        trend: 'improving',
        formulaVersion: 'habit-engine-v1',
      },
      comparison: {
        matches: true,
        differences: [],
      },
      replayedAt: '2026-06-03T12:00:00.000Z',
    } as never);

    const result = await controller.replayHabitSnapshot(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
        userProfileId: 'ignored',
      } as never,
      'snapshot_123',
    );

    expect(replayHabitSnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      habitSnapshotId: 'snapshot_123',
    });
    expect(result.recalculated.consistencyScore).toBe(72);
    expect(result.comparison.matches).toBe(true);
  });

  it('maps invalid limits to 400', async () => {
    getHabitHistoryUseCase.execute.mockRejectedValue(
      new GetHabitHistoryError(
        GET_HABIT_HISTORY_ERROR_CODES.INVALID_LIMIT,
        'Limit must be between 1 and 90.',
      ),
    );

    await expect(
      controller.getHabitHistory(
        {
          authUser: { id: 'auth_user_123', email: 'user@email.com' },
        } as never,
        { limit: 0 } as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps missing user profiles to 404', async () => {
    getTodayHabitsUseCase.execute.mockRejectedValue(
      new GetTodayHabitsError(
        GET_TODAY_HABITS_ERROR_CODES.USER_PROFILE_NOT_FOUND,
        'User profile not found.',
      ),
    );

    await expect(
      controller.getTodayHabits({
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps invalid session to 401', async () => {
    getConsistencySummaryUseCase.execute.mockRejectedValue(
      new GetConsistencySummaryError(
        GET_CONSISTENCY_SUMMARY_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.getConsistencySummary({
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps invalid replay ids to 400', async () => {
    replayHabitSnapshotUseCase.execute.mockRejectedValue(
      new ReplayHabitSnapshotError(
        REPLAY_HABIT_SNAPSHOT_ERROR_CODES.INVALID_INPUT,
        'Invalid habit snapshot id.',
      ),
    );

    await expect(
      controller.replayHabitSnapshot(
        {
          authUser: { id: 'auth_user_123', email: 'user@email.com' },
        } as never,
        ' ',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps missing replay snapshots to 404', async () => {
    replayHabitSnapshotUseCase.execute.mockRejectedValue(
      new ReplayHabitSnapshotError(
        REPLAY_HABIT_SNAPSHOT_ERROR_CODES.HABIT_SNAPSHOT_NOT_FOUND,
        'Habit snapshot not found.',
      ),
    );

    await expect(
      controller.replayHabitSnapshot(
        {
          authUser: { id: 'auth_user_123', email: 'user@email.com' },
        } as never,
        'snapshot_404',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not accept userProfileId on replay requests', async () => {
    replayHabitSnapshotUseCase.execute.mockResolvedValue({
      persisted: buildHabitSnapshot('2026-06-03'),
      recalculated: {
        consistencyScore: 72,
        streakDays: 5,
        adherenceScore: 68,
        trend: 'improving',
        formulaVersion: 'habit-engine-v1',
      },
      comparison: {
        matches: true,
        differences: [],
      },
      replayedAt: '2026-06-03T12:00:00.000Z',
    } as never);

    await controller.replayHabitSnapshot(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
        body: { userProfileId: 'profile_999' },
        query: { userProfileId: 'profile_999' },
      } as never,
      'snapshot_123',
    );

    expect(replayHabitSnapshotUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      habitSnapshotId: 'snapshot_123',
    });
  });

  it('maps unexpected errors to 500', async () => {
    getHabitRiskSignalsUseCase.execute.mockRejectedValue(new Error('boom'));

    await expect(
      controller.getHabitRiskSignals({
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('uses auth guard on all routes', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        HabitsController.prototype.getTodayHabits,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        HabitsController.prototype.getCurrentHabits,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        HabitsController.prototype.getHabitHistory,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        HabitsController.prototype.getConsistencySummary,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        HabitsController.prototype.getHabitRiskSignals,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        HabitsController.prototype.replayHabitSnapshot,
      ),
    ).toContain(AuthSessionGuard);
  });

  it('exposes the habit replay route under debug by id', () => {
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        HabitsController.prototype.replayHabitSnapshot,
      ),
    ).toBe('debug/:id/replay');
  });
});

function buildHabitSnapshot(date: string) {
  return new HabitSnapshot({
    userProfileId: 'profile_123',
    date,
    consistencyScore: 72,
    streakDays: 5,
    adherenceScore: 68,
    trend: new ConsistencyTrendValueObject('improving'),
    sourceContext: {
      formulaVersion: 'habit-engine-v1',
      generatedAt: '2026-06-03T00:00:00.000Z',
    },
    formulaVersion: 'habit-engine-v1',
    generatedAt: new Date('2026-06-03T00:00:00.000Z'),
  });
}

function buildConsistencySummary() {
  return new ConsistencySummary({
    userProfileId: 'profile_123',
    score: 72,
    trend: new ConsistencyTrendValueObject('improving'),
    currentStreak: 5,
    longestStreak: 10,
    adherenceRate: 68,
    riskLevel: new HabitRiskLevelValueObject('medium'),
    updatedAt: new Date('2026-06-03T00:00:00.000Z'),
    formulaVersion: 'habit-engine-v1',
  });
}

function buildHabitRiskSignal() {
  return new HabitRiskSignal({
    userProfileId: 'profile_123',
    type: 'dropout_risk',
    level: new HabitRiskLevelValueObject('high'),
    title: 'Dropout risk detected',
    description: 'Low consistency combined with a declining trend indicates dropout risk.',
    generatedAt: new Date('2026-06-03T00:00:00.000Z'),
    formulaVersion: 'habit-engine-v1',
  });
}
