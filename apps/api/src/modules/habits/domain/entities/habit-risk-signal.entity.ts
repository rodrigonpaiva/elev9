import type { HabitRiskSignalContract } from '../habits.contract';
import type { RiskSignalType } from '../habits.types';
import { HabitRiskLevelValueObject } from '../value-objects/habit-risk-level.value-object';

export type HabitRiskSignalProps = {
  userProfileId: string;
  type: RiskSignalType;
  level: HabitRiskLevelValueObject;
  title: string;
  description: string;
  generatedAt: Date;
  formulaVersion: string;
};

export class HabitRiskSignal {
  readonly userProfileId: string;
  readonly type: RiskSignalType;
  readonly level: HabitRiskLevelValueObject;
  readonly title: string;
  readonly description: string;
  readonly generatedAt: Date;
  readonly formulaVersion: string;

  constructor(props: HabitRiskSignalProps) {
    this.userProfileId = props.userProfileId;
    this.type = props.type;
    this.level = props.level;
    this.title = props.title;
    this.description = props.description;
    this.generatedAt = props.generatedAt;
    this.formulaVersion = props.formulaVersion;
  }

  toJSON(): HabitRiskSignalContract {
    return {
      userProfileId: this.userProfileId,
      type: this.type,
      level: this.level.value,
      title: this.title,
      description: this.description,
      generatedAt: this.generatedAt.toISOString(),
      formulaVersion: this.formulaVersion,
    };
  }
}
