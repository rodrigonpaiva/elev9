import type {
  NotificationInfluenceImpact,
  NotificationInfluenceProps,
  NotificationInfluenceSource,
  NotificationInfluenceCode,
} from '../notifications.types';

export type NotificationInfluencePropsInput = {
  code: NotificationInfluenceCode;
  label: string;
  impact: NotificationInfluenceImpact;
  source: NotificationInfluenceSource;
  weight?: number;
  value?: number;
};

export class NotificationInfluence {
  readonly code: NotificationInfluenceCode;
  readonly label: string;
  readonly impact: NotificationInfluenceImpact;
  readonly source: NotificationInfluenceSource;
  readonly weight?: number;
  readonly value?: number;

  constructor(props: NotificationInfluencePropsInput) {
    this.code = props.code;
    this.label = props.label;
    this.impact = props.impact;
    this.source = props.source;
    this.weight = props.weight;
    this.value = props.value;
  }

  toJSON(): NotificationInfluenceProps {
    return {
      code: this.code,
      label: this.label,
      impact: this.impact,
      source: this.source,
      weight: this.weight,
      value: this.value,
    };
  }
}
