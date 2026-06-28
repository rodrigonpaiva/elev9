import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import { CoachDecisionInfluenceProps } from '../../../domain/value-objects/coach-decision-influence.value-object';
import { CoachDecisionPriority } from '../../../domain/value-objects/coach-decision-priority.value-object';
import {
  ReplayComparison,
  ReplayDifference,
  ReplayResult,
} from '../../../../../shared/replay';

export type CoachDecisionReplayField =
  | 'priority'
  | 'headline'
  | 'summary'
  | 'actionItems'
  | 'influences'
  | 'formulaVersion';

export type CoachDecisionReplayDifference =
  ReplayDifference<CoachDecisionReplayField>;

export type CoachDecisionReplayComparison =
  ReplayComparison<CoachDecisionReplayField>;

export type CoachDecisionRecalculatedResult = {
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceProps[];
  formulaVersion: string;
};

export type ReplayCoachDecisionOutput = {
  persisted: CoachDecision;
  recalculated: CoachDecisionRecalculatedResult;
  comparison: CoachDecisionReplayComparison;
  replayedAt: string;
};

export type CoachDecisionReplayResult = ReplayResult<
  CoachDecision,
  CoachDecisionRecalculatedResult,
  CoachDecisionReplayField
>;
