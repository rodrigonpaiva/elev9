import {
  ActivityLevel,
  FitnessGoal,
} from '../../../fitness/domain/entities/fitness-profile.entity';
import {
  TrainingPlan,
  TrainingPlanDay,
} from '../entities/training-plan.entity';

export interface CreateTrainingPlanRepositoryInput {
  fitnessProfileId: string;
  goal: FitnessGoal;
  activityLevel: ActivityLevel;
  weeklySchedule: TrainingPlanDay[];
  status: 'active';
}

export interface TrainingPlanRepository {
  findById(trainingPlanId: string): Promise<TrainingPlan | null>;
  findActiveByFitnessProfileId(
    fitnessProfileId: string,
  ): Promise<TrainingPlan | null>;
  create(input: CreateTrainingPlanRepositoryInput): Promise<TrainingPlan>;
}

export const TRAINING_PLAN_REPOSITORY = Symbol('TRAINING_PLAN_REPOSITORY');
