import type {
  ReplayComparison,
  ReplayDifference,
} from '../../../../../shared/replay';
import type { NotificationDecision } from '../../../domain/entities/notification-decision.entity';
import type { NotificationDecisionJSON } from '../../../domain/entities/notification-decision.entity';
import type { NotificationDecisionCalculatorOutput } from '../../services/notification-decision-calculator.service';

export type ReplayNotificationDecisionComparisonField =
  | 'type'
  | 'priority'
  | 'channel'
  | 'status'
  | 'title'
  | 'message'
  | 'actionLabel'
  | 'actionTarget'
  | 'influences'
  | 'formulaVersion'
  | 'generatedBy';

export type ReplayNotificationDecisionRecalculated = Omit<
  NotificationDecisionCalculatorOutput,
  'sourceContext' | 'influences'
> & {
  influences: NotificationDecisionJSON['influences'];
};

export type ReplayNotificationDecisionOutput = {
  persisted: NotificationDecision;
  recalculated: ReplayNotificationDecisionRecalculated;
  comparison: ReplayComparison<ReplayNotificationDecisionComparisonField>;
  replayedAt: string;
};

export type ReplayNotificationDecisionFieldDifference =
  ReplayDifference<ReplayNotificationDecisionComparisonField>;
