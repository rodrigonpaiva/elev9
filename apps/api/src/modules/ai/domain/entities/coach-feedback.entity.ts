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
