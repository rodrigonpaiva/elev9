export type GetCoachFeedbackDebugHistoryOutput = {
  feedbacks: Array<{
    id: string;
    message: string;
    insights: string[];
    recommendations: string[];
    influences: string[];
    generatorVersion?: string;
    contextSnapshot?: {
      fatigueLevel?: "LOW" | "MODERATE" | "HIGH";
      recoveryTrend?: "improving" | "stable" | "needs_recovery";
      weeklyFrequency?: number;
      currentStreak?: number;
      averageWorkoutDuration?: number;
      latestCheckIn?: {
        energyLevel: number;
        sleepQuality: number;
        muscleSoreness: number;
        motivationLevel: number;
      };
      nutritionProfile?: {
        goal: "fat_loss" | "maintenance" | "muscle_gain";
        mealsPerDay: number;
      };
    };
    createdAt: string;
  }>;
};
