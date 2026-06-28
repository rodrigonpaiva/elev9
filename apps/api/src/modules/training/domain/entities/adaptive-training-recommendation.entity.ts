import type {
  AdaptiveRecommendedIntensity,
  AdaptiveRecommendationType,
  AdaptiveVolumeAction,
} from '../value-objects/adaptive-recommendation-type.value-object';
import {
  AdaptiveTrainingInfluence,
  type AdaptiveTrainingInfluenceProps,
} from '../value-objects/adaptive-training-influence.value-object';
import type { AdaptiveTrainingSourceContext } from '../../../../shared/source-context';

export type AdaptiveTrainingRecommendationProps = {
  id: string;
  userProfileId: string;
  trainingPlanId?: string;
  date: string;
  recommendationType: AdaptiveRecommendationType;
  recommendedIntensity: AdaptiveRecommendedIntensity;
  volumeAction: AdaptiveVolumeAction;
  reasoning: string;
  influences: AdaptiveTrainingInfluence[];
  sourceContext: AdaptiveTrainingSourceContext;
  formulaVersion: string;
  generatedBy: 'deterministic';
  createdAt: Date;
  updatedAt: Date;
};

export type AdaptiveTrainingRecommendationJSON = Omit<
  AdaptiveTrainingRecommendationProps,
  'influences'
> & {
  influences: AdaptiveTrainingInfluenceProps[];
};

export class AdaptiveTrainingRecommendation {
  readonly id: string;
  readonly userProfileId: string;
  readonly trainingPlanId?: string;
  readonly date: string;
  readonly recommendationType: AdaptiveRecommendationType;
  readonly recommendedIntensity: AdaptiveRecommendedIntensity;
  readonly volumeAction: AdaptiveVolumeAction;
  readonly reasoning: string;
  readonly influences: AdaptiveTrainingInfluence[];
  readonly sourceContext: AdaptiveTrainingSourceContext;
  readonly formulaVersion: string;
  readonly generatedBy: 'deterministic';
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AdaptiveTrainingRecommendationProps) {
    this.id = props.id;
    this.userProfileId = props.userProfileId;
    this.trainingPlanId = props.trainingPlanId;
    this.date = props.date;
    this.recommendationType = props.recommendationType;
    this.recommendedIntensity = props.recommendedIntensity;
    this.volumeAction = props.volumeAction;
    this.reasoning = props.reasoning;
    this.influences = props.influences;
    this.sourceContext = props.sourceContext;
    this.formulaVersion = props.formulaVersion;
    this.generatedBy = props.generatedBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  toJSON(): AdaptiveTrainingRecommendationJSON {
    return {
      id: this.id,
      userProfileId: this.userProfileId,
      trainingPlanId: this.trainingPlanId,
      date: this.date,
      recommendationType: this.recommendationType,
      recommendedIntensity: this.recommendedIntensity,
      volumeAction: this.volumeAction,
      reasoning: this.reasoning,
      influences: this.influences.map((influence) => influence.toJSON()),
      sourceContext: this.sourceContext,
      formulaVersion: this.formulaVersion,
      generatedBy: this.generatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
