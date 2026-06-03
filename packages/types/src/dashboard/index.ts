import {
  FitnessProfileActivityLevel,
  FitnessProfileGoal,
} from '../fitness';
import {
  Goal,
  GoalForecast,
  GoalMilestone,
  GoalProgressSnapshot,
} from '../goals';
import { CoachDecisionInfluence, CoachDecisionPriority } from '../ai';
import {
  AdaptiveRecommendedIntensity,
  AdaptiveRecommendationType,
  AdaptiveTrainingInfluence,
  AdaptiveVolumeAction,
  TrainingPlanIntensity,
} from '../training';

export type DashboardRecoveryInfluence = {
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
};

export type DashboardAdaptiveTrainingRecommendation = {
  recommendationType: AdaptiveRecommendationType;
  recommendedIntensity: AdaptiveRecommendedIntensity;
  volumeAction: AdaptiveVolumeAction;
  reasoning: string;
  influences: AdaptiveTrainingInfluence[];
};

export type DashboardCoachDecision = {
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluence[];
};

export type DashboardHomeResponse = {
  dashboard: {
    user: {
      name: string;
    };
    fitnessProfile: {
      id: string;
      goal: FitnessProfileGoal;
      activityLevel: FitnessProfileActivityLevel;
    } | null;
    trainingPlan: {
      id: string;
      todayWorkout: {
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
      } | null;
    } | null;
    goal?: {
      current: Goal;
      progressSnapshot?: GoalProgressSnapshot;
      forecast?: GoalForecast;
      milestones?: GoalMilestone[];
    };
    progressSummary: {
      period: 'week';
      workoutsCompleted: number;
      totalDurationMinutes: number;
      averageDurationMinutes: number;
      lastWorkoutDate: string | null;
    };
    recovery: {
      fatigueLevel: 'LOW' | 'MODERATE' | 'HIGH';
      recommendedIntensity: 'low' | 'medium' | 'normal';
      recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
      readinessScore?: number;
      fatigueScore?: number;
      recoveryInfluences?: DashboardRecoveryInfluence[];
      latestCheckIn?: {
        energyLevel: number;
        sleepQuality: number;
        muscleSoreness: number;
        motivationLevel: number;
        createdAt: string;
      };
    };
    coachDecision?: DashboardCoachDecision;
    adaptiveTrainingRecommendation?: DashboardAdaptiveTrainingRecommendation;
    nutritionGuidance: {
      priority: 'recovery' | 'consistency' | 'performance';
      message: string;
      signals: string[];
    };
  };
};

export type DashboardHomeDebugResponse = {
  generatedAt: string;
  recovery: {
    fatigueLevel: string;
    recoveryTrend: 'improving' | 'stable' | 'needs_recovery';
    recoverySignals: string[];
    readinessScore?: number;
    fatigueScore?: number;
    recoveryInfluences?: DashboardRecoveryInfluence[];
  };
  coachDecision?: DashboardCoachDecision;
  adaptiveTrainingRecommendation?: DashboardAdaptiveTrainingRecommendation;
  nutrition: {
    priority: 'recovery' | 'consistency' | 'performance';
    signals: string[];
  };
};

export type TodayWorkout = NonNullable<
  NonNullable<
    DashboardHomeResponse['dashboard']['trainingPlan']
  >['todayWorkout']
>;
