import { MealLogStatus } from '../../../domain/entities/meal.entity';
import { MacroTargetsProps } from '../../../domain/value-objects/macro-targets.value-object';

export type LogMealInput = {
  authUserId: string;
  mealId: string;
  date?: string;
  status: MealLogStatus;
  actualMacros?: MacroTargetsProps;
};
