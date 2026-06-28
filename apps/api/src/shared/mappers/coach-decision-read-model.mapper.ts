import type { CoachDecisionInfluence } from '../../modules/ai/domain/value-objects/coach-decision-influence.value-object';
import type { CoachDecisionInfluenceProps } from '../../modules/ai/domain/value-objects/coach-decision-influence.value-object';
import type { CoachDecisionPriority } from '../../modules/ai/domain/value-objects/coach-decision-priority.value-object';

export type CoachDecisionReadModelPayload = {
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceProps[];
};

type CoachDecisionInfluenceSource =
  | CoachDecisionInfluence
  | CoachDecisionInfluenceProps
  | { toJSON: () => CoachDecisionInfluenceProps };

type CoachDecisionReadModelSource = {
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceSource[];
};

export type CoachDecisionContextSnapshotPayload = {
  coachDecisionId: string;
  coachDecisionPriority: CoachDecisionReadModelPayload['priority'];
  coachDecisionHeadline: string;
  coachDecisionSummary: string;
  coachDecisionActionItems: string[];
  coachDecisionInfluences: CoachDecisionReadModelPayload['influences'];
};

export type CoachDecisionContextSnapshotInput = {
  id: string;
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluenceSource[];
};

export class CoachDecisionReadModelMapper {
  static toDashboardPayload(
    coachDecision: CoachDecisionReadModelSource | null | undefined,
  ): CoachDecisionReadModelPayload | undefined {
    return this.toPayload(coachDecision);
  }

  static toPromptPayload(
    coachDecision: CoachDecisionReadModelSource | null | undefined,
  ): CoachDecisionReadModelPayload | undefined {
    return this.toPayload(coachDecision);
  }

  static toChatPayload(
    coachDecision: CoachDecisionReadModelSource | null | undefined,
  ): CoachDecisionReadModelPayload | undefined {
    return this.toPayload(coachDecision);
  }

  static toFeedbackPayload(
    coachDecision: CoachDecisionReadModelSource | null | undefined,
  ): CoachDecisionReadModelPayload | undefined {
    return this.toPayload(coachDecision);
  }

  static toFeedbackContextSnapshot(
    coachDecision: CoachDecisionContextSnapshotInput | null | undefined,
  ): CoachDecisionContextSnapshotPayload | undefined {
    const payload = this.toPayload(coachDecision);

    if (!payload || !coachDecision) {
      return undefined;
    }

    return {
      coachDecisionId: coachDecision.id,
      coachDecisionPriority: payload.priority,
      coachDecisionHeadline: payload.headline,
      coachDecisionSummary: payload.summary,
      coachDecisionActionItems: [...payload.actionItems],
      coachDecisionInfluences: payload.influences.map((influence) => ({
        ...influence,
      })),
    };
  }

  private static toPayload(
    coachDecision: CoachDecisionReadModelSource | null | undefined,
  ): CoachDecisionReadModelPayload | undefined {
    if (!coachDecision) {
      return undefined;
    }

    return {
      priority: coachDecision.priority,
      headline: coachDecision.headline,
      summary: coachDecision.summary,
      actionItems: [...coachDecision.actionItems],
      influences: coachDecision.influences.map((influence) =>
        this.toInfluencePayload(influence),
      ),
    };
  }

  private static toInfluencePayload(
    influence: CoachDecisionInfluenceSource,
  ): CoachDecisionInfluenceProps {
    return typeof influence === 'object' &&
      influence !== null &&
      'toJSON' in influence
      ? influence.toJSON()
      : influence;
  }
}
