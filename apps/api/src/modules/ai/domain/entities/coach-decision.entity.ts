import type { CoachDecisionSourceContext } from '../../../../shared/source-context';
import {
  CoachDecisionInfluence,
  type CoachDecisionInfluenceProps,
} from '../value-objects/coach-decision-influence.value-object';
import {
  CoachDecisionPriority,
  CoachDecisionPriorityProps,
} from '../value-objects/coach-decision-priority.value-object';

export type CoachDecisionProps = {
  id: string;
  userProfileId: string;
  date: string;
  recoverySnapshotId?: string;
  nutritionRecommendationId?: string;
  adaptiveTrainingRecommendationId?: string;
  priority: CoachDecisionPriority;
  headline: string;
  summary: string;
  actionItems: string[];
  influences: CoachDecisionInfluence[];
  sourceContext: CoachDecisionSourceContext;
  formulaVersion: string;
  generatedBy: 'deterministic' | 'llm_assisted';
  llmMetadata?: {
    provider?: string;
    model?: string;
    used: boolean;
    failed?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type CoachDecisionJSON = Omit<
  CoachDecisionProps,
  'priority' | 'influences' | 'createdAt' | 'updatedAt'
  > & {
    priority: CoachDecisionPriorityProps;
    influences: CoachDecisionInfluenceProps[];
    createdAt: string;
    updatedAt: string;
    llmMetadata?: {
      provider?: string;
      model?: string;
      used: boolean;
      failed?: boolean;
    };
  };

export class CoachDecision {
  readonly id: string;
  readonly userProfileId: string;
  readonly date: string;
  readonly recoverySnapshotId?: string;
  readonly nutritionRecommendationId?: string;
  readonly adaptiveTrainingRecommendationId?: string;
  readonly priority: CoachDecisionPriority;
  readonly headline: string;
  readonly summary: string;
  readonly actionItems: string[];
  readonly influences: CoachDecisionInfluence[];
  readonly sourceContext: CoachDecisionSourceContext;
  readonly formulaVersion: string;
  readonly generatedBy: 'deterministic' | 'llm_assisted';
  readonly llmMetadata?: {
    provider?: string;
    model?: string;
    used: boolean;
    failed?: boolean;
  };
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: CoachDecisionProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.date = props.date;
    this.recoverySnapshotId = props.recoverySnapshotId;
    this.nutritionRecommendationId = props.nutritionRecommendationId;
    this.adaptiveTrainingRecommendationId =
      props.adaptiveTrainingRecommendationId;
    this.priority = props.priority;
    this.headline = props.headline;
    this.summary = props.summary;
    this.actionItems = props.actionItems;
    this.influences = props.influences;
    this.sourceContext = props.sourceContext;
    this.formulaVersion = props.formulaVersion;
    this.generatedBy = props.generatedBy;
    this.llmMetadata = props.llmMetadata;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON(): CoachDecisionJSON {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      date: this.date,
      recoverySnapshotId: this.recoverySnapshotId,
      nutritionRecommendationId: this.nutritionRecommendationId,
      adaptiveTrainingRecommendationId: this.adaptiveTrainingRecommendationId,
      priority: { value: this.priority },
      headline: this.headline,
      summary: this.summary,
      actionItems: this.actionItems,
      influences: this.influences.map((influence) => influence.toJSON()),
      sourceContext: this.sourceContext,
      formulaVersion: this.formulaVersion,
      generatedBy: this.generatedBy,
      llmMetadata: this.llmMetadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
