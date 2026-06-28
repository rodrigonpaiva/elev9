import { MealLogStatus, MealType } from './meal.entity';
import { MacroTargetsProps } from '../value-objects/macro-targets.value-object';

export type NutritionLogProps = {
  id: string;
  userProfileId: string;
  nutritionPlanId: string;
  mealId: string;
  date: string;
  mealType: MealType;
  status: MealLogStatus;
  actualMacros?: MacroTargetsProps;
  createdAt: Date;
  updatedAt: Date;
};

export class NutritionLog {
  readonly id: string;
  readonly userProfileId: string;
  readonly nutritionPlanId: string;
  readonly mealId: string;
  readonly date: string;
  readonly mealType: MealType;
  readonly status: MealLogStatus;
  readonly actualMacros?: MacroTargetsProps;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: NutritionLogProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.nutritionPlanId = props.nutritionPlanId;
    this.mealId = props.mealId;
    this.date = props.date;
    this.mealType = props.mealType;
    this.status = props.status;
    this.actualMacros = props.actualMacros;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
