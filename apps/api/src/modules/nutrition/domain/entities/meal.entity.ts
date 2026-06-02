import { FoodItem, FoodItemProps } from './food-item.entity';
import { MacroTargetsProps } from '../value-objects/macro-targets.value-object';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealStatus = 'planned' | 'replaced';
export type MealLogStatus = 'consumed' | 'partial' | 'skipped';

export type MealOptionProps = {
  id: string;
  title: string;
  foodItems: FoodItemProps[];
  estimatedMacros: MacroTargetsProps;
  reason: string;
};

export class MealOption {
  readonly id: string;
  readonly title: string;
  readonly foodItems: FoodItem[];
  readonly estimatedMacros: MacroTargetsProps;
  readonly reason: string;

  constructor(props: MealOptionProps) {
    this.id = props.id;
    this.title = props.title;
    this.foodItems = props.foodItems.map((item) => new FoodItem(item));
    this.estimatedMacros = props.estimatedMacros;
    this.reason = props.reason;
  }
}

export type MealProps = {
  id: string;
  type: MealType;
  title: string;
  description: string;
  foodItems: FoodItemProps[];
  estimatedMacros: MacroTargetsProps;
  alternatives: MealOptionProps[];
  status: MealStatus;
};

export class Meal {
  readonly id: string;
  readonly type: MealType;
  readonly title: string;
  readonly description: string;
  readonly foodItems: FoodItem[];
  readonly estimatedMacros: MacroTargetsProps;
  readonly alternatives: MealOption[];
  readonly status: MealStatus;

  constructor(props: MealProps) {
    this.id = props.id;
    this.type = props.type;
    this.title = props.title;
    this.description = props.description;
    this.foodItems = props.foodItems.map((item) => new FoodItem(item));
    this.estimatedMacros = props.estimatedMacros;
    this.alternatives = props.alternatives.map(
      (option) => new MealOption(option),
    );
    this.status = props.status;
  }
}
