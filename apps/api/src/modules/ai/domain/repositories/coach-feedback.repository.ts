import { CoachFeedback } from "../entities/coach-feedback.entity";

export interface CreateCoachFeedbackRepositoryInput {
  userProfileId: string;
  message: string;
  insights: string[];
  recommendations: string[];
  influences?: string[];
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
}

export interface CoachFeedbackRepository {
  create(input: CreateCoachFeedbackRepositoryInput): Promise<CoachFeedback>;
  findByUserProfileId(input: {
    userProfileId: string;
    limit: number;
  }): Promise<CoachFeedback[]>;
}

export const COACH_FEEDBACK_REPOSITORY = Symbol("COACH_FEEDBACK_REPOSITORY");
