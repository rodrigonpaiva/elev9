export type TrainingPlanGoal = 'lose_weight' | 'gain_muscle' | 'maintain';
export type TrainingPlanActivityLevel = 'low' | 'medium' | 'high';
export type TrainingPlanIntensity = 'low' | 'moderate' | 'high';

export type TrainingPlanResponse = {
  trainingPlan: {
    id: string;
    fitnessProfileId: string;
    status: 'active';
    goal: TrainingPlanGoal;
    activityLevel: TrainingPlanActivityLevel;
    weeklySchedule: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      format: string;
      intensity: TrainingPlanIntensity;
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      }>;
    }>;
    createdAt: string;
  };
};
