import type { GoalAchievementContract } from '../goals.contract';
export type GoalAchievementProps = {
  goalId: string;
  achievedAt: Date;
  completionPercentage: number;
  notes?: string;
};

export class GoalAchievement {
  readonly goalId: string;
  readonly achievedAt: Date;
  readonly completionPercentage: number;
  readonly notes?: string;

  constructor(props: GoalAchievementProps) {
    this.goalId = props.goalId;
    this.achievedAt = props.achievedAt;
    this.completionPercentage = props.completionPercentage;
    this.notes = props.notes;
  }

  toJSON(): GoalAchievementContract {
    return {
      goalId: this.goalId,
      achievedAt: this.achievedAt.toISOString(),
      completionPercentage: this.completionPercentage,
      notes: this.notes,
    };
  }
}
