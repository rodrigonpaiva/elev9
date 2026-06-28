import { Inject, Injectable } from '@nestjs/common';

import {
  FITNESS_PROFILE_REPOSITORY,
  FitnessProfileRepository,
} from '../../../../fitness/domain/repositories/fitness-profile.repository';
import {
  USER_PROFILE_REPOSITORY,
  UserProfileRepository,
} from '../../../../users/domain/repositories/user-profile.repository';
import {
  GOAL_REPOSITORY,
  GoalRepository,
} from '../../../domain/repositories/goal.repository';
import {
  GOAL_MILESTONE_REPOSITORY,
  GoalMilestoneRepository,
} from '../../../domain/repositories/goal-milestone.repository';
import {
  GOAL_PROGRESS_SNAPSHOT_REPOSITORY,
  GoalProgressSnapshotRepository,
} from '../../../domain/repositories/goal-progress-snapshot.repository';
import { GoalMilestone } from '../../../domain/entities/goal-milestone.entity';
import { GoalMilestoneTypeValueObject } from '../../../domain/value-objects/goal-milestone-type.value-object';
import { GoalProgressCalculatorService } from '../../services/goal-progress-calculator.service';
import { GoalDateService } from '../../services/goal-date.service';
import {
  GoalReadError,
  GOAL_READ_ERROR_CODES,
  resolveActiveGoalOrSeed,
  resolveUserProfileOrThrow,
} from '../../services/goal-seed.utils';
import { GetGoalMilestonesInput } from './get-goal-milestones.input';
import { GetGoalMilestonesOutput } from './get-goal-milestones.output';

@Injectable()
export class GetGoalMilestonesUseCase {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly userProfileRepository: UserProfileRepository,
    @Inject(GOAL_REPOSITORY)
    private readonly goalRepository: GoalRepository,
    @Inject(FITNESS_PROFILE_REPOSITORY)
    private readonly fitnessProfileRepository: FitnessProfileRepository,
    @Inject(GOAL_MILESTONE_REPOSITORY)
    private readonly goalMilestoneRepository: GoalMilestoneRepository,
    @Inject(GOAL_PROGRESS_SNAPSHOT_REPOSITORY)
    private readonly goalProgressSnapshotRepository: GoalProgressSnapshotRepository,
    private readonly goalProgressCalculatorService: GoalProgressCalculatorService,
    private readonly goalDateService: GoalDateService,
  ) {}

  async execute(
    input: GetGoalMilestonesInput,
  ): Promise<GetGoalMilestonesOutput> {
    try {
      const userProfile = await resolveUserProfileOrThrow({
        authUserId: input.authUserId,
        userProfileRepository: this.userProfileRepository,
      });

      const { goal } = await resolveActiveGoalOrSeed({
        userProfile,
        goalRepository: this.goalRepository,
        fitnessProfileRepository: this.fitnessProfileRepository,
        goalDateService: this.goalDateService,
      });

      const existingMilestones =
        await this.goalMilestoneRepository.findManyByGoalId(goal.id);

      if (existingMilestones.length > 0) {
        return {
          goalId: goal.id,
          userProfileId: goal.userProfileId,
          goalMilestones: existingMilestones,
        };
      }

      const latestSnapshot =
        await this.goalProgressSnapshotRepository.findLatestByGoalId(goal.id);
      const progressPercentage = latestSnapshot?.progressPercentage ?? 0;
      const achievedAt = latestSnapshot
        ? new Date(`${latestSnapshot.date}T00:00:00.000Z`)
        : new Date(
            `${this.goalDateService.todayUtcDateString()}T00:00:00.000Z`,
          );

      const milestoneBlueprints =
        this.goalProgressCalculatorService.buildMilestones(
          goal.type,
          progressPercentage,
        );

      const createdMilestones = await this.goalMilestoneRepository.createMany(
        milestoneBlueprints.map(
          (milestone) =>
            new GoalMilestone({
              goalId: goal.id,
              type: new GoalMilestoneTypeValueObject(milestone.type),
              title: milestone.title,
              targetValue: milestone.targetValue,
              achieved: milestone.achieved,
              achievedAt: milestone.achieved ? achievedAt : undefined,
            }),
        ),
      );

      return {
        goalId: goal.id,
        userProfileId: goal.userProfileId,
        goalMilestones: createdMilestones,
      };
    } catch (error) {
      if (error instanceof GoalReadError) {
        throw error;
      }

      throw new GoalReadError(
        GOAL_READ_ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred.',
      );
    }
  }
}
