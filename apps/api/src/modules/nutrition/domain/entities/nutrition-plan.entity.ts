import { Meal, MealProps } from './meal.entity';
import { MacroTargetsProps } from '../value-objects/macro-targets.value-object';

export type NutritionDayProps = {
  date: string;
  dayIndex: number;
  meals: MealProps[];
  dailyMacroTargets: MacroTargetsProps;
};

export class NutritionDay {
  readonly date: string;
  readonly dayIndex: number;
  readonly meals: Meal[];
  readonly dailyMacroTargets: MacroTargetsProps;

  constructor(props: NutritionDayProps) {
    this.date = props.date;
    this.dayIndex = props.dayIndex;
    this.meals = props.meals.map((meal) => new Meal(meal));
    this.dailyMacroTargets = props.dailyMacroTargets;
  }
}

export type NutritionPlanProps = {
  id: string;
  userProfileId: string;
  nutritionProfileId: string;
  fitnessProfileId: string;
  status: 'active' | 'archived' | 'replaced';
  weekStartDate: string;
  weekEndDate: string;
  macroTargets: MacroTargetsProps;
  days: NutritionDayProps[];
  generatedBy: 'deterministic';
  sourceContext?: {
    formulaVersion?: string;
    activityMultiplier?: number;
    goalAdjustment?: number;
  };
  createdAt: Date;
  updatedAt?: Date;
  replacedAt?: Date;
};

export class NutritionPlan {
  readonly id: string;
  readonly userProfileId: string;
  readonly nutritionProfileId: string;
  readonly fitnessProfileId: string;
  readonly status: 'active' | 'archived' | 'replaced';
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly macroTargets: MacroTargetsProps;
  readonly days: NutritionDay[];
  readonly generatedBy: 'deterministic';
  readonly sourceContext?: {
    formulaVersion?: string;
    activityMultiplier?: number;
    goalAdjustment?: number;
  };
  readonly createdAt: Date;
  readonly updatedAt?: Date;
  readonly replacedAt?: Date;

  constructor(props: NutritionPlanProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.nutritionProfileId = props.nutritionProfileId;
    this.fitnessProfileId = props.fitnessProfileId;
    this.status = props.status;
    this.weekStartDate = props.weekStartDate;
    this.weekEndDate = props.weekEndDate;
    this.macroTargets = props.macroTargets;
    this.days = props.days.map((day) => new NutritionDay(day));
    this.generatedBy = props.generatedBy;
    this.sourceContext = props.sourceContext;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.replacedAt = props.replacedAt;
  }
}
