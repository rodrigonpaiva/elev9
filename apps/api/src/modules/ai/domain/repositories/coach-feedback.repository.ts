import { CoachFeedback } from '../entities/coach-feedback.entity';

export interface CreateCoachFeedbackRepositoryInput {
  userProfileId: string;
  message: string;
  insights: string[];
  recommendations: string[];
  influences?: string[];
  generatorVersion?: string;
  contextSnapshot?: {
    goal?: 'lose_weight' | 'gain_muscle' | 'maintain';
    activityLevel?: 'low' | 'medium' | 'high';
    hasTrainingPlan?: boolean;
    fatigueLevel?: 'LOW' | 'MODERATE' | 'HIGH';
    recoveryTrend?: 'improving' | 'stable' | 'needs_recovery';
    readinessScore?: number;
    fatigueScore?: number;
    recommendedIntensity?: 'recovery' | 'light' | 'moderate' | 'hard';
    recoveryInfluences?: Array<{
      code:
        | 'LOW_SLEEP'
        | 'LOW_ENERGY'
        | 'HIGH_MUSCLE_SORENESS'
        | 'HIGH_ADHERENCE'
        | 'LOW_ADHERENCE'
        | 'HIGH_WORKOUT_LOAD'
        | 'RECENT_WORKOUT_COMPLETION'
        | 'LONG_STREAK'
        | 'MISSED_WORKOUTS';
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      weight?: number;
      value?: number;
    }>;
    weeklyFrequency?: number;
    currentStreak?: number;
    averageWorkoutDuration?: number;
    recentWorkoutLogs?: Array<{
      date: string;
      durationMinutes: number;
      createdAt: string;
    }>;
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
    };
    nutritionProfile?: {
      goal: 'fat_loss' | 'maintenance' | 'muscle_gain';
      mealsPerDay: number;
    };
    coachDecisionId?: string;
    coachDecisionPriority?: 'recovery' | 'nutrition' | 'training' | 'consistency' | 'motivation';
    coachDecisionHeadline?: string;
    coachDecisionSummary?: string;
    coachDecisionActionItems?: string[];
    coachDecisionInfluences?: Array<{
      code:
        | 'LOW_READINESS'
        | 'HIGH_FATIGUE'
        | 'LOW_NUTRITION_ADHERENCE'
        | 'HIGH_NUTRITION_ADHERENCE'
        | 'REST_DAY_RECOMMENDED'
        | 'RECOVERY_WORKOUT_RECOMMENDED'
        | 'INCREASE_INTENSITY_RECOMMENDED'
        | 'DECREASE_INTENSITY_RECOMMENDED'
        | 'LOW_TRAINING_ADHERENCE'
        | 'LONG_STREAK'
        | 'NO_RECENT_ACTIVITY'
        | 'GOOD_CONSISTENCY';
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      source:
        | 'recovery'
        | 'nutrition'
        | 'training'
        | 'progress'
        | 'memory';
      weight?: number;
      value?: number;
    }>;
  };
}

export interface CoachFeedbackRepository {
  create(input: CreateCoachFeedbackRepositoryInput): Promise<CoachFeedback>;
  findById(feedbackId: string): Promise<CoachFeedback | null>;
  findByUserProfileId(input: {
    userProfileId: string;
    limit: number;
  }): Promise<CoachFeedback[]>;
}

export const COACH_FEEDBACK_REPOSITORY = Symbol('COACH_FEEDBACK_REPOSITORY');
