import { TrainingPlanDay } from '../../../domain/entities/training-plan.entity';

export class GetMyTrainingPlanResponseDto {
  trainingPlan!: {
    id: string;
    fitnessProfileId: string;
    status: 'active';
    goal: 'lose_weight' | 'gain_muscle' | 'maintain';
    activityLevel: 'low' | 'medium' | 'high';
    weeklySchedule: TrainingPlanDay[];
    createdAt: string;
  };
}
