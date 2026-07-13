import type {
  CoachExpertContext,
  CoachExpertContribution,
  CoachExpertRequest,
  CoachExpertResult,
} from '../coach-expert.types';
import type { UserHealthContext } from '../../context-builder/build-user-health-context.service';
import type { WorkoutLog } from '../../../../../progress/domain/entities/workout-log.entity';

export type WorkoutTrainingStatus =
  | 'scheduled'
  | 'completed'
  | 'partially_completed'
  | 'skipped'
  | 'unavailable';

export type WorkoutReadinessLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type WorkoutPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type WorkoutGoalAlignment =
  | 'fat_loss'
  | 'muscle_gain'
  | 'strength'
  | 'endurance'
  | 'maintenance'
  | 'unknown';

export type WorkoutConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type WorkoutRecommendationCode =
  | 'MAINTAIN_TODAY'
  | 'REDUCE_VOLUME'
  | 'REDUCE_INTENSITY'
  | 'INCREASE_INTENSITY'
  | 'REST_FIRST'
  | 'PRIORITIZE_MOBILITY'
  | 'FOCUS_TECHNIQUE'
  | 'INCREASE_VOLUME'
  | 'AVOID_OVERHEAD_MOVEMENTS'
  | 'AVOID_LOWER_BACK_LOADING'
  | 'LIMIT_KNEE_DOMINANT_LOADING'
  | 'NO_WORKOUT_SCHEDULED';

export type WorkoutRecommendation = {
  code: WorkoutRecommendationCode;
  summary: string;
  reason: string;
  priority: WorkoutPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type WorkoutRiskAssessment = {
  level: WorkoutPriority;
  summary: string;
  factors: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
};

export type WorkoutAnalysis = {
  trainingStatus: WorkoutTrainingStatus;
  readinessLevel: WorkoutReadinessLevel;
  adaptiveRecommendation?: {
    recommendationType:
      | 'rest_day'
      | 'recovery_workout'
      | 'reschedule_workout'
      | 'decrease_volume'
      | 'decrease_intensity'
      | 'increase_volume'
      | 'increase_intensity'
      | 'maintain';
    recommendedIntensity: 'recovery' | 'light' | 'moderate' | 'hard';
    volumeAction: 'increase' | 'decrease' | 'maintain';
    reasoning: string;
  };
  goalAlignment: WorkoutGoalAlignment;
  priority: WorkoutPriority;
  confidence: WorkoutConfidence;
  riskAssessment: WorkoutRiskAssessment;
  recommendations: readonly WorkoutRecommendation[];
  activeInjuryCount: number;
  limitationCount: number;
  equipmentCount: number;
  recentWorkoutCount: number;
  completedWorkoutCount: number;
  workoutHistory: readonly {
    workoutDayIndex: number;
    completedExercises: number;
    plannedExercises: number;
    durationMinutes: number;
    date: string;
  }[];
  todayWorkout?: {
    dayIndex: number;
    title: string;
    focus: string;
    format: string;
    intensity: string;
    exerciseCount: number;
  } | null;
  signals: readonly string[];
};

export type WorkoutExpertContribution = {
  expertId: string;
  summary: string;
  analysis: WorkoutAnalysis;
  recommendations: readonly WorkoutRecommendation[];
  risks: readonly WorkoutRiskAssessment[];
  goalAlignment: WorkoutGoalAlignment;
  confidence: WorkoutConfidence;
  priority: WorkoutPriority;
  metadata: Readonly<Record<string, unknown>>;
};

export type WorkoutExpertAnalysis = {
  request: CoachExpertRequest;
  context: CoachExpertContext;
  healthContext: UserHealthContext;
  analysis: WorkoutAnalysis;
  contribution: WorkoutExpertContribution;
  result: CoachExpertResult;
};

export type WorkoutExpertContributionRecord = CoachExpertContribution & {
  metadata: Readonly<{
    workoutContribution: WorkoutExpertContribution;
  }>;
};

export type WorkoutWorkoutLogSnapshot = Pick<
  WorkoutLog,
  'workoutDayIndex' | 'durationMinutes' | 'date'
> & {
  completedExercises: number;
  plannedExercises: number;
};
