import type { GoalContract, GoalForecastContract, GoalMilestoneContract, GoalProgressSnapshotContract } from '../../modules/goals/domain/goals.contract';
import type { GoalForecastConfidence } from '../../modules/goals/domain/goals.types';
import type { Goal } from '../../modules/goals/domain/entities/goal.entity';
import type { GoalForecast } from '../../modules/goals/domain/entities/goal-forecast.entity';
import type { GoalMilestone } from '../../modules/goals/domain/entities/goal-milestone.entity';
import type { GoalProgressSnapshot } from '../../modules/goals/domain/entities/goal-progress-snapshot.entity';

export type GoalReadModel = {
  goal: Goal;
  progressSnapshot?: GoalProgressSnapshot;
  forecast?: GoalForecast;
  milestones?: GoalMilestone[];
};

export type GoalDashboardPayload = {
  current: GoalContract;
  progressSnapshot?: GoalProgressSnapshotDashboardPayload;
  forecast?: GoalForecastContract;
  milestones?: GoalMilestoneContract[];
};

export type GoalProgressSnapshotDashboardPayload = Omit<
  GoalProgressSnapshotContract,
  'sourceContext'
>;

export type GoalCoachDecisionSignals = {
  goalId: string;
  goalType: GoalContract['type'];
  goalProgressPercentage: number;
  goalTrend: GoalProgressSnapshotContract['trend'];
  goalForecastConfidence: GoalForecastConfidence;
};

export class GoalReadModelMapper {
  static toDashboardPayload(
    goalReadModel: GoalReadModel | null | undefined,
  ): GoalDashboardPayload | undefined {
    if (!goalReadModel) {
      return undefined;
    }

    return {
      current: goalReadModel.goal.toJSON(),
      ...(goalReadModel.progressSnapshot
        ? {
            progressSnapshot: this.toSafeProgressSnapshot(
              goalReadModel.progressSnapshot,
            ),
          }
        : {}),
      ...(goalReadModel.forecast ? { forecast: goalReadModel.forecast.toJSON() } : {}),
      ...(goalReadModel.milestones
        ? {
            milestones: goalReadModel.milestones.map((milestone) =>
              milestone.toJSON(),
            ),
          }
        : {}),
    };
  }

  static toCoachDecisionSignals(
    goalReadModel: GoalReadModel | null | undefined,
  ): GoalCoachDecisionSignals | null {
    if (!goalReadModel || !goalReadModel.progressSnapshot || !goalReadModel.forecast) {
      return null;
    }

    return {
      goalId: goalReadModel.goal.id,
      goalType: goalReadModel.goal.type,
      goalProgressPercentage: goalReadModel.progressSnapshot.progressPercentage,
      goalTrend: goalReadModel.progressSnapshot.trend.value,
      goalForecastConfidence: goalReadModel.forecast.confidence.value,
    };
  }

  private static toSafeProgressSnapshot(
    progressSnapshot: GoalProgressSnapshot,
  ): GoalProgressSnapshotDashboardPayload {
    const { sourceContext: _sourceContext, ...safeProgressSnapshot } =
      progressSnapshot.toJSON();

    return safeProgressSnapshot;
  }
}
