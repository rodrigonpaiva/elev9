import { CoachDecision } from '../../../domain/entities/coach-decision.entity';
import {
  CoachDecisionInfluenceProps,
} from '../../../domain/value-objects/coach-decision-influence.value-object';
import {
  CoachDecisionPriority,
} from '../../../domain/value-objects/coach-decision-priority.value-object';

export type CoachDecisionReplayDifference = {
  field: 'priority' | 'headline' | 'summary' | 'actionItems' | 'influences' | 'formulaVersion';
  persisted: unknown;
  recalculated: unknown;
};

export type CoachDecisionReplayComparison = {
  matches: boolean;
  differences: CoachDecisionReplayDifference[];
};

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
