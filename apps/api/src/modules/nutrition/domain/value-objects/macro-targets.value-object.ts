export type MacroTargetsProps = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
};

export class MacroTargets {
  readonly calories: number;
  readonly proteinGrams: number;
  readonly carbsGrams: number;
  readonly fatGrams: number;

  constructor(props: MacroTargetsProps) {
    this.calories = props.calories;
    this.proteinGrams = props.proteinGrams;
    this.carbsGrams = props.carbsGrams;
    this.fatGrams = props.fatGrams;
  }

  toJSON(): MacroTargetsProps {
    return {
      calories: this.calories,
      proteinGrams: this.proteinGrams,
      carbsGrams: this.carbsGrams,
      fatGrams: this.fatGrams,
    };
  }
}

export class MealMacros extends MacroTargets {}
