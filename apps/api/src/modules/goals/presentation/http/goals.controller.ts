import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { AuthSessionGuard } from '../../../users/presentation/http/guards/auth-session.guard';
import { BuildGoalForecastError } from '../../application/use-cases/build-goal-forecast/build-goal-forecast.errors';
import { BuildGoalProgressSnapshotError } from '../../application/use-cases/build-goal-progress-snapshot/build-goal-progress-snapshot.errors';
import { GetCurrentGoalUseCase } from '../../application/use-cases/get-current-goal/get-current-goal.use-case';
import { GetGoalAchievementHistoryUseCase } from '../../application/use-cases/get-goal-achievement-history/get-goal-achievement-history.use-case';
import { GetGoalForecastUseCase } from '../../application/use-cases/get-goal-forecast/get-goal-forecast.use-case';
import { GetGoalHistoryUseCase } from '../../application/use-cases/get-goal-history/get-goal-history.use-case';
import { GetGoalMilestonesUseCase } from '../../application/use-cases/get-goal-milestones/get-goal-milestones.use-case';
import {
  GoalReadError,
  GOAL_READ_ERROR_CODES,
} from '../../application/services/goal-seed.utils';
import { Goal } from '../../domain/entities/goal.entity';
import { GoalAchievement } from '../../domain/entities/goal-achievement.entity';
import { GoalForecast } from '../../domain/entities/goal-forecast.entity';
import { GoalMilestone } from '../../domain/entities/goal-milestone.entity';
import { GoalProgressSnapshot } from '../../domain/entities/goal-progress-snapshot.entity';
import { GetCurrentGoalResponseDto } from './dto/get-current-goal.response.dto';
import { GetGoalAchievementHistoryQueryDto } from './dto/get-goal-achievement-history.query.dto';
import { GetGoalAchievementHistoryResponseDto } from './dto/get-goal-achievement-history.response.dto';
import { GetGoalForecastResponseDto } from './dto/get-goal-forecast.response.dto';
import { GetGoalsHistoryQueryDto } from './dto/get-goals-history.query.dto';
import { GetGoalHistoryResponseDto } from './dto/get-goal-history.response.dto';
import { GetGoalMilestonesResponseDto } from './dto/get-goal-milestones.response.dto';
import {
  GoalAchievementResponse,
  GoalForecastResponse,
  GoalMilestoneResponse,
  GoalProgressSnapshotResponse,
  GoalResponse,
} from './dto/goal-response.type';

type RequestWithAuthUser = {
  authUser?: {
    id: string;
    email: string;
  };
};

@Controller('goals')
export class GoalsController {
  constructor(
    private readonly getCurrentGoalUseCase: GetCurrentGoalUseCase,
    private readonly getGoalHistoryUseCase: GetGoalHistoryUseCase,
    private readonly getGoalMilestonesUseCase: GetGoalMilestonesUseCase,
    private readonly getGoalAchievementHistoryUseCase: GetGoalAchievementHistoryUseCase,
    private readonly getGoalForecastUseCase: GetGoalForecastUseCase,
  ) {}

  @Get('current')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentGoal(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetCurrentGoalResponseDto> {
    try {
      const result = await this.getCurrentGoalUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        goal: mapGoal(result.goal),
        progressSnapshot: mapGoalProgressSnapshot(result.progressSnapshot),
        forecast: mapGoalForecast(result.forecast),
      };
    } catch (error) {
      this.handleCurrentGoalError(error);
    }
  }

  @Get('history')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getGoalHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetGoalsHistoryQueryDto,
  ): Promise<GetGoalHistoryResponseDto> {
    try {
      const result = await this.getGoalHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        goalProgressSnapshots: result.goalProgressSnapshots.map(
          mapGoalProgressSnapshot,
        ),
        limit: result.limit,
      };
    } catch (error) {
      this.handleGoalHistoryError(error);
    }
  }

  @Get('milestones')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getGoalMilestones(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetGoalMilestonesResponseDto> {
    try {
      const result = await this.getGoalMilestonesUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        goalId: result.goalId,
        userProfileId: result.userProfileId,
        goalMilestones: result.goalMilestones.map(mapGoalMilestone),
      };
    } catch (error) {
      this.handleGoalMilestonesError(error);
    }
  }

  @Get('achievements')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getGoalAchievementHistory(
    @Req() request: RequestWithAuthUser,
    @Query() query: GetGoalAchievementHistoryQueryDto,
  ): Promise<GetGoalAchievementHistoryResponseDto> {
    try {
      const result = await this.getGoalAchievementHistoryUseCase.execute({
        authUserId: request.authUser?.id ?? '',
        limit: query.limit,
      });

      return {
        goalAchievements: result.goalAchievements.map(mapGoalAchievement),
        limit: result.limit,
      };
    } catch (error) {
      this.handleGoalAchievementHistoryError(error);
    }
  }

  @Get('forecast')
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.OK)
  async getGoalForecast(
    @Req() request: RequestWithAuthUser,
  ): Promise<GetGoalForecastResponseDto> {
    try {
      const result = await this.getGoalForecastUseCase.execute({
        authUserId: request.authUser?.id ?? '',
      });

      return {
        goalForecast: mapGoalForecast(result.goalForecast),
      };
    } catch (error) {
      this.handleGoalForecastError(error);
    }
  }

  private handleCurrentGoalError(error: unknown): never {
    if (!(error instanceof GoalReadError)) {
      if (error instanceof BuildGoalProgressSnapshotError) {
        this.handleBuildGoalProgressSnapshotError(error);
      }

      if (error instanceof BuildGoalForecastError) {
        this.handleBuildGoalForecastError(error);
      }

      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GOAL_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.GOAL_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.GOAL_SEED_NOT_SUPPORTED:
      case GOAL_READ_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleGoalHistoryError(error: unknown): never {
    if (!(error instanceof GoalReadError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GOAL_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.GOAL_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.INVALID_LIMIT:
      case GOAL_READ_ERROR_CODES.GOAL_SEED_NOT_SUPPORTED:
        throw new BadRequestException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleGoalMilestonesError(error: unknown): never {
    if (!(error instanceof GoalReadError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GOAL_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.GOAL_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.GOAL_SEED_NOT_SUPPORTED:
        throw new BadRequestException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleGoalAchievementHistoryError(error: unknown): never {
    if (!(error instanceof GoalReadError)) {
      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GOAL_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleGoalForecastError(error: unknown): never {
    if (!(error instanceof GoalReadError)) {
      if (error instanceof BuildGoalForecastError) {
        this.handleBuildGoalForecastError(error);
      }

      throw new InternalServerErrorException('An unexpected error occurred.');
    }

    switch (error.code) {
      case GOAL_READ_ERROR_CODES.INVALID_SESSION:
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND:
      case GOAL_READ_ERROR_CODES.GOAL_NOT_FOUND:
        throw new NotFoundException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.GOAL_SEED_NOT_SUPPORTED:
      case GOAL_READ_ERROR_CODES.INVALID_LIMIT:
        throw new BadRequestException(this.buildErrorPayload(error));
      case GOAL_READ_ERROR_CODES.INTERNAL_ERROR:
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleBuildGoalProgressSnapshotError(
    error: BuildGoalProgressSnapshotError,
  ): never {
    switch (error.code) {
      case 'AUTH_INVALID_SESSION':
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case 'USER_PROFILE_NOT_FOUND':
      case 'GOAL_NOT_FOUND':
        throw new NotFoundException(this.buildErrorPayload(error));
      case 'GOAL_TARGET_VALUE_REQUIRED':
        throw new BadRequestException(this.buildErrorPayload(error));
      case 'GOAL_BUILD_INTERNAL_ERROR':
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private handleBuildGoalForecastError(error: BuildGoalForecastError): never {
    switch (error.code) {
      case 'AUTH_INVALID_SESSION':
        throw new UnauthorizedException(this.buildErrorPayload(error));
      case 'USER_PROFILE_NOT_FOUND':
      case 'GOAL_NOT_FOUND':
        throw new NotFoundException(this.buildErrorPayload(error));
      case 'GOAL_FORECAST_INTERNAL_ERROR':
      default:
        throw new InternalServerErrorException(this.buildErrorPayload(error));
    }
  }

  private buildErrorPayload(error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
}

function mapGoal(goal: Goal): GoalResponse {
  return goal.toJSON();
}

function mapGoalProgressSnapshot(
  snapshot: GoalProgressSnapshot,
): GoalProgressSnapshotResponse {
  return snapshot.toJSON();
}

function mapGoalForecast(forecast: GoalForecast): GoalForecastResponse {
  return forecast.toJSON();
}

function mapGoalMilestone(milestone: GoalMilestone): GoalMilestoneResponse {
  return milestone.toJSON();
}

function mapGoalAchievement(
  achievement: GoalAchievement,
): GoalAchievementResponse {
  return achievement.toJSON();
}
