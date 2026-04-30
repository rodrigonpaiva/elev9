import {
  ActivityLevel,
  FitnessGoal,
} from "../../../../fitness/domain/entities/fitness-profile.entity";
import {
  TrainingPlanDay,
} from "../../../domain/entities/training-plan.entity";

export type GetMyTrainingPlanOutput = {
  trainingPlan: {
    id: string;
    fitnessProfileId: string;
    status: "active";
    goal: FitnessGoal;
    activityLevel: ActivityLevel;
    weeklySchedule: TrainingPlanDay[];
    createdAt: Date;
  };
};
