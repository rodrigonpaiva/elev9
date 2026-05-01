import {
  ActivityLevel,
  FitnessGoal,
} from "../../../fitness/domain/entities/fitness-profile.entity";

export type TrainingPlanIntensity = "low" | "moderate" | "high";
export type TrainingPlanFormat = "strength" | "circuit";

export type TrainingPlanExercise = {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
};

export type TrainingPlanDay = {
  dayIndex: number;
  title: string;
  focus: string;
  format: TrainingPlanFormat;
  intensity: TrainingPlanIntensity;
  exercises: TrainingPlanExercise[];
};

export type TrainingPlanProps = {
  id: string;
  fitnessProfileId: string;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  weeklySchedule: TrainingPlanDay[];
  status: "active";
  createdAt: Date;
  updatedAt: Date;
};

export class TrainingPlan {
  readonly id: string;
  readonly fitnessProfileId: string;
  readonly goal: FitnessGoal;
  readonly activityLevel: ActivityLevel;
  readonly weeklySchedule: TrainingPlanDay[];
  readonly status: "active";
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: TrainingPlanProps) {
    this.id = props.id;
    this.fitnessProfileId = props.fitnessProfileId;
    this.goal = props.goal;
    this.activityLevel = props.activityLevel;
    this.weeklySchedule = props.weeklySchedule;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
