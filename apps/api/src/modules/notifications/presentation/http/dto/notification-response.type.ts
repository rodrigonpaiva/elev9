import type { NotificationDecisionJSON } from '../../../domain/entities/notification-decision.entity';

export type NotificationDecisionResponse = NotificationDecisionJSON;

export type NotificationEngagementSummaryResponse = {
  engagementScore: number;
  fatigueLevel: 'low' | 'medium' | 'high';
  openedCount: number;
  clickedCount: number;
  dismissedCount: number;
  completedCount: number;
  recentEventsCount: number;
};

export type NotificationResponse = NotificationDecisionResponse;

export type NotificationReplayDifferenceResponse = {
  field:
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
  persisted: unknown;
  recalculated: unknown;
};

export type NotificationReplayComparisonResponse = {
  matches: boolean;
  differences: NotificationReplayDifferenceResponse[];
};

export type NotificationReplayRecalculatedResponse = {
  type: NotificationDecisionResponse['type'];
  priority: NotificationDecisionResponse['priority'];
  channel: NotificationDecisionResponse['channel'];
  status: NotificationDecisionResponse['status'];
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: string;
  influences: NotificationDecisionResponse['influences'];
  formulaVersion: string;
  generatedBy: 'deterministic';
};

export type NotificationReplayResponse = {
  persisted: NotificationDecisionResponse;
  recalculated: NotificationReplayRecalculatedResponse;
  comparison: NotificationReplayComparisonResponse;
  replayedAt: string;
};
