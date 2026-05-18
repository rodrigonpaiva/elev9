export type NutritionGoal = 'fat_loss' | 'maintenance' | 'muscle_gain';

export type NutritionProfileProps = {
  id: string;
  userProfileId: string;
  goal: NutritionGoal;
  mealsPerDay: number;
  dietaryRestrictions: string[];
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  status: 'active';
  createdAt: Date;
  updatedAt: Date;
};

export class NutritionProfile {
  readonly id: string;
  readonly userProfileId: string;
  readonly goal: NutritionGoal;
  readonly mealsPerDay: number;
  readonly dietaryRestrictions: string[];
  readonly allergies: string[];
  readonly dislikedFoods: string[];
  readonly preferredFoods: string[];
  readonly status: 'active';
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: NutritionProfileProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.goal = props.goal;
    this.mealsPerDay = props.mealsPerDay;
    this.dietaryRestrictions = props.dietaryRestrictions;
    this.allergies = props.allergies;
    this.dislikedFoods = props.dislikedFoods;
    this.preferredFoods = props.preferredFoods;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
