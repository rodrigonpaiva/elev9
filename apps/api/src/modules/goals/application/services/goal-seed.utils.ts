import type { FitnessGoal, FitnessProfile } from '../../../fitness/domain/entities/fitness-profile.entity';
import type { Goal } from '../../domain/entities/goal.entity';
import type { GoalRepository } from '../../domain/repositories/goal.repository';
import type { FitnessProfileRepository } from '../../../fitness/domain/repositories/fitness-profile.repository';
import type { UserProfile } from '../../../users/domain/entities/user-profile.entity';
import type { UserProfileRepository } from '../../../users/domain/repositories/user-profile.repository';
import type { GoalDateService } from './goal-date.service';
import type { GoalType } from '../../domain/goals.types';

export const GOAL_READ_ERROR_CODES = {
  INVALID_SESSION: 'AUTH_INVALID_SESSION',
  USER_PROFILE_NOT_FOUND: 'USER_PROFILE_NOT_FOUND',
  FITNESS_PROFILE_NOT_FOUND: 'FITNESS_PROFILE_NOT_FOUND',
  GOAL_NOT_FOUND: 'GOAL_NOT_FOUND',
  GOAL_SEED_NOT_SUPPORTED: 'GOAL_SEED_NOT_SUPPORTED',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INTERNAL_ERROR: 'GOAL_READ_INTERNAL_ERROR',
} as const;

export type GoalReadErrorCode =
  (typeof GOAL_READ_ERROR_CODES)[keyof typeof GOAL_READ_ERROR_CODES];

export class GoalReadError extends Error {
  readonly code: GoalReadErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: GoalReadErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GoalReadError';
    this.code = code;
    this.details = details;
  }
}

export function mapFitnessGoalToGoalType(
  goal: FitnessGoal,
): GoalType | null {
  switch (goal) {
    case 'lose_weight':
    case 'gain_muscle':
      return goal;
    case 'maintain':
      return 'maintain_weight';
    default:
      return null;
  }
}

export function deriveSeedTargetValue(
  goalType: GoalType,
  fitnessProfile: FitnessProfile,
): number | undefined {
  const weightKg = fitnessProfile.weightKg;

  if (!Number.isFinite(weightKg)) {
    return undefined;
  }

  switch (goalType) {
    case 'lose_weight':
      return roundToOneDecimal(
        Math.max(weightKg - Math.max(5, weightKg * 0.1), 1),
      );
    case 'gain_muscle':
      return roundToOneDecimal(weightKg + Math.max(5, weightKg * 0.1));
    case 'maintain_weight':
      return roundToOneDecimal(weightKg);
    default:
      return undefined;
  }
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function resolveUserProfileOrThrow(
  input: {
    authUserId: string;
    userProfileRepository: UserProfileRepository;
  },
  errorDetails?: Record<string, unknown>,
): Promise<UserProfile> {
  const authUserId =
    typeof input.authUserId === 'string' ? input.authUserId.trim() : '';

  if (!authUserId) {
    throw new GoalReadError(
      GOAL_READ_ERROR_CODES.INVALID_SESSION,
      'Invalid session.',
      errorDetails,
    );
  }

  const userProfile = await input.userProfileRepository.findByAuthUserId(
    authUserId,
  );

  if (!userProfile) {
    throw new GoalReadError(
      GOAL_READ_ERROR_CODES.USER_PROFILE_NOT_FOUND,
      'User profile not found.',
      errorDetails,
    );
  }

  return userProfile;
}

export async function resolveActiveGoalOrSeed(
  input: {
    userProfile: UserProfile;
    goalRepository: GoalRepository;
    fitnessProfileRepository: FitnessProfileRepository;
    goalDateService: GoalDateService;
  },
): Promise<{ goal: Goal; fitnessProfile: FitnessProfile | null }> {
  const activeGoal = await input.goalRepository.findActiveByUserProfileId(
    input.userProfile.id,
  );

  if (activeGoal) {
    const fitnessProfile =
      await input.fitnessProfileRepository.findActiveByUserProfileId(
        input.userProfile.id,
      );

    return {
      goal: activeGoal,
      fitnessProfile,
    };
  }

  const fitnessProfile =
    await input.fitnessProfileRepository.findActiveByUserProfileId(
      input.userProfile.id,
    );

  if (!fitnessProfile) {
    throw new GoalReadError(
      GOAL_READ_ERROR_CODES.FITNESS_PROFILE_NOT_FOUND,
      'Fitness profile not found.',
    );
  }

  const goalType = mapFitnessGoalToGoalType(fitnessProfile.goal);

  if (!goalType) {
    throw new GoalReadError(
      GOAL_READ_ERROR_CODES.GOAL_SEED_NOT_SUPPORTED,
      'The current fitness goal cannot seed a canonical goal.',
      { fitnessGoal: fitnessProfile.goal },
    );
  }

  const targetValue = deriveSeedTargetValue(goalType, fitnessProfile);
  const startDate = input.goalDateService.todayUtcDateString();

  try {
    const goal = await input.goalRepository.create({
      userProfileId: input.userProfile.id,
      type: goalType,
      status: 'active',
      startDate,
      targetValue,
    });

    return {
      goal,
      fitnessProfile,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const existingGoal = await input.goalRepository.findActiveByUserProfileId(
        input.userProfile.id,
      );

      if (existingGoal) {
        return {
          goal: existingGoal,
          fitnessProfile,
        };
      }
    }

    throw error;
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

export function normalizeLimit(
  limit: unknown,
  defaultLimit: number,
  maxLimit: number,
): number {
  if (limit === undefined) {
    return defaultLimit;
  }

  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > maxLimit
  ) {
    throw new GoalReadError(
      GOAL_READ_ERROR_CODES.INVALID_LIMIT,
      `limit must be between 1 and ${maxLimit}.`,
      {
        limit,
        maxLimit,
      },
    );
  }

  return limit;
}
