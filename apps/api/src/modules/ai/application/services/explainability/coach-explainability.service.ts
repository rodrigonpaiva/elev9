import { Injectable } from '@nestjs/common';

import { CoachExplainabilityPolicy } from './coach-explainability.policy';
import type {
  CoachExplainabilityEngineInput,
  CoachExplanation,
  CoachExplainabilityMetadata,
} from './coach-explainability.types';

@Injectable()
export class CoachExplainabilityService {
  constructor(
    private readonly policy: CoachExplainabilityPolicy = new CoachExplainabilityPolicy(),
  ) {}

  build(input: CoachExplainabilityEngineInput): CoachExplanation {
    const explanation = this.policy.resolveExplanation(input);

    return Object.freeze({
      ...explanation,
      participatingExperts: Object.freeze([
        ...explanation.participatingExperts,
      ]),
      supportingExperts: Object.freeze([...explanation.supportingExperts]),
      evidence: Object.freeze([...explanation.evidence]),
      decisionReasons: Object.freeze([...explanation.decisionReasons]),
      recommendationReasons: Object.freeze([
        ...explanation.recommendationReasons,
      ]),
      riskExplanations: Object.freeze([...explanation.riskExplanations]),
      confidenceExplanation: Object.freeze({
        ...explanation.confidenceExplanation,
        policyRestrictions: Object.freeze([
          ...explanation.confidenceExplanation.policyRestrictions,
        ]),
        metadata: Object.freeze({
          ...explanation.confidenceExplanation.metadata,
        }),
      }),
      conflictExplanations: Object.freeze([
        ...explanation.conflictExplanations,
      ]),
      missingEvidence: Object.freeze([...explanation.missingEvidence]),
      metadata: Object.freeze({
        ...explanation.metadata,
      }) as CoachExplainabilityMetadata,
    });
  }
}
