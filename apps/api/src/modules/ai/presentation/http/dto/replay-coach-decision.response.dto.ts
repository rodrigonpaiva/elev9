import { CoachDecisionReplayResponse } from './coach-decision-response.type';

export class ReplayCoachDecisionResponseDto implements CoachDecisionReplayResponse {
  persisted!: CoachDecisionReplayResponse['persisted'];

  recalculated!: CoachDecisionReplayResponse['recalculated'];

  comparison!: CoachDecisionReplayResponse['comparison'];

  replayedAt!: string;
}
