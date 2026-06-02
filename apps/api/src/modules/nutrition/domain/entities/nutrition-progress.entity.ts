export type MacroProgress = {
  target: number;
  actual: number;
  remaining: number;
  percent: number;
};

export type NutritionProgressProps = {
  calories: MacroProgress;
  protein: MacroProgress;
  carbs: MacroProgress;
  fats: MacroProgress;
  mealsLogged: number;
  totalMeals: number;
  adherenceScore: number;
};

export class NutritionProgress {
  readonly calories: MacroProgress;
  readonly protein: MacroProgress;
  readonly carbs: MacroProgress;
  readonly fats: MacroProgress;
  readonly mealsLogged: number;
  readonly totalMeals: number;
  readonly adherenceScore: number;

  constructor(props: NutritionProgressProps) {
    this.calories = props.calories;
    this.protein = props.protein;
    this.carbs = props.carbs;
    this.fats = props.fats;
    this.mealsLogged = props.mealsLogged;
    this.totalMeals = props.totalMeals;
    this.adherenceScore = props.adherenceScore;
  }
}
