import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { BuildGoalProgressSnapshotError } from '../../application/use-cases/build-goal-progress-snapshot/build-goal-progress-snapshot.errors';
import { GetCurrentGoalUseCase } from '../../application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalAchievementHistoryUseCase } from '../../application/use-cases/get-goal-achievement-history/get-goal-achievement-history.use-case';
import { GetGoalForecastUseCase } from '../../application/use-cases/get-goal-forecast/get-goal-forecast.use-case';
import { GetGoalHistoryUseCase } from '../../application/use-cases/get-goal-history/get-goal-history.use-case';
import { GetGoalMilestonesUseCase } from '../../application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import { Goal } from '../../domain/entities/goal.entity';
import { GoalAchievement } from '../../domain/entities/goal-achievement.entity';
import { GoalForecast } from '../../domain/entities/goal-forecast.entity';
import { GoalMilestone } from '../../domain/entities/goal-milestone.entity';
import { GoalProgressSnapshot } from '../../domain/entities/goal-progress-snapshot.entity';
import { GoalsController } from './goals.controller';
import { GOAL_READ_ERROR_CODES, GoalReadError } from '../../application/services/goal-seed.utils';

describe('GoalsController', () => {
  let getCurrentGoalUseCase: jest.Mocked<GetCurrentGoalUseCase>;
  let getGoalHistoryUseCase: jest.Mocked<GetGoalHistoryUseCase>;
  let getGoalMilestonesUseCase: jest.Mocked<GetGoalMilestonesUseCase>;
  let getGoalAchievementHistoryUseCase: jest.Mocked<GetGoalAchievementHistoryUseCase>;
  let getGoalForecastUseCase: jest.Mocked<GetGoalForecastUseCase>;
  let controller: GoalsController;

  beforeEach(() => {
    getCurrentGoalUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentGoalUseCase>;
    getGoalHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetGoalHistoryUseCase>;
    getGoalMilestonesUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetGoalMilestonesUseCase>;
    getGoalAchievementHistoryUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetGoalAchievementHistoryUseCase>;
    getGoalForecastUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetGoalForecastUseCase>;

    controller = new GoalsController(
      getCurrentGoalUseCase,
      getGoalHistoryUseCase,
      getGoalMilestonesUseCase,
      getGoalAchievementHistoryUseCase,
      getGoalForecastUseCase,
    );
  });

  it('returns the current goal for the authenticated user', async () => {
    getCurrentGoalUseCase.execute.mockResolvedValue({
      goal: buildGoal(),
      progressSnapshot: buildProgressSnapshot(),
      forecast: buildForecast(),
    } as never);

    const result = await controller.getCurrentGoal({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
      userProfileId: 'ignored',
    } as never);

    expect(getCurrentGoalUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.goal.id).toBe('goal_123');
    expect(result.progressSnapshot.date).toBe('2026-06-03');
  });

  it('returns history with the provided limit', async () => {
    getGoalHistoryUseCase.execute.mockResolvedValue({
      goalProgressSnapshots: [buildProgressSnapshot()],
      limit: 14,
    } as never);

    const result = await controller.getGoalHistory(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never,
      {
        limit: 14,
      },
    );

    expect(getGoalHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 14,
    });
    expect(result.goalProgressSnapshots).toHaveLength(1);
  });

  it('returns milestones for the authenticated user', async () => {
    getGoalMilestonesUseCase.execute.mockResolvedValue({
      goalId: 'goal_123',
      userProfileId: 'profile_123',
      goalMilestones: [buildMilestone()],
    } as never);

    const result = await controller.getGoalMilestones({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    });

    expect(getGoalMilestonesUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.goalId).toBe('goal_123');
  });

  it('returns achievement history with the provided limit', async () => {
    getGoalAchievementHistoryUseCase.execute.mockResolvedValue({
      goalAchievements: [buildAchievement()],
      limit: 20,
    } as never);

    const result = await controller.getGoalAchievementHistory(
      {
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never,
      {
        limit: 20,
      },
    );

    expect(getGoalAchievementHistoryUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
      limit: 20,
    });
    expect(result.goalAchievements).toHaveLength(1);
  });

  it('returns the goal forecast for the authenticated user', async () => {
    getGoalForecastUseCase.execute.mockResolvedValue({
      goalForecast: buildForecast(),
    } as never);

    const result = await controller.getGoalForecast({
      authUser: { id: 'auth_user_123', email: 'user@email.com' },
    });

    expect(getGoalForecastUseCase.execute).toHaveBeenCalledWith({
      authUserId: 'auth_user_123',
    });
    expect(result.goalForecast.goalId).toBe('goal_123');
  });

  it('maps invalid session errors to 401', async () => {
    getCurrentGoalUseCase.execute.mockRejectedValue(
      new GoalReadError(
        GOAL_READ_ERROR_CODES.INVALID_SESSION,
        'Invalid session.',
      ),
    );

    await expect(
      controller.getCurrentGoal({
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('maps invalid limits to 400', async () => {
    getGoalHistoryUseCase.execute.mockRejectedValue(
      new GoalReadError(
        GOAL_READ_ERROR_CODES.INVALID_LIMIT,
        'limit must be between 1 and 90.',
      ),
    );

    await expect(
      controller.getGoalHistory(
        {
          authUser: { id: 'auth_user_123', email: 'user@email.com' },
        } as never,
        { limit: 0 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps build errors to the expected HTTP status', async () => {
    getCurrentGoalUseCase.execute.mockRejectedValue(
      new BuildGoalProgressSnapshotError(
        'GOAL_TARGET_VALUE_REQUIRED',
        'Target value required.',
      ),
    );

    await expect(
      controller.getCurrentGoal({
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps unexpected errors to 500', async () => {
    getCurrentGoalUseCase.execute.mockRejectedValue(new Error('boom'));

    await expect(
      controller.getCurrentGoal({
        authUser: { id: 'auth_user_123', email: 'user@email.com' },
      } as never),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('uses auth guard on all routes', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        GoalsController.prototype.getCurrentGoal,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        GoalsController.prototype.getGoalHistory,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        GoalsController.prototype.getGoalMilestones,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        GoalsController.prototype.getGoalAchievementHistory,
      ),
    ).toContain(AuthSessionGuard);
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        GoalsController.prototype.getGoalForecast,
      ),
    ).toContain(AuthSessionGuard);
  });
});

function buildGoal() {
  return new Goal({
    id: 'goal_123',
    userProfileId: 'profile_123',
    type: 'lose_weight',
    status: { value: 'active' } as never,
    startDate: new Date('2026-06-01T00:00:00.000Z'),
    targetDate: undefined,
    achievedAt: undefined,
    targetValue: 72,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  });
}

function buildProgressSnapshot() {
  return new GoalProgressSnapshot({
    goalId: 'goal_123',
    userProfileId: 'profile_123',
    date: '2026-06-03',
    progressPercentage: 52,
    currentValue: 80,
    targetValue: 72,
    trend: { value: 'stable' } as never,
    sourceContext: {},
    formulaVersion: 'goal-deterministic-v1',
  });
}

function buildForecast() {
  return new GoalForecast({
    goalId: 'goal_123',
    userProfileId: 'profile_123',
    predictedCompletionDate: new Date('2026-07-03T00:00:00.000Z'),
    confidence: { value: 'medium' } as never,
    estimatedDaysRemaining: 30,
    generatedAt: new Date('2026-06-03T10:00:00.000Z'),
    formulaVersion: 'goal-deterministic-v1',
  });
}

function buildMilestone() {
  return new GoalMilestone({
    goalId: 'goal_123',
    type: { value: 'weight_target' } as never,
    title: '25% goal milestone',
    targetValue: 25,
    achieved: false,
  });
}

function buildAchievement() {
  return new GoalAchievement({
    goalId: 'goal_123',
    achievedAt: new Date('2026-06-02T00:00:00.000Z'),
    completionPercentage: 100,
    notes: 'Achieved.',
  });
}
