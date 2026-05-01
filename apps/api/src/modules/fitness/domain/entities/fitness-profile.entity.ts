export type FitnessGoal = "lose_weight" | "gain_muscle" | "maintain";
export type ActivityLevel = "low" | "medium" | "high";
export type LimitationSeverity = "low" | "medium" | "high";

export type FitnessProfileLimitation = {
  type: string;
  description?: string;
  severity: LimitationSeverity;
};

export type TrainingAvailability = {
  daysPerWeek: number;
  minutesPerSession: number;
};

export type FitnessProfileProps = {
  id: string;
  userProfileId: string;
  heightCm: number;
  weightKg: number;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  trainingAvailability: TrainingAvailability;
  limitations: FitnessProfileLimitation[];
  status: "active";
  createdAt: Date;
  updatedAt: Date;
};

export class FitnessProfile {
  readonly id: string;
  readonly userProfileId: string;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly goal: FitnessGoal;
  readonly activityLevel: ActivityLevel;
  readonly trainingAvailability: TrainingAvailability;
  readonly limitations: FitnessProfileLimitation[];
  readonly status: "active";
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: FitnessProfileProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.heightCm = props.heightCm;
    this.weightKg = props.weightKg;
    this.goal = props.goal;
    this.activityLevel = props.activityLevel;
    this.trainingAvailability = props.trainingAvailability;
    this.limitations = props.limitations;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
