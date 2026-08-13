export type CoachFeedbackProps = {
  id: string;
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
    coachDecisionId?: string;
    coachDecisionPriority?:
      | 'recovery'
      | 'nutrition'
      | 'training'
      | 'consistency'
      | 'motivation';
    coachDecisionHeadline?: string;
    coachDecisionSummary?: string;
    coachDecisionActionItems?: string[];
    coachDecisionInfluences?: Array<{
      code: string;
      label: string;
      impact: 'positive' | 'negative' | 'neutral';
      source:
        | 'recovery'
        | 'nutrition'
        | 'training'
        | 'progress'
        | 'memory'
        | 'notification'
        | 'habit'
        | 'personalization';
      weight?: number;
      value?: number;
    }>;
    personalization?: {
      preferredCoachingStyle?:
        | 'motivational'
        | 'direct'
        | 'educational'
        | 'balanced';
      engagementProfile?: 'low' | 'medium' | 'high';
      notificationResponsiveness?: 'low' | 'medium' | 'high';
      goalResponsiveness?: 'low' | 'medium' | 'high';
      recoveryResponsiveness?: 'low' | 'medium' | 'high';
      habitResponsiveness?: 'low' | 'medium' | 'high';
      riskOfDisengagement?: 'low' | 'medium' | 'high';
      topBehavioralPatterns?: string[];
      trend?: 'improving' | 'stable' | 'declining';
      formulaVersion?: string;
      generatedAt?: string;
    };
  };
  createdAt: Date;
};

export class CoachFeedback {
  readonly id: string;
  readonly userProfileId: string;
  readonly message: string;
  readonly insights: string[];
  readonly recommendations: string[];
  readonly influences: string[];
  readonly generatorVersion?: string;
  readonly contextSnapshot?: CoachFeedbackProps['contextSnapshot'];
  readonly createdAt: Date;

  constructor(props: CoachFeedbackProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.message = props.message;
    this.insights = props.insights;
    this.recommendations = props.recommendations;
    this.influences = props.influences ?? [];
    this.generatorVersion = props.generatorVersion;
    this.contextSnapshot = props.contextSnapshot;
    this.createdAt = props.createdAt;
  }
}
