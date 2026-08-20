export type WorkoutSessionStatus = 'active' | 'completed';

export type WorkoutSessionProps = {
  id: string;
  userProfileId: string;
  trainingPlanId: string;
  workoutDayIndex: number;
  date: string;
  status: WorkoutSessionStatus;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
};

export class WorkoutSession {
  readonly id: string;
  readonly userProfileId: string;
  readonly trainingPlanId: string;
  readonly workoutDayIndex: number;
  readonly date: string;
  readonly status: WorkoutSessionStatus;
  readonly startedAt: Date;
  readonly updatedAt: Date;
  readonly completedAt?: Date;

  constructor(props: WorkoutSessionProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.trainingPlanId = props.trainingPlanId;
    this.workoutDayIndex = props.workoutDayIndex;
    this.date = props.date;
    this.status = props.status;
    this.startedAt = props.startedAt;
    this.updatedAt = props.updatedAt;
    this.completedAt = props.completedAt;
  }
}
