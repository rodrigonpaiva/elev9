import {
  ActivityLevel,
  FitnessGoal,
} from "../../../../fitness/domain/entities/fitness-profile.entity";
import {
  TrainingPlanDay,
} from "../../../domain/entities/training-plan.entity";

export type CreateTrainingPlanOutput = {
  trainingPlan: {
    id: string;
    fitnessProfileId: string;
    goal: FitnessGoal;
    activityLevel: ActivityLevel;
    weeklySchedule: TrainingPlanDay[];
    status: "active";
    createdAt: Date;
  };
};
