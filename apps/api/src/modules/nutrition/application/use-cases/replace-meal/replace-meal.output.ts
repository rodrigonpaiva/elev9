import { Meal } from '../../../domain/entities/meal.entity';

export type ReplaceMealOutput = {
  meal: Meal;
  replacement: {
    previousMeal: Meal;
    reason?: string;
    replacedAt: string;
  };
};
