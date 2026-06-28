import { CoachDecision } from '../../../domain/entities/coach-decision.entity';

export type GetCoachDecisionHistoryOutput = {
  coachDecisions: CoachDecision[];
};
