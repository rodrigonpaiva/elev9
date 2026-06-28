export type NutritionInfluence =
  | 'LOW_CALORIE_ADHERENCE'
  | 'PROTEIN_TARGET_MISSED'
  | 'SKIPPED_MEALS'
  | 'PARTIAL_MEALS'
  | 'MUSCLE_GAIN_SURPLUS_FOCUS'
  | 'FAT_LOSS_DEFICIT_FOCUS'
  | 'MAINTENANCE_CONSISTENCY_FOCUS'
  | 'NO_LOGS_YET';

export type NutritionContextSnapshot = {
  goal?: 'fat_loss' | 'maintenance' | 'muscle_gain';
  adherenceScore?: number;
  todayNutrition?: {
    mealsLogged: number;
    totalMeals: number;
    caloriesPercent: number;
    proteinPercent: number;
  };
  trainingDay?: {
    hasWorkoutToday: boolean;
    intensity?: 'low' | 'moderate' | 'high';
  };
  recovery?: {
    fatigueLevel?: 'LOW' | 'MODERATE' | 'HIGH';
    latestCheckIn?: {
      energyLevel: number;
      sleepQuality: number;
      muscleSoreness: number;
      motivationLevel: number;
    };
  };
};

export type NutritionRecommendationProps = {
  id?: string;
  userProfileId: string;
  message: string;
  recommendations: string[];
  influences: NutritionInfluence[];
  generatorVersion: string;
  contextSnapshot: NutritionContextSnapshot;
  createdAt: Date;
};

export class NutritionRecommendation {
  readonly id?: string;
  readonly userProfileId: string;
  readonly message: string;
  readonly recommendations: string[];
  readonly influences: NutritionInfluence[];
  readonly generatorVersion: string;
  readonly contextSnapshot: NutritionContextSnapshot;
  readonly createdAt: Date;

  constructor(props: NutritionRecommendationProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.message = props.message;
    this.recommendations = [...props.recommendations];
    this.influences = [...props.influences];
    this.generatorVersion = props.generatorVersion;
    this.contextSnapshot = props.contextSnapshot;
    this.createdAt = props.createdAt;
  }
}
