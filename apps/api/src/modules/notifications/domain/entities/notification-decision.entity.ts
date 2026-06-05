import type {
  NotificationFatigueLevel,
  NotificationSourceContext,
  NotificationSuppressionReason,
} from '../notifications.types';
import { NotificationChannelValueObject } from '../value-objects/notification-channel.value-object';
import {
  NotificationInfluence,
  type NotificationInfluencePropsInput,
} from '../value-objects/notification-influence.value-object';
import { NotificationPriorityValueObject } from '../value-objects/notification-priority.value-object';
import { NotificationStatusValueObject } from '../value-objects/notification-status.value-object';
import { NotificationTypeValueObject } from '../value-objects/notification-type.value-object';

export type NotificationDecisionProps = {
  id?: string;
  userProfileId: string;
  date: string;
  type: NotificationTypeValueObject['value'];
  priority: NotificationPriorityValueObject['value'];
  channel: NotificationChannelValueObject['value'];
  status: NotificationStatusValueObject['value'];
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: string;
  influences: NotificationInfluence[];
  sourceContext: NotificationSourceContext;
  suppressed?: boolean;
  suppressionReasons?: NotificationSuppressionReason[];
  fatigueLevel?: NotificationFatigueLevel;
  formulaVersion: string;
  generatedBy: 'deterministic';
  createdAt?: Date;
  updatedAt?: Date;
};

export type NotificationDecisionJSON = Omit<
  NotificationDecisionProps,
  'type' | 'priority' | 'channel' | 'status' | 'influences' | 'createdAt' | 'updatedAt'
> & {
  type: NotificationTypeValueObject['value'];
  priority: NotificationPriorityValueObject['value'];
  channel: NotificationChannelValueObject['value'];
  status: NotificationStatusValueObject['value'];
  influences: NotificationInfluencePropsInput[];
  createdAt?: string;
  updatedAt?: string;
  suppressed?: boolean;
  suppressionReasons?: NotificationSuppressionReason[];
  fatigueLevel?: NotificationFatigueLevel;
};

export class NotificationDecision {
  readonly id?: string;
  readonly userProfileId: string;
  readonly date: string;
  readonly type: NotificationTypeValueObject;
  readonly priority: NotificationPriorityValueObject;
  readonly channel: NotificationChannelValueObject;
  readonly status: NotificationStatusValueObject;
  readonly title: string;
  readonly message: string;
  readonly actionLabel?: string;
  readonly actionTarget?: string;
  readonly influences: NotificationInfluence[];
  readonly sourceContext: NotificationSourceContext;
  readonly suppressed?: boolean;
  readonly suppressionReasons?: NotificationSuppressionReason[];
  readonly fatigueLevel?: NotificationFatigueLevel;
  readonly formulaVersion: string;
  readonly generatedBy: 'deterministic';
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(props: NotificationDecisionProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.date = props.date;
    this.type = new NotificationTypeValueObject(props.type);
    this.priority = new NotificationPriorityValueObject(props.priority);
    this.channel = new NotificationChannelValueObject(props.channel);
    this.status = new NotificationStatusValueObject(props.status);
    this.title = props.title;
    this.message = props.message;
    this.actionLabel = props.actionLabel;
    this.actionTarget = props.actionTarget;
    this.influences = props.influences;
    this.sourceContext = props.sourceContext;
    this.suppressed = props.suppressed ?? false;
    this.suppressionReasons = props.suppressionReasons ?? [];
    this.fatigueLevel =
      props.fatigueLevel ?? props.sourceContext.fatigueLevel ?? 'low';
    this.formulaVersion = props.formulaVersion;
    this.generatedBy = props.generatedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON(): NotificationDecisionJSON {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      date: this.date,
      type: this.type.value,
      priority: this.priority.value,
      channel: this.channel.value,
      status: this.status.value,
      title: this.title,
      message: this.message,
      actionLabel: this.actionLabel,
      actionTarget: this.actionTarget,
      influences: this.influences.map((influence) => influence.toJSON()),
      sourceContext: this.sourceContext,
      suppressed: this.suppressed,
      suppressionReasons: this.suppressionReasons,
      fatigueLevel: this.fatigueLevel,
      formulaVersion: this.formulaVersion,
      generatedBy: this.generatedBy,
      createdAt: this.createdAt?.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
    };
  }
}
