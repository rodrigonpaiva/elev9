import type { HabitRiskLevel } from '../habits.types';

export type HabitRiskLevelProps = {
  value: HabitRiskLevel;
};

export class HabitRiskLevelValueObject {
  readonly value: HabitRiskLevel;

  constructor(value: HabitRiskLevel) {
    this.value = value;
  }

  toJSON(): HabitRiskLevelProps {
    return {
      value: this.value,
    };
  }
}
