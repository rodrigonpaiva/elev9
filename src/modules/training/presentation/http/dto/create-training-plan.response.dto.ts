export class CreateTrainingPlanResponseDto {
  trainingPlan!: {
    id: string;
    fitnessProfileId: string;
    goal: "lose_weight" | "gain_muscle" | "maintain";
    activityLevel: "low" | "medium" | "high";
    weeklySchedule: Array<{
      dayIndex: number;
      title: string;
      focus: string;
      format: "strength" | "circuit";
      intensity: "low" | "moderate" | "high";
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restSeconds: number;
      }>;
    }>;
    status: "active";
    createdAt: string;
  };
}
