import type { BehavioralPatternContract } from '../personalization.contract';
import { BehavioralPatternTypeValueObject } from '../value-objects/behavioral-pattern-type.value-object';
import { ResponsivenessLevelValueObject } from '../value-objects/responsiveness-level.value-object';

export type BehavioralPatternProps = {
  id?: string;
  userProfileId: string;
  type: BehavioralPatternTypeValueObject;
  confidence: ResponsivenessLevelValueObject;
  evidenceCount: number;
  lastObservedAt: Date;
  formulaVersion: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export class BehavioralPattern {
  readonly id?: string;
  readonly userProfileId: string;
  readonly type: BehavioralPatternTypeValueObject;
  readonly confidence: ResponsivenessLevelValueObject;
  readonly evidenceCount: number;
  readonly lastObservedAt: Date;
  readonly formulaVersion: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: BehavioralPatternProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.type = props.type;
    this.confidence = props.confidence;
    this.evidenceCount = props.evidenceCount;
    this.lastObservedAt = props.lastObservedAt;
    this.formulaVersion = props.formulaVersion;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON(): BehavioralPatternContract {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      type: this.type.value,
      confidence: this.confidence.value,
      evidenceCount: this.evidenceCount,
      lastObservedAt: this.lastObservedAt.toISOString(),
      formulaVersion: this.formulaVersion,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
    };
  }
}
